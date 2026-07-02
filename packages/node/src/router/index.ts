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
const updateLocalChangesInputSchema = z.object({
  id: z.string().min(1),
  lifecycle: z.string().trim().min(1),
  serialNumber: z.string(),
  macAddress: z.string(),
  notes: z.string(),
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

function hasEffectiveLocalChanges(
  device: {
    lifecycle: string;
    serialNumber: string | null;
    macAddress: string | null;
    notes: string | null;
  },
  values: EditableDeviceValues,
): boolean {
  return (
    values.lifecycle !== device.lifecycle ||
    values.serialNumber !== device.serialNumber ||
    values.macAddress !== device.macAddress ||
    values.notes !== device.notes
  );
}

function buildPersistedLocalChanges(
  device: {
    lifecycle: string;
    serialNumber: string | null;
    macAddress: string | null;
    notes: string | null;
  },
  values: EditableDeviceValues,
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

  const hasAnyLocalChanges = editableDeviceFields.some(
    ({ field }) => persistedValues[field as EditableDeviceField] !== null,
  );

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
  baseLifecycle: string | null;
  baseSerialNumber: string | null;
  baseMacAddress: string | null;
  baseNotes: string | null;
};

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
    updateLocalChanges: publicProcedure
      .input(updateLocalChangesInputSchema)
      .mutation(async ({ input }) => {
        const device = await prisma.device.findUniqueOrThrow({
          where: {
            id: input.id,
          },
        });

        const values = toEditableDeviceValues(input);
        const { hasAnyLocalChanges, persistedValues } = buildPersistedLocalChanges(device, values);

        if (!hasAnyLocalChanges || !hasEffectiveLocalChanges(device, values)) {
          await prisma.deviceOverlay.deleteMany({
            where: {
              deviceId: device.id,
            },
          });

          return mergeDevice(device, null);
        }

        const localChanges = await prisma.deviceOverlay.upsert({
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

        return mergeDevice(device, localChanges);
      }),
  }),
});

export type AppRouter = typeof appRouter;
