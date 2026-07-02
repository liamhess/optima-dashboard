type DeviceCustomer = {
  name: string | null;
  email: string | null;
  state: string | null;
};

type DeviceInstallation = {
  type: string | null;
  date: Date | string | null;
};

type DeviceOnlineStatus = {
  key: "waiting" | "online" | "offline";
  label: string;
  tone: "neutral" | "positive" | "warning" | "danger";
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
  onlineStatus: DeviceOnlineStatus;
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
  onlineTone: DeviceOnlineStatus["tone"];
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

export function formatDateLabel(value: Date | string | null, fallback = "Nicht geplant"): string {
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

export function toDeviceTableRows(devices: DeviceListItem[]): DeviceTableRow[] {
  return devices.map((device) => {
    return {
      id: device.id,
      customerName: device.customer.name ?? "Unbekannter Kunde",
      customerState: device.customer.state ?? "Unbekannt",
      deviceType: device.deviceType,
      lifecycle: device.lifecycle,
      serialNumber: device.serialNumber,
      macAddress: device.macAddress,
      installationDateLabel: formatDateLabel(device.installation.date),
      onlineLabel: device.onlineStatus.label,
      onlineTone: device.onlineStatus.tone,
    };
  });
}
