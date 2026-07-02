export type DeviceCustomer = {
  name: string | null;
  email: string | null;
  state: string | null;
};

export type DeviceInstallation<TDate> = {
  type: string | null;
  date: TDate;
};

export type DeviceTimeline<TDate> = {
  orderedAt: TDate;
  shippedAt: TDate;
  installedAt: TDate;
  activatedAt: TDate;
  lastSeenAt: TDate;
};

export type DeviceRecord<TDate> = {
  id: string;
  deviceType: string;
  // TODO: Model lifecycle more strictly once we decide how to represent API and overlay values.
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  trackingUrl: string | null;
  notes: string | null;
  customer: DeviceCustomer;
  installation: DeviceInstallation<TDate>;
} & DeviceTimeline<TDate>;

export type EditableDeviceField = "lifecycle" | "serialNumber" | "macAddress" | "notes";
export type LocalTimestampField = "shippedAt" | "installedAt" | "activatedAt";

export type EditableDeviceBaseField =
  | "baseLifecycle"
  | "baseSerialNumber"
  | "baseMacAddress"
  | "baseNotes";

export const editableDeviceFields = [
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
] as const satisfies ReadonlyArray<{
  field: EditableDeviceField;
  baseField: EditableDeviceBaseField;
}>;

export type EditableDeviceValues = {
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  notes: string | null;
};

export const localTimestampFields = [
  "shippedAt",
  "installedAt",
  "activatedAt",
] as const satisfies ReadonlyArray<LocalTimestampField>;

export type LocalTimestampValues = Record<LocalTimestampField, Date | null>;

export type EditableDeviceConflictValue = {
  isConflicted: boolean;
  localValue: string | null;
  upstreamValue: string | null;
};

export type EditableDeviceConflictState = Record<
  EditableDeviceField,
  EditableDeviceConflictValue
> & {
  hasAny: boolean;
};
