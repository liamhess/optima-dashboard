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

export type EditableDeviceValues = {
  lifecycle: string;
  serialNumber: string | null;
  macAddress: string | null;
  notes: string | null;
};

export type EditableDeviceConflictState = Record<EditableDeviceField, boolean> & {
  hasAny: boolean;
};
