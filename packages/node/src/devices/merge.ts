import type { Device, DeviceOverlay } from "@prisma/client";
import { editableDeviceFields } from "./types.js";
import type {
  DeviceRecord,
  EditableDeviceConflictState,
  EditableDeviceConflictValue,
  EditableDeviceField,
} from "./types.js";

export type MergedDevice = DeviceRecord<Date | null> & {
  lastSyncedAt: Date;
  overlay: {
    updatedAt: Date;
  } | null;
  conflicts: EditableDeviceConflictState;
};

function hasConflict(
  overlayValue: string | null,
  currentBaseline: string | null,
  previousBaseline: string | null,
): boolean {
  return overlayValue !== null && currentBaseline !== previousBaseline;
}

function buildConflictValue(
  overlayValue: string | null,
  currentBaseline: string | null,
  previousBaseline: string | null,
): EditableDeviceConflictValue {
  return {
    isConflicted: hasConflict(overlayValue, currentBaseline, previousBaseline),
    localValue: overlayValue,
    upstreamValue: currentBaseline,
  };
}

export function mergeDevice(device: Device, overlay: DeviceOverlay | null): MergedDevice {
  const initialConflicts: Record<EditableDeviceField, EditableDeviceConflictValue> = {
    lifecycle: {
      isConflicted: false,
      localValue: null,
      upstreamValue: device.lifecycle,
    },
    serialNumber: {
      isConflicted: false,
      localValue: null,
      upstreamValue: device.serialNumber,
    },
    macAddress: {
      isConflicted: false,
      localValue: null,
      upstreamValue: device.macAddress,
    },
    notes: {
      isConflicted: false,
      localValue: null,
      upstreamValue: device.notes,
    },
  };

  const conflicts = editableDeviceFields.reduce<EditableDeviceConflictState>(
    (accumulator, { field, baseField }) => {
      accumulator[field] = buildConflictValue(
        overlay?.[field] ?? null,
        device[field],
        overlay?.[baseField] ?? null,
      );
      return accumulator;
    },
    {
      ...initialConflicts,
      hasAny: false,
    },
  );

  conflicts.hasAny = editableDeviceFields.some(({ field }) => conflicts[field].isConflicted);

  return {
    id: device.id,
    deviceType: device.deviceType,
    lifecycle: overlay?.lifecycle ?? device.lifecycle,
    serialNumber: overlay?.serialNumber ?? device.serialNumber,
    macAddress: overlay?.macAddress ?? device.macAddress,
    trackingUrl: device.trackingUrl,
    notes: overlay?.notes ?? device.notes,
    orderedAt: device.orderedAt,
    shippedAt: overlay?.shippedAt ?? device.shippedAt,
    installedAt: overlay?.installedAt ?? device.installedAt,
    activatedAt: overlay?.activatedAt ?? device.activatedAt,
    lastSeenAt: device.lastSeenAt,
    lastSyncedAt: device.lastSyncedAt,
    customer: {
      name: device.customerName,
      email: device.customerEmail,
      state: device.customerState,
    },
    installation: {
      type: device.installationType,
      date: device.installationDate,
    },
    overlay: overlay
      ? {
          updatedAt: overlay.updatedAt,
        }
      : null,
    conflicts: {
      ...conflicts,
    },
  };
}
