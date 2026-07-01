import { prisma } from "../db.js";
import type { DeviceCustomer, DeviceInstallation, DeviceRecord } from "../devices/types.js";
import { OptimaApiClient } from "../optima/client.js";

type OptimaDevice = DeviceRecord<string | null>;

type DeviceUpsertData = Omit<DeviceRecord<Date | null>, "id" | "customer" | "installation"> & {
  customerName: DeviceCustomer["name"];
  customerEmail: DeviceCustomer["email"];
  customerState: DeviceCustomer["state"];
  installationType: DeviceInstallation<Date | null>["type"];
  installationDate: DeviceInstallation<Date | null>["date"];
  lastSyncedAt: Date;
};

const DEFAULT_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function toDeviceUpsertData(device: OptimaDevice, syncedAt: Date): DeviceUpsertData {
  return {
    deviceType: device.deviceType,
    lifecycle: device.lifecycle,
    serialNumber: device.serialNumber,
    macAddress: device.macAddress,
    trackingUrl: device.trackingUrl,
    notes: device.notes,
    orderedAt: toDate(device.orderedAt),
    shippedAt: toDate(device.shippedAt),
    installedAt: toDate(device.installedAt),
    activatedAt: toDate(device.activatedAt),
    lastSeenAt: toDate(device.lastSeenAt),
    customerName: device.customer.name,
    customerEmail: device.customer.email,
    customerState: device.customer.state,
    installationType: device.installation.type,
    installationDate: toDate(device.installation.date),
    lastSyncedAt: syncedAt,
  };
}

export class DeviceSyncService {
  private readonly client = new OptimaApiClient();
  private readonly intervalMs: number;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(intervalMs = DEFAULT_SYNC_INTERVAL_MS) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    void this.runSync("startup");

    this.intervalId = setInterval(() => {
      void this.runSync("interval");
    }, this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getState(): {
    isRunning: boolean;
    intervalMs: number;
  } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }

  private async runSync(trigger: "startup" | "interval"): Promise<void> {
    if (this.isRunning) {
      console.info(
        `[device-sync] Skipping ${trigger} sync because another sync is already running.`,
      );
      return;
    }

    this.isRunning = true;

    try {
      const upstreamDevices = await this.client.fetchDevices();
      const syncedAt = new Date();
      let syncedCount = 0;
      let failedCount = 0;

      for (const device of upstreamDevices) {
        try {
          const upsertData = toDeviceUpsertData(device, syncedAt);

          await prisma.device.upsert({
            where: { id: device.id },
            create: {
              id: device.id,
              ...upsertData,
            },
            update: upsertData,
          });

          syncedCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error(`[device-sync] Failed to sync device ${device.id}.`, error);
        }
      }

      console.info(
        `[device-sync] ${trigger} sync completed. synced=${syncedCount} failed=${failedCount} total=${upstreamDevices.length}`,
      );
    } catch (error) {
      console.error("[device-sync] Sync failed.", error);
    } finally {
      this.isRunning = false;
    }
  }
}
