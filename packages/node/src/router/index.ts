import { z } from "zod";
import { prisma } from "../db.js";
import { mergeDevice, type MergedDevice } from "../devices/merge.js";
import { publicProcedure, router } from "../trpc.js";

const deviceListFiltersSchema = z
  .object({
    search: z.string().trim().optional(),
    lifecycle: z.string().trim().optional(),
    deviceType: z.string().trim().optional(),
  })
  .optional();

function matchesDeviceFilters(
  device: MergedDevice,
  filters: {
    search: string;
    lifecycle: string;
    deviceType: string;
  },
): boolean {
  if (filters.lifecycle && device.lifecycle !== filters.lifecycle) {
    return false;
  }

  if (filters.deviceType && device.deviceType !== filters.deviceType) {
    return false;
  }

  if (!filters.search) {
    return true;
  }

  const searchNeedle = filters.search.toLocaleLowerCase();
  const searchableValues = [
    device.customer.name,
    device.customer.state,
    device.serialNumber,
    device.macAddress,
  ];

  return searchableValues.some((value) => value?.toLocaleLowerCase().includes(searchNeedle));
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
      const filters = {
        search: input?.search ?? "",
        lifecycle: input?.lifecycle ?? "",
        deviceType: input?.deviceType ?? "",
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
        .filter((device) => matchesDeviceFilters(device, filters));
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
