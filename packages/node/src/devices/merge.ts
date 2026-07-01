import type { Device, DeviceOverlay } from "@prisma/client";
import type { DeviceRecord, EditableDeviceConflictState, EditableDeviceField } from "./types.js";

type MergedDevice = DeviceRecord<Date | null> & {
  lastSyncedAt: Date;
  overlay: {
    updatedAt: Date;
  } | null;
  conflicts: EditableDeviceConflictState;
};

const editableFields = [
  {
    field: "lifecycle",
    baseField: "baseLifecycle",
  },
  {
    field: "serialNumber",
    baseField: "baseSerialNumber",
  },
  {
    field: "macAddress",
    baseField: "baseMacAddress",
  },
  {
    field: "notes",
    baseField: "baseNotes",
  },
] as const;

function hasConflict(
  overlayValue: string | null,
  currentBaseline: string | null,
  previousBaseline: string | null,
): boolean {
  return overlayValue !== null && currentBaseline !== previousBaseline;
}

export function mergeDevice(device: Device, overlay: DeviceOverlay | null): MergedDevice {
  const initialConflicts: Record<EditableDeviceField, boolean> = {
    lifecycle: false,
    serialNumber: false,
    macAddress: false,
    notes: false,
  };

  const conflicts = editableFields.reduce<EditableDeviceConflictState>(
    (accumulator, { field, baseField }) => {
      accumulator[field] = hasConflict(
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

  conflicts.hasAny = editableFields.some(({ field }) => conflicts[field]);

  return {
    id: device.id,
    deviceType: device.deviceType,
    lifecycle: overlay?.lifecycle ?? device.lifecycle,
    serialNumber: overlay?.serialNumber ?? device.serialNumber,
    macAddress: overlay?.macAddress ?? device.macAddress,
    trackingUrl: device.trackingUrl,
    notes: overlay?.notes ?? device.notes,
    orderedAt: device.orderedAt,
    shippedAt: device.shippedAt,
    installedAt: device.installedAt,
    activatedAt: device.activatedAt,
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
