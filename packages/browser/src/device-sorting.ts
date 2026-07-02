import type { SortingState } from "@tanstack/react-table";

export const deviceSortKeys = [
  "customerName",
  "customerState",
  "deviceType",
  "lifecycle",
  "installationDate",
] as const;

export type DeviceSortKey = (typeof deviceSortKeys)[number];
export type DeviceSortDirection = "asc" | "desc";

export const defaultDeviceSortKey: DeviceSortKey = "customerName";
export const defaultDeviceSortDirection: DeviceSortDirection = "asc";

export function isDeviceSortKey(value: unknown): value is DeviceSortKey {
  return typeof value === "string" && deviceSortKeys.includes(value as DeviceSortKey);
}

export function isDeviceSortDirection(value: unknown): value is DeviceSortDirection {
  return value === "asc" || value === "desc";
}

export function toDeviceSortingState(
  sortBy: DeviceSortKey | undefined,
  sortDirection: DeviceSortDirection | undefined,
): SortingState {
  if (!sortBy) {
    return [];
  }

  return [
    {
      id: sortBy,
      desc: sortDirection === "desc",
    },
  ];
}
