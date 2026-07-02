import type { MergedDevice } from "./merge.js";
import { lifecycleValues } from "./filters.js";
import { isInstallationDue } from "./installation-due.js";

export type DeviceKpis = {
  lifecycleCounts: Array<{
    lifecycle: string;
    count: number;
  }>;
  installationDueCount: number;
  totalCount: number;
};

export function buildDeviceKpis(devices: MergedDevice[], now = new Date()): DeviceKpis {
  const lifecycleCountsMap = new Map<string, number>(
    lifecycleValues.map((lifecycle) => [lifecycle, 0]),
  );
  let installationDueCount = 0;

  for (const device of devices) {
    lifecycleCountsMap.set(device.lifecycle, (lifecycleCountsMap.get(device.lifecycle) ?? 0) + 1);

    if (isInstallationDue(device.installation.date, now)) {
      installationDueCount += 1;
    }
  }

  return {
    lifecycleCounts: lifecycleValues.map((lifecycle) => ({
      lifecycle,
      count: lifecycleCountsMap.get(lifecycle) ?? 0,
    })),
    installationDueCount,
    totalCount: devices.length,
  };
}
