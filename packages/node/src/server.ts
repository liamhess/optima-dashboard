import cors from "cors";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { env } from "./config.js";
import { appRouter } from "./router/index.js";
import { DeviceSyncService } from "./sync/device-sync-service.js";

const app = express();
const deviceSyncService = new DeviceSyncService(env.SYNC_INTERVAL_MS);

app.use(cors());
app.use(express.json());

app.get("/healthz", (_request, response) => {
  response.json({
    ok: true,
    service: "optima-node",
    timestamp: new Date().toISOString(),
  });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  }),
);

app.listen(env.PORT, () => {
  deviceSyncService.start();
  console.log(`API server listening on http://localhost:${env.PORT}`);
});
