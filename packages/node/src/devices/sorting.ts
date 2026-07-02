import type { MergedDevice } from "./merge.js";

export const deviceSortKeys = [
  "customerName",
  "customerState",
  "deviceType",
  "lifecycle",
  "installationDate",
] as const;

export type DeviceSortKey = (typeof deviceSortKeys)[number];
export type DeviceSortDirection = "asc" | "desc";

type ComparableValue = Date | string | null;

type DeviceSortConfig = {
  direction: DeviceSortDirection;
  sortBy: DeviceSortKey;
};

type SortableDeviceField = {
  value: ComparableValue;
};

const defaultSortConfig: DeviceSortConfig = {
  sortBy: "customerName",
  direction: "asc",
};

const sortableDeviceFieldByKey: Record<DeviceSortKey, (device: MergedDevice) => ComparableValue> = {
  customerName: (device) => device.customer.name,
  customerState: (device) => device.customer.state,
  deviceType: (device) => device.deviceType,
  lifecycle: (device) => device.lifecycle,
  installationDate: (device) => device.installation.date,
};

function toSortableDeviceField(value: ComparableValue): SortableDeviceField {
  return {
    value,
  };
}

function compareNullableValues(left: ComparableValue, right: ComparableValue): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  return String(left).localeCompare(String(right), undefined, {
    sensitivity: "base",
  });
}

function compareByKey(left: MergedDevice, right: MergedDevice, sortBy: DeviceSortKey): number {
  const leftField = toSortableDeviceField(sortableDeviceFieldByKey[sortBy](left));
  const rightField = toSortableDeviceField(sortableDeviceFieldByKey[sortBy](right));

  return compareNullableValues(leftField.value, rightField.value);
}

function compareWithTieBreakers(left: MergedDevice, right: MergedDevice): number {
  const customerNameComparison = compareByKey(left, right, "customerName");

  if (customerNameComparison !== 0) {
    return customerNameComparison;
  }

  return left.id.localeCompare(right.id, undefined, {
    sensitivity: "base",
  });
}

export function sortDevices(
  devices: MergedDevice[],
  config: Partial<DeviceSortConfig> = {},
): MergedDevice[] {
  const sortBy = config.sortBy ?? defaultSortConfig.sortBy;
  const direction = config.direction ?? defaultSortConfig.direction;
  const directionMultiplier = direction === "desc" ? -1 : 1;

  return [...devices].sort((left, right) => {
    const primaryComparison = compareByKey(left, right, sortBy);

    if (primaryComparison !== 0) {
      return primaryComparison * directionMultiplier;
    }

    return compareWithTieBreakers(left, right);
  });
}
