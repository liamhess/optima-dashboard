import { z } from "zod";
import { prisma } from "../db.js";
import { mergeDevice } from "../devices/merge.js";
import { publicProcedure, router } from "../trpc.js";

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
    list: publicProcedure.query(async () => {
      const devices = await prisma.device.findMany({
        include: {
          overlay: true,
        },
        orderBy: {
          customerName: "asc",
        },
      });

      return devices.map((device) => mergeDevice(device, device.overlay));
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
