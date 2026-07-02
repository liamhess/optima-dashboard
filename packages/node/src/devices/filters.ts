import type { MergedDevice } from "./merge.js";
import { matchesInstallationDateRange } from "./installation-date-range.js";

export const lifecycleValues = [
  "Bestellt",
  "Verschickt",
  "Verbaut",
  "Aktiviert",
  "Online",
  "Online mit Problem",
  "Offline",
  "Storniert",
] as const;

export type DeviceBaseFilters = {
  search: string;
  deviceType: string;
  installationFrom: string;
  installationTo: string;
};

export type DeviceListFilters = DeviceBaseFilters & {
  lifecycle: string;
};

export function matchesDeviceBaseFilters(
  device: MergedDevice,
  filters: DeviceBaseFilters,
): boolean {
  if (
    !matchesInstallationDateRange(
      device.installation.date,
      filters.installationFrom,
      filters.installationTo,
    )
  ) {
    return false;
  }

  if (filters.deviceType && device.deviceType !== filters.deviceType) {
    return false;
  }

  if (!filters.search) {
    return true;
  }

  const searchNeedle = filters.search.toLocaleLowerCase();
  const searchableValues = [
    device.customer.name,
    device.customer.state,
    device.serialNumber,
    device.macAddress,
  ];

  return searchableValues.some((value) => value?.toLocaleLowerCase().includes(searchNeedle));
}

export function matchesDeviceListFilters(
  device: MergedDevice,
  filters: DeviceListFilters,
): boolean {
  if (filters.lifecycle && device.lifecycle !== filters.lifecycle) {
    return false;
  }

  return matchesDeviceBaseFilters(device, filters);
}
