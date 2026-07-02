import type { MergedDevice } from "./merge.js";
import { lifecycleValues } from "./filters.js";

export type DeviceKpis = {
  lifecycleCounts: Array<{
    lifecycle: string;
    count: number;
  }>;
  installationDueCount: number;
  totalCount: number;
};

function startOfLocalWeek(value: Date): Date {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);

  return start;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function isInstallationDue(installationDate: Date | null, now: Date): boolean {
  if (!installationDate) {
    return false;
  }

  const currentWeekStart = startOfLocalWeek(now);
  const weekAfterNextStart = addDays(currentWeekStart, 14);

  return installationDate >= currentWeekStart && installationDate < weekAfterNextStart;
}

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
