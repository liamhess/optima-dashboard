import type { DeviceOnlineStatus } from "./types.js";

const ONLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function toOfflineLabel(lastSeenAt: Date, now: Date): string {
  const calendarDayDifference = Math.max(
    1,
    Math.floor((startOfDay(now) - startOfDay(lastSeenAt)) / MS_PER_DAY),
  );

  if (calendarDayDifference === 1) {
    return "Offline seit 1 Tag";
  }

  return `Offline seit ${calendarDayDifference} Tagen`;
}

export function getDeviceOnlineStatus(
  lastSeenAt: Date | null,
  now: Date = new Date(),
): DeviceOnlineStatus {
  if (!lastSeenAt) {
    return {
      key: "waiting",
      label: "Wartet auf Signal",
      tone: "neutral",
    };
  }

  if (now.getTime() - lastSeenAt.getTime() <= ONLINE_THRESHOLD_MS) {
    return {
      key: "online",
      label: "Online",
      tone: "positive",
    };
  }

  return {
    key: "offline",
    label: toOfflineLabel(lastSeenAt, now),
    tone: "warning",
  };
}
