import { startTransition, useEffect, useMemo, useState, type JSX } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { functionalUpdate, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { CalendarIcon, ArrowRightIcon, XIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { CopyValueButton } from "@/components/copy-value-button.tsx";
import { DeviceDetailSheet } from "@/components/device-detail-sheet.tsx";
import { DataTable } from "@/components/data-table.tsx";
import {
  defaultDeviceSortDirection,
  defaultDeviceSortKey,
  isDeviceSortDirection,
  isDeviceSortKey,
  toDeviceSortingState,
  type DeviceSortKey,
} from "@/device-sorting.ts";
import {
  formatDateLabel,
  getGuidedLifecycleAdvance,
  toDeviceTableRows,
  type DeviceListItem,
  type DeviceTableRow,
} from "@/devices.ts";
import { lifecycleOptions } from "@/lifecycles.ts";
import { rootRoute } from "./__root.tsx";
import { trpc } from "../trpc.ts";

const allFilterValue = "all";
const defaultInstallationDueLabel = "Installationen in den nächsten 14 Tagen";
const selectedInstallationRangeLabel = "Installationen im ausgewählten Zeitraum";
const installationDueHint = "Schnellfilter für Installationen ab heute in den nächsten 14 Tagen.";

const onlineIndicatorClassNameByTone: Record<DeviceTableRow["onlineTone"], string> = {
  neutral: "size-2.5 rounded-full bg-muted-foreground/35",
  positive: "size-2.5 rounded-full bg-primary",
  warning: "size-2.5 rounded-full bg-amber-500",
  danger: "size-2.5 rounded-full bg-red-500",
};

function toQueryFilterValue(value: string): string {
  return value === allFilterValue ? "" : value;
}

type DashboardFilterValue = {
  deviceType: string;
  installationFrom?: string;
  installationTo?: string;
  lifecycle: string;
  search: string;
};

function isDateOnlyString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateOnlyString(value: string): Date | undefined {
  if (!isDateOnlyString(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnlyString(value: Date): string {
  const year = value.getFullYear().toString();
  const month = (value.getMonth() + 1).toString().padStart(2, "0");
  const day = value.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function getInstallationDuePresetRange(
  now = new Date(),
): Required<Pick<DashboardFilterValue, "installationFrom" | "installationTo">> {
  return {
    installationFrom: toDateOnlyString(now),
    installationTo: toDateOnlyString(addDays(now, 13)),
  };
}

function isInstallationDuePresetActive(
  filters: Pick<DashboardFilterValue, "installationFrom" | "installationTo">,
): boolean {
  const presetRange = getInstallationDuePresetRange();

  return (
    filters.installationFrom === presetRange.installationFrom &&
    filters.installationTo === presetRange.installationTo
  );
}

function toDateRange(
  value: Pick<DashboardFilterValue, "installationFrom" | "installationTo">,
): DateRange | undefined {
  const from = value.installationFrom ? parseDateOnlyString(value.installationFrom) : undefined;
  const to = value.installationTo ? parseDateOnlyString(value.installationTo) : undefined;

  if (!from && !to) {
    return undefined;
  }

  return {
    from,
    to,
  };
}

function formatInstallationRangeLabel(dateRange: DateRange | undefined): string {
  if (!dateRange?.from) {
    return "Zeitraum wählen";
  }

  if (!dateRange.to) {
    return `${formatDateLabel(dateRange.from)} - ...`;
  }

  return `${formatDateLabel(dateRange.from)} - ${formatDateLabel(dateRange.to)}`;
}

type DashboardControlsProps = {
  deviceTypeOptions: string[];
  filters: DashboardFilterValue;
  kpis:
    | {
        installationDueCount: number;
        lifecycleCounts: Array<{
          count: number;
          lifecycle: string;
        }>;
        totalCount: number;
      }
    | undefined;
  kpisError: boolean;
  kpisLoading: boolean;
  onFiltersChange: (nextFilters: DashboardFilterValue, replace: boolean) => void;
  onReset: () => void;
};

function DashboardControls(props: DashboardControlsProps): JSX.Element {
  const [searchInput, setSearchInput] = useState(props.filters.search);
  const [selectedLifecycleFilter, setSelectedLifecycleFilter] = useState(props.filters.lifecycle);
  const [selectedDeviceTypeFilter, setSelectedDeviceTypeFilter] = useState(
    props.filters.deviceType,
  );
  const [selectedInstallationRange, setSelectedInstallationRange] = useState<DateRange | undefined>(
    toDateRange(props.filters),
  );
  const hasInstallationDuePreset = isInstallationDuePresetActive(props.filters);
  const hasCustomInstallationRange =
    Boolean(props.filters.installationFrom && props.filters.installationTo) &&
    !hasInstallationDuePreset;
  const installationKpiLabel = hasCustomInstallationRange
    ? selectedInstallationRangeLabel
    : defaultInstallationDueLabel;
  const installationKpiCount =
    hasCustomInstallationRange && props.kpis
      ? props.kpis.totalCount
      : props.kpis?.installationDueCount;

  useEffect(() => {
    setSearchInput(props.filters.search);
  }, [props.filters.search]);

  useEffect(() => {
    setSelectedLifecycleFilter(props.filters.lifecycle);
  }, [props.filters.lifecycle]);

  useEffect(() => {
    setSelectedDeviceTypeFilter(props.filters.deviceType);
  }, [props.filters.deviceType]);

  useEffect(() => {
    setSelectedInstallationRange(toDateRange(props.filters));
  }, [props.filters.installationFrom, props.filters.installationTo]);

  useEffect(() => {
    if (searchInput === props.filters.search) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      props.onFiltersChange(
        {
          ...props.filters,
          search: searchInput,
        },
        true,
      );
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [props, searchInput]);

  return (
    <>
      <div className="border-b border-border/80 bg-[#f7f8f1] px-5 py-4">
        {props.kpisLoading ? (
          <div className="text-sm text-muted-foreground">Flottenübersicht wird geladen...</div>
        ) : null}

        {!props.kpisLoading && props.kpisError ? (
          <div className="text-sm text-red-700">Flottenübersicht konnte nicht geladen werden.</div>
        ) : null}

        {!props.kpisLoading && !props.kpisError && props.kpis ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
            {props.kpis.lifecycleCounts.map((item) => {
              const isActive = selectedLifecycleFilter === item.lifecycle;

              return (
                <button
                  key={item.lifecycle}
                  type="button"
                  onClick={() => {
                    const nextLifecycle = isActive ? allFilterValue : item.lifecycle;
                    setSelectedLifecycleFilter(nextLifecycle);
                    props.onFiltersChange(
                      {
                        search: searchInput,
                        lifecycle: nextLifecycle,
                        deviceType: selectedDeviceTypeFilter,
                        installationFrom: props.filters.installationFrom,
                        installationTo: props.filters.installationTo,
                      },
                      false,
                    );
                  }}
                  className={[
                    "group rounded-[1.15rem] border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(22,166,55,0.2)]"
                      : "border-border/80 bg-background hover:border-primary/40 hover:bg-white",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "text-[0.66rem] font-semibold uppercase tracking-[0.22em]",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {item.lifecycle}
                  </p>
                  <p className="mt-2 text-2xl font-semibold">{item.count}</p>
                </button>
              );
            })}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    const nextInstallationRange = hasInstallationDuePreset
                      ? {
                          installationFrom: undefined,
                          installationTo: undefined,
                        }
                      : getInstallationDuePresetRange();

                    setSelectedInstallationRange(toDateRange(nextInstallationRange));
                    props.onFiltersChange(
                      {
                        search: searchInput,
                        lifecycle: selectedLifecycleFilter,
                        deviceType: selectedDeviceTypeFilter,
                        ...nextInstallationRange,
                      },
                      false,
                    );
                  }}
                  className={[
                    "rounded-[1.15rem] border px-4 py-3 text-left transition-colors",
                    hasInstallationDuePreset
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(22,166,55,0.2)]"
                      : "border-border/80 bg-background hover:border-primary/40 hover:bg-white",
                  ].join(" ")}
                >
                  <p
                    className={[
                      "text-[0.66rem] font-semibold uppercase tracking-[0.22em]",
                      hasInstallationDuePreset
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {installationKpiLabel}
                  </p>
                  <p
                    className={[
                      "mt-2 text-2xl font-semibold",
                      hasInstallationDuePreset ? "text-primary-foreground" : "text-foreground",
                    ].join(" ")}
                  >
                    {installationKpiCount ?? 0}
                  </p>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                {installationDueHint}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}
      </div>

      <div className="border-b border-border/80 bg-[#fcfcf7] px-5 py-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_240px_240px_280px]">
            <label className="space-y-2">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Suche
              </span>
              <Input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                placeholder="Kunde, Seriennummer oder MAC"
                aria-label="Suche nach Kunde, Seriennummer oder MAC"
                className="h-11 rounded-xl border-border/80 bg-background px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Lifecycle
              </span>
              <Select
                value={selectedLifecycleFilter}
                onValueChange={(value) => {
                  setSelectedLifecycleFilter(value);
                  props.onFiltersChange(
                    {
                      search: searchInput,
                      lifecycle: value,
                      deviceType: selectedDeviceTypeFilter,
                      installationFrom: props.filters.installationFrom,
                      installationTo: props.filters.installationTo,
                    },
                    false,
                  );
                }}
              >
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-border/80 bg-background px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  aria-label="Nach Lifecycle filtern"
                >
                  <SelectValue placeholder="Alle Lifecycle-Stufen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allFilterValue}>Alle Lifecycle-Stufen</SelectItem>
                  {lifecycleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Gerätetyp
              </span>
              <Select
                value={selectedDeviceTypeFilter}
                onValueChange={(value) => {
                  setSelectedDeviceTypeFilter(value);
                  props.onFiltersChange(
                    {
                      search: searchInput,
                      lifecycle: selectedLifecycleFilter,
                      deviceType: value,
                      installationFrom: props.filters.installationFrom,
                      installationTo: props.filters.installationTo,
                    },
                    false,
                  );
                }}
              >
                <SelectTrigger
                  className="h-11 w-full rounded-xl border-border/80 bg-background px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  aria-label="Nach Gerätetyp filtern"
                >
                  <SelectValue placeholder="Alle Gerätetypen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allFilterValue}>Alle Gerätetypen</SelectItem>
                  {props.deviceTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="space-y-2">
              <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Installationstermin
              </span>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-start rounded-xl border-border/80 bg-background px-3.5 pr-11 text-left font-normal shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    >
                      <CalendarIcon className="size-4 text-muted-foreground" />
                      <span className="truncate">
                        {formatInstallationRangeLabel(selectedInstallationRange)}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      defaultMonth={selectedInstallationRange?.from}
                      selected={selectedInstallationRange}
                      onSelect={(nextRange) => {
                        setSelectedInstallationRange(nextRange);

                        if (!nextRange?.from || !nextRange.to) {
                          return;
                        }

                        props.onFiltersChange(
                          {
                            search: searchInput,
                            lifecycle: selectedLifecycleFilter,
                            deviceType: selectedDeviceTypeFilter,
                            installationFrom: toDateOnlyString(nextRange.from),
                            installationTo: toDateOnlyString(nextRange.to),
                          },
                          false,
                        );
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {selectedInstallationRange?.from ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedInstallationRange(undefined);
                      props.onFiltersChange(
                        {
                          search: searchInput,
                          lifecycle: selectedLifecycleFilter,
                          deviceType: selectedDeviceTypeFilter,
                          installationFrom: undefined,
                          installationTo: undefined,
                        },
                        false,
                      );
                    }}
                    aria-label="Installationszeitraum löschen"
                  >
                    <XIcon className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-1">
            <Button
              variant="outline"
              className="h-11 rounded-xl border-border/80 bg-background px-4"
              onClick={() => {
                setSearchInput("");
                setSelectedLifecycleFilter(allFilterValue);
                setSelectedDeviceTypeFilter(allFilterValue);
                setSelectedInstallationRange(undefined);
                props.onReset();
              }}
            >
              Zurücksetzen
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: indexRoute.id });
  const queryClient = useQueryClient();
  const {
    deviceId,
    deviceType,
    installationFrom,
    installationTo,
    lifecycle,
    search,
    sortBy,
    sortDirection,
  } = indexRoute.useSearch();
  const trimmedSearch = search.trim();
  const selectedLifecycle = toQueryFilterValue(lifecycle);
  const selectedDeviceType = toQueryFilterValue(deviceType);
  const sorting = toDeviceSortingState(sortBy, sortDirection);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hasExplicitSortBy = searchParams.has("sortBy");
    const hasExplicitSortDirection = searchParams.has("sortDirection");

    if (hasExplicitSortBy && hasExplicitSortDirection) {
      return;
    }

    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          sortBy: defaultDeviceSortKey,
          sortDirection: defaultDeviceSortDirection,
        }),
        replace: true,
      });
    });
  }, [navigate, sortBy, sortDirection]);

  const devicesQuery = useQuery({
    ...trpc.devices.list.queryOptions({
      search: trimmedSearch,
      lifecycle: selectedLifecycle,
      deviceType: selectedDeviceType,
      installationFrom,
      installationTo,
      sortBy,
      sortDirection,
    }),
    placeholderData: keepPreviousData,
  });
  const kpisQuery = useQuery({
    ...trpc.devices.kpis.queryOptions({
      search: trimmedSearch,
      deviceType: selectedDeviceType,
      installationFrom,
      installationTo,
    }),
    placeholderData: keepPreviousData,
  });
  const deviceTypesQuery = useQuery(trpc.devices.deviceTypes.queryOptions());
  const selectedDeviceQuery = useQuery({
    ...trpc.devices.byId.queryOptions({ id: deviceId ?? "" }),
    enabled: Boolean(deviceId),
  });
  const [lastDevicesData, setLastDevicesData] = useState<DeviceListItem[] | undefined>();
  const advanceLifecycleMutation = useMutation(
    trpc.devices.advanceLifecycle.mutationOptions({
      onSuccess: async (): Promise<void> => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.devices.byId.pathFilter()),
          queryClient.invalidateQueries(trpc.devices.list.pathFilter()),
          queryClient.invalidateQueries(trpc.devices.kpis.pathFilter()),
        ]);
      },
    }),
  );
  const displayedDevices = devicesQuery.data ?? lastDevicesData;

  useEffect(() => {
    if (devicesQuery.data) {
      setLastDevicesData(devicesQuery.data);
    }
  }, [devicesQuery.data]);

  const deviceRows = useMemo(
    () => (displayedDevices ? toDeviceTableRows(displayedDevices) : []),
    [displayedDevices],
  );
  const deviceTypeOptions = deviceTypesQuery.data ?? [];
  const selectedDevice = selectedDeviceQuery.data as DeviceListItem | undefined;

  function updateFilters(nextFilters: DashboardFilterValue, replace: boolean): void {
    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          search: nextFilters.search,
          lifecycle: nextFilters.lifecycle,
          deviceType: nextFilters.deviceType,
          installationFrom: nextFilters.installationFrom || undefined,
          installationTo: nextFilters.installationTo || undefined,
        }),
        replace,
        resetScroll: false,
      });
    });
  }

  function updateSorting(updater: SortingState | ((old: SortingState) => SortingState)): void {
    const nextSorting = functionalUpdate(updater, sorting);
    const [nextSort] = nextSorting;

    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          sortBy: nextSort?.id as DeviceSortKey | undefined,
          sortDirection: nextSort?.desc ? "desc" : nextSort ? "asc" : undefined,
        }),
        replace: false,
        resetScroll: false,
      });
    });
  }

  function resetFiltersAndSorting(): void {
    startTransition(() => {
      void navigate({
        search: (previous) => ({
          ...previous,
          search: "",
          lifecycle: allFilterValue,
          deviceType: allFilterValue,
          installationFrom: undefined,
          installationTo: undefined,
          sortBy: defaultDeviceSortKey,
          sortDirection: defaultDeviceSortDirection,
        }),
        replace: false,
        resetScroll: false,
      });
    });
  }

  const deviceColumns = useMemo<ColumnDef<DeviceTableRow>[]>(
    () => [
      {
        id: "customerName",
        accessorKey: "customerName",
        enableSorting: true,
        header: "Kunde",
        cell: ({ row }) => (
          <p className="font-medium text-foreground">{row.original.customerName}</p>
        ),
      },
      {
        id: "customerState",
        accessorKey: "customerState",
        enableSorting: true,
        header: "Ort",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.customerState}</span>
        ),
      },
      {
        id: "deviceType",
        accessorKey: "deviceType",
        enableSorting: true,
        header: "Gerätetyp",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.deviceType}</span>
        ),
      },
      {
        id: "lifecycle",
        accessorKey: "lifecycle",
        enableSorting: true,
        header: "Lifecycle",
        cell: ({ row }) => {
          const guidedAdvance = getGuidedLifecycleAdvance(row.original.lifecycle);
          const isPending =
            advanceLifecycleMutation.isPending &&
            advanceLifecycleMutation.variables?.id === row.original.id;

          return (
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full border border-border/60 bg-secondary px-3 py-1 text-foreground"
              >
                {row.original.lifecycle}
              </Badge>
              {guidedAdvance ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-7 rounded-full border-border/80 bg-background"
                      disabled={isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        void advanceLifecycleMutation.mutateAsync({ id: row.original.id });
                      }}
                      aria-label={`Weiter zu ${guidedAdvance.nextLifecycle}`}
                    >
                      <ArrowRightIcon className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Weiter zu {guidedAdvance.nextLifecycle}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "identifier",
        enableSorting: false,
        header: "Serial / MAC",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-mono text-xs text-foreground">
              {row.original.serialNumber ?? "Keine Seriennummer"}
            </p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-muted-foreground">
                {row.original.macAddress ?? "Keine MAC-Adresse"}
              </p>
              <CopyValueButton
                copyLabel="MAC-Adresse kopieren"
                copiedLabel="MAC-Adresse kopiert"
                value={row.original.macAddress}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              />
            </div>
          </div>
        ),
      },
      {
        id: "installationDate",
        accessorKey: "installationDateLabel",
        enableSorting: true,
        header: "Installation",
        cell: ({ row }) => (
          <span className="text-sm text-foreground">{row.original.installationDateLabel}</span>
        ),
      },
      {
        id: "onlineLabel",
        accessorKey: "onlineLabel",
        enableSorting: false,
        header: "Online",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span
              className={onlineIndicatorClassNameByTone[row.original.onlineTone]}
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">{row.original.onlineLabel}</span>
          </div>
        ),
      },
    ],
    [advanceLifecycleMutation.isPending, advanceLifecycleMutation.variables?.id],
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafaf5_100%)]">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="text-4xl leading-none">⚡</div>
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              Optima Geräteflotte
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-[1.75rem] border border-border/90 bg-background/96 shadow-[0_24px_80px_rgba(16,31,22,0.06)]">
          <DashboardControls
            filters={{
              search,
              lifecycle,
              deviceType,
              installationFrom,
              installationTo,
            }}
            deviceTypeOptions={deviceTypeOptions}
            kpis={kpisQuery.data}
            kpisLoading={kpisQuery.isPending && !kpisQuery.data}
            kpisError={Boolean(kpisQuery.error)}
            onFiltersChange={updateFilters}
            onReset={resetFiltersAndSorting}
          />

          {devicesQuery.isPending && !displayedDevices ? (
            <div className="px-5 py-16 text-sm text-muted-foreground">
              Geräteflotte wird geladen...
            </div>
          ) : null}

          {devicesQuery.error && !displayedDevices ? (
            <div className="px-5 py-8">
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                <p className="font-medium">Geräte konnten nicht geladen werden.</p>
                <code className="mt-2 block overflow-x-auto rounded-xl bg-white/80 p-3 font-mono text-xs text-red-700">
                  {devicesQuery.error.message}
                </code>
              </div>
            </div>
          ) : null}

          {displayedDevices ? (
            <DataTable
              columns={deviceColumns}
              data={deviceRows}
              emptyMessage="Keine Geräte gefunden."
              onSortingChange={updateSorting}
              sorting={sorting}
              getRowClassName={(row) =>
                row.id === deviceId
                  ? "bg-primary/[0.065] shadow-[inset_0_0_0_1px_rgba(22,166,55,0.18)]"
                  : undefined
              }
              onRowClick={(row) => {
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    deviceId: row.id,
                  }),
                  replace: false,
                  resetScroll: false,
                });
              }}
            />
          ) : null}
        </section>
      </section>

      <DeviceDetailSheet
        device={selectedDevice}
        error={selectedDeviceQuery.error ?? null}
        isLoading={selectedDeviceQuery.isLoading}
        isOpen={Boolean(deviceId)}
        onClose={() => {
          void navigate({
            search: (previous) => ({
              ...previous,
              deviceId: undefined,
            }),
            replace: false,
            resetScroll: false,
          });
        }}
        onRetry={() => {
          void selectedDeviceQuery.refetch();
        }}
      />
    </main>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search) => ({
    deviceId: typeof search.deviceId === "string" ? search.deviceId : undefined,
    search: typeof search.search === "string" ? search.search : "",
    lifecycle: typeof search.lifecycle === "string" ? search.lifecycle : allFilterValue,
    deviceType: typeof search.deviceType === "string" ? search.deviceType : allFilterValue,
    installationFrom: isDateOnlyString(search.installationFrom)
      ? search.installationFrom
      : undefined,
    installationTo: isDateOnlyString(search.installationTo) ? search.installationTo : undefined,
    sortBy: isDeviceSortKey(search.sortBy) ? search.sortBy : defaultDeviceSortKey,
    sortDirection: isDeviceSortDirection(search.sortDirection)
      ? search.sortDirection
      : defaultDeviceSortDirection,
  }),
  component: IndexPage,
});
