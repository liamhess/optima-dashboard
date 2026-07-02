import { z } from "zod";
import { prisma } from "../db.js";
import { buildDeviceKpis } from "../devices/kpis.js";
import {
  matchesDeviceBaseFilters,
  matchesDeviceListFilters,
  type DeviceBaseFilters,
} from "../devices/filters.js";
import { mergeDevice } from "../devices/merge.js";
import {
  editableDeviceFields,
  type EditableDeviceField,
  type EditableDeviceValues,
  localTimestampFields,
  type LocalTimestampField,
  type LocalTimestampValues,
} from "../devices/types.js";
import { publicProcedure, router } from "../trpc.js";

const deviceBaseFiltersSchema = z.object({
  search: z.string().trim().optional(),
  deviceType: z.string().trim().optional(),
});

const deviceListFiltersSchema = deviceBaseFiltersSchema
  .extend({
    lifecycle: z.string().trim().optional(),
  })
  .optional();

const deviceBaseFiltersInputSchema = deviceBaseFiltersSchema.optional();
const advanceLifecycleInputSchema = z.object({
  id: z.string().min(1),
});
const updateLocalChangesInputSchema = z.object({
  id: z.string().min(1),
  lifecycle: z.string().trim().min(1),
  serialNumber: z.string(),
  macAddress: z.string(),
  notes: z.string(),
  shippedAt: z.string().datetime().nullable(),
  installedAt: z.string().datetime().nullable(),
  activatedAt: z.string().datetime().nullable(),
});

function toDeviceBaseFilters(
  input: { search?: string; deviceType?: string } | undefined,
): DeviceBaseFilters {
  return {
    search: input?.search ?? "",
    deviceType: input?.deviceType ?? "",
  };
}

function normalizeOptionalEditableValue(value: string): string | null {
  return value.trim() ? value : null;
}

function toEditableDeviceValues(
  input: z.infer<typeof updateLocalChangesInputSchema>,
): EditableDeviceValues {
  return {
    lifecycle: input.lifecycle,
    serialNumber: normalizeOptionalEditableValue(input.serialNumber),
    macAddress: normalizeOptionalEditableValue(input.macAddress),
    notes: normalizeOptionalEditableValue(input.notes),
  };
}

function toLocalTimestampValues(
  input: z.infer<typeof updateLocalChangesInputSchema>,
): LocalTimestampValues {
  return {
    shippedAt: input.shippedAt ? new Date(input.shippedAt) : null,
    installedAt: input.installedAt ? new Date(input.installedAt) : null,
    activatedAt: input.activatedAt ? new Date(input.activatedAt) : null,
  };
}

type LocalChangeBaseline = {
  id: string;
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  notes: string | null;
  shippedAt: Date | null;
  installedAt: Date | null;
  activatedAt: Date | null;
};

function toMergedEditableDeviceValues(device: {
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  notes: string | null;
}): EditableDeviceValues {
  return {
    lifecycle: device.lifecycle,
    serialNumber: device.serialNumber,
    macAddress: device.macAddress,
    notes: device.notes,
  };
}

function toMergedLocalTimestampValues(device: {
  shippedAt: Date | null;
  installedAt: Date | null;
  activatedAt: Date | null;
}): LocalTimestampValues {
  return {
    shippedAt: device.shippedAt,
    installedAt: device.installedAt,
    activatedAt: device.activatedAt,
  };
}

// TODO: Move this guided lifecycle definition into shared code once `packages/common` exists.
function getLifecycleAdvance(lifecycle: string): {
  nextLifecycle: string;
  timestampField: LocalTimestampField | null;
} | null {
  if (lifecycle === "Bestellt") {
    return {
      nextLifecycle: "Verschickt",
      timestampField: "shippedAt",
    };
  }

  if (lifecycle === "Verschickt") {
    return {
      nextLifecycle: "Verbaut",
      timestampField: "installedAt",
    };
  }

  if (lifecycle === "Verbaut") {
    return {
      nextLifecycle: "Aktiviert",
      timestampField: "activatedAt",
    };
  }

  if (lifecycle === "Aktiviert") {
    return {
      nextLifecycle: "Online",
      timestampField: null,
    };
  }

  return null;
}

function buildLocalChangePersistence(
  device: LocalChangeBaseline,
  values: EditableDeviceValues,
  timestamps: LocalTimestampValues,
): {
  hasAnyLocalChanges: boolean;
  persistedValues: PersistedLocalChanges;
} {
  const initialPersistedValues: PersistedLocalChanges = {
    lifecycle: null,
    serialNumber: null,
    macAddress: null,
    notes: null,
    baseLifecycle: null,
    baseSerialNumber: null,
    baseMacAddress: null,
    baseNotes: null,
    shippedAt: null,
    installedAt: null,
    activatedAt: null,
  };

  const persistedValues = editableDeviceFields.reduce<typeof initialPersistedValues>(
    (accumulator, { field, baseField }) => {
      const hasLocalChange = values[field] !== device[field];

      accumulator[field] = hasLocalChange ? values[field] : null;
      accumulator[baseField] = hasLocalChange ? device[field] : null;

      return accumulator;
    },
    initialPersistedValues,
  );

  for (const field of localTimestampFields) {
    persistedValues[field] =
      timestamps[field]?.getTime() === device[field]?.getTime() ? null : timestamps[field];
  }

  const hasAnyLocalChanges =
    editableDeviceFields.some(
      ({ field }) => persistedValues[field as EditableDeviceField] !== null,
    ) ||
    localTimestampFields.some((field) => persistedValues[field as LocalTimestampField] !== null);

  return {
    hasAnyLocalChanges,
    persistedValues,
  };
}

type PersistedLocalChanges = {
  lifecycle: string | null;
  serialNumber: string | null;
  macAddress: string | null;
  notes: string | null;
  shippedAt: Date | null;
  installedAt: Date | null;
  activatedAt: Date | null;
  baseLifecycle: string | null;
  baseSerialNumber: string | null;
  baseMacAddress: string | null;
  baseNotes: string | null;
};

async function persistLocalChanges(
  device: LocalChangeBaseline,
  values: EditableDeviceValues,
  timestamps: LocalTimestampValues,
) {
  const { hasAnyLocalChanges, persistedValues } = buildLocalChangePersistence(
    device,
    values,
    timestamps,
  );

  if (!hasAnyLocalChanges) {
    await prisma.deviceOverlay.deleteMany({
      where: {
        deviceId: device.id,
      },
    });

    return null;
  }

  return prisma.deviceOverlay.upsert({
    where: {
      deviceId: device.id,
    },
    create: {
      deviceId: device.id,
      ...persistedValues,
    },
    update: {
      ...persistedValues,
    },
  });
}

export const appRouter = router({
  health: publicProcedure.query(() => {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }),
  config: publicProcedure.query(() => {
    return {
      hasApiBaseUrl: Boolean(process.env.OPTIMA_API_BASE_URL),
      hasApiToken: Boolean(process.env.OPTIMA_API_TOKEN),
    };
  }),
  devices: router({
    list: publicProcedure.input(deviceListFiltersSchema).query(async ({ input }) => {
      const baseFilters = toDeviceBaseFilters(input);
      const filters = {
        ...baseFilters,
        lifecycle: input?.lifecycle ?? "",
      };

      const devices = await prisma.device.findMany({
        include: {
          overlay: true,
        },
        orderBy: {
          customerName: "asc",
        },
      });

      return devices
        .map((device) => mergeDevice(device, device.overlay))
        .filter((device) => matchesDeviceListFilters(device, filters));
    }),
    kpis: publicProcedure.input(deviceBaseFiltersInputSchema).query(async ({ input }) => {
      const filters = toDeviceBaseFilters(input);
      const devices = await prisma.device.findMany({
        include: {
          overlay: true,
        },
      });

      const filteredDevices = devices
        .map((device) => mergeDevice(device, device.overlay))
        .filter((device) => matchesDeviceBaseFilters(device, filters));

      return buildDeviceKpis(filteredDevices);
    }),
    deviceTypes: publicProcedure.query(async () => {
      const devices = await prisma.device.findMany({
        select: {
          deviceType: true,
        },
        distinct: ["deviceType"],
        orderBy: {
          deviceType: "asc",
        },
      });

      return devices.map((device) => device.deviceType);
    }),
    byId: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => {
      return prisma.device
        .findUniqueOrThrow({
          where: {
            id: input.id,
          },
          include: {
            overlay: true,
          },
        })
        .then((device) => mergeDevice(device, device.overlay));
    }),
    advanceLifecycle: publicProcedure
      .input(advanceLifecycleInputSchema)
      .mutation(async ({ input }) => {
        const device = await prisma.device.findUniqueOrThrow({
          where: {
            id: input.id,
          },
          include: {
            overlay: true,
          },
        });

        const mergedDevice = mergeDevice(device, device.overlay);
        const advance = getLifecycleAdvance(mergedDevice.lifecycle);

        if (!advance) {
          throw new Error(`Lifecycle ${mergedDevice.lifecycle} cannot be advanced.`);
        }

        const values = toMergedEditableDeviceValues(mergedDevice);
        const timestamps = toMergedLocalTimestampValues(mergedDevice);

        values.lifecycle = advance.nextLifecycle;

        if (advance.timestampField && !timestamps[advance.timestampField]) {
          timestamps[advance.timestampField] = new Date();
        }

        const localChanges = await persistLocalChanges(device, values, timestamps);

        return mergeDevice(device, localChanges);
      }),
    updateLocalChanges: publicProcedure
      .input(updateLocalChangesInputSchema)
      .mutation(async ({ input }) => {
        const device = await prisma.device.findUniqueOrThrow({
          where: {
            id: input.id,
          },
        });

        const values = toEditableDeviceValues(input);
        const timestamps = toLocalTimestampValues(input);
        const localChanges = await persistLocalChanges(device, values, timestamps);

        return mergeDevice(device, localChanges);
      }),
  }),
});

export type AppRouter = typeof appRouter;
