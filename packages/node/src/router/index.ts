import { z } from "zod";
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
  device: router({
    byId: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => {
      return {
        id: input.id,
        message: "Device detail procedure scaffolded",
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
