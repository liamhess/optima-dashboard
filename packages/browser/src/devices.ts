type DeviceCustomer = {
  name: string | null;
  email: string | null;
  state: string | null;
};

type DeviceInstallation = {
  type: string | null;
  date: Date | string | null;
};

export type DeviceConflictValue = {
  isConflicted: boolean;
  localValue: string | null;
  upstreamValue: string | null;
};

type DeviceConflicts = {
  lifecycle: DeviceConflictValue;
  serialNumber: DeviceConflictValue;
  macAddress: DeviceConflictValue;
  notes: DeviceConflictValue;
  hasAny: boolean;
};

export type DeviceConflictField = Exclude<keyof DeviceConflicts, "hasAny">;

export type DeviceListItem = {
  id: string;
  deviceType: string;
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  trackingUrl: string | null;
  notes: string | null;
  orderedAt: Date | string | null;
  shippedAt: Date | string | null;
  installedAt: Date | string | null;
  activatedAt: Date | string | null;
  lastSeenAt: Date | string | null;
  lastSyncedAt: Date | string;
  customer: DeviceCustomer;
  installation: DeviceInstallation;
  overlay: {
    updatedAt: Date | string;
  } | null;
  conflicts: DeviceConflicts;
};

export type GuidedLifecycleAdvance = {
  nextLifecycle: string;
  timestampField: "shippedAt" | "installedAt" | "activatedAt" | null;
};

export type DeviceTableRow = {
  id: string;
  customerName: string;
  customerState: string;
  deviceType: string;
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  installationDateLabel: string;
  onlineLabel: string;
  onlineTone: "neutral" | "positive" | "warning" | "danger";
};

function toDate(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

export function toIsoDateTimeString(value: Date | string | null): string | null {
  const parsedValue = toDate(value);
  return parsedValue ? parsedValue.toISOString() : null;
}

// TODO: Move this guided lifecycle definition into shared code once `packages/common` exists.
export function getGuidedLifecycleAdvance(lifecycle: string): GuidedLifecycleAdvance | null {
  if (lifecycle === "Bestellt") {
    return {
      nextLifecycle: "Verschickt",
      timestampField: "shippedAt",
    };
  }

  if (lifecycle === "Verschickt") {
    return {
      nextLifecycle: "Verbaut",
      timestampField: "installedAt",
    };
  }

  if (lifecycle === "Verbaut") {
    return {
      nextLifecycle: "Aktiviert",
      timestampField: "activatedAt",
    };
  }

  if (lifecycle === "Aktiviert") {
    return {
      nextLifecycle: "Online",
      timestampField: null,
    };
  }

  return null;
}

export function formatDateLabel(value: Date | string | null, fallback = "Not scheduled"): string {
  const parsedValue = toDate(value);

  if (!parsedValue) {
    return fallback;
  }

  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedValue);
}

export function formatDateTimeLabel(
  value: Date | string | null,
  fallback = "Nicht verfuegbar",
): string {
  const parsedValue = toDate(value);

  if (!parsedValue) {
    return fallback;
  }

  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedValue);
}

function formatRelativeDays(days: number): string {
  if (days <= 0) {
    return "today";
  }

  if (days === 1) {
    return "1 day ago";
  }

  return `${days} days ago`;
}

export function getDeviceOnlineStatus(device: DeviceListItem): {
  label: string;
  tone: DeviceTableRow["onlineTone"];
} {
  if (device.lifecycle === "Online mit Problem") {
    return {
      label: "Problem reported",
      tone: "warning",
    };
  }

  if (device.lifecycle === "Offline") {
    return {
      label: "Offline",
      tone: "danger",
    };
  }

  const lastSeenAt = toDate(device.lastSeenAt);

  if (lastSeenAt) {
    const now = Date.now();
    const diffInMs = now - lastSeenAt.getTime();
    const diffInDays = Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));

    return {
      label: diffInDays === 0 ? "Online now" : `Seen ${formatRelativeDays(diffInDays)}`,
      tone: diffInDays <= 1 ? "positive" : "warning",
    };
  }

  if (device.lifecycle === "Aktiviert") {
    return {
      label: "Awaiting first signal",
      tone: "warning",
    };
  }

  if (device.lifecycle === "Verbaut" || device.lifecycle === "Verschickt") {
    return {
      label: "Waiting for install",
      tone: "neutral",
    };
  }

  if (device.lifecycle === "Bestellt") {
    return {
      label: "Not shipped yet",
      tone: "neutral",
    };
  }

  if (device.lifecycle === "Storniert") {
    return {
      label: "Cancelled",
      tone: "danger",
    };
  }

  return {
    label: "Unknown",
    tone: "neutral",
  };
}

export function toDeviceTableRows(devices: DeviceListItem[]): DeviceTableRow[] {
  return devices.map((device) => {
    const onlineStatus = getDeviceOnlineStatus(device);

    return {
      id: device.id,
      customerName: device.customer.name ?? "Unknown customer",
      customerState: device.customer.state ?? "Unknown",
      deviceType: device.deviceType,
      lifecycle: device.lifecycle,
      serialNumber: device.serialNumber,
      macAddress: device.macAddress,
      installationDateLabel: formatDateLabel(device.installation.date),
      onlineLabel: onlineStatus.label,
      onlineTone: onlineStatus.tone,
    };
  });
}
