import { z } from "zod";
import { prisma } from "../db.js";
import { buildDeviceKpis } from "../devices/kpis.js";
import {
  matchesDeviceBaseFilters,
  matchesDeviceListFilters,
  type DeviceBaseFilters,
} from "../devices/filters.js";
import { mergeDevice } from "../devices/merge.js";
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

function toDeviceBaseFilters(input: { search?: string; deviceType?: string } | undefined): DeviceBaseFilters {
  return {
    search: input?.search ?? "",
    deviceType: input?.deviceType ?? "",
  };
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
  }),
});

export type AppRouter = typeof appRouter;
