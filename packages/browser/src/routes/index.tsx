import { startTransition, useDeferredValue, useEffect, useState, type JSX } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { DeviceDetailSheet } from "@/components/device-detail-sheet.tsx";
import { DataTable } from "@/components/data-table.tsx";
import {
  getGuidedLifecycleAdvance,
  toDeviceTableRows,
  type DeviceListItem,
  type DeviceTableRow,
} from "@/devices.ts";
import { lifecycleOptions } from "@/lifecycles.ts";
import { rootRoute } from "./__root.tsx";
import { trpc } from "../trpc.ts";

const allFilterValue = "all";
const installationDueFilterValue = "due";
const installationDueLabel = "Installation steht an";
const installationDueHint = "Installationen, die diese oder die nächste Woche geplant sind.";

const onlineIndicatorClassNameByTone: Record<DeviceTableRow["onlineTone"], string> = {
  neutral: "size-2.5 rounded-full bg-muted-foreground/35",
  positive: "size-2.5 rounded-full bg-primary",
  warning: "size-2.5 rounded-full bg-amber-500",
  danger: "size-2.5 rounded-full bg-red-500",
};

function toQueryFilterValue(value: string): string {
  return value === allFilterValue ? "" : value;
}

function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: indexRoute.id });
  const queryClient = useQueryClient();
  const { deviceId, deviceType, installationDue, lifecycle, search } = indexRoute.useSearch();
  const [searchInput, setSearchInput] = useState(search);
  const [selectedLifecycleFilter, setSelectedLifecycleFilter] = useState(lifecycle);
  const [selectedDeviceTypeFilter, setSelectedDeviceTypeFilter] = useState(deviceType);
  const [selectedInstallationDueFilter, setSelectedInstallationDueFilter] =
    useState(installationDue);
  const deferredSearch = useDeferredValue(searchInput);
  const trimmedSearch = deferredSearch.trim();
  const selectedLifecycle = toQueryFilterValue(selectedLifecycleFilter);
  const selectedDeviceType = toQueryFilterValue(selectedDeviceTypeFilter);
  const hasInstallationDueFilter = selectedInstallationDueFilter === installationDueFilterValue;

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    setSelectedLifecycleFilter(lifecycle);
  }, [lifecycle]);

  useEffect(() => {
    setSelectedDeviceTypeFilter(deviceType);
  }, [deviceType]);

  useEffect(() => {
    setSelectedInstallationDueFilter(installationDue);
  }, [installationDue]);

  useEffect(() => {
    const normalizedSearch = searchInput;
    const normalizedLifecycle = selectedLifecycleFilter;
    const normalizedDeviceType = selectedDeviceTypeFilter;
    const normalizedInstallationDue = selectedInstallationDueFilter;

    if (
      normalizedSearch === search &&
      normalizedLifecycle === lifecycle &&
      normalizedDeviceType === deviceType &&
      normalizedInstallationDue === installationDue
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        void navigate({
          search: (previous) => ({
            ...previous,
            search: normalizedSearch,
            lifecycle: normalizedLifecycle,
            deviceType: normalizedDeviceType,
            installationDue: normalizedInstallationDue,
          }),
          replace: true,
        });
      });
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    installationDue,
    deviceType,
    lifecycle,
    navigate,
    search,
    searchInput,
    selectedDeviceTypeFilter,
    selectedInstallationDueFilter,
    selectedLifecycleFilter,
  ]);

  const devicesQuery = useQuery(
    trpc.devices.list.queryOptions({
      search: trimmedSearch,
      lifecycle: selectedLifecycle,
      deviceType: selectedDeviceType,
      installationDue: hasInstallationDueFilter,
    }),
  );
  const kpisQuery = useQuery(
    trpc.devices.kpis.queryOptions({
      search: trimmedSearch,
      deviceType: selectedDeviceType,
      installationDue: hasInstallationDueFilter,
    }),
  );
  const deviceTypesQuery = useQuery(trpc.devices.deviceTypes.queryOptions());
  const selectedDeviceQuery = useQuery({
    ...trpc.devices.byId.queryOptions({ id: deviceId ?? "" }),
    enabled: Boolean(deviceId),
  });
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
  const deviceRows = devicesQuery.data ? toDeviceTableRows(devicesQuery.data) : [];
  const deviceTypeOptions = deviceTypesQuery.data ?? [];
  const selectedDevice = selectedDeviceQuery.data as DeviceListItem | undefined;
  const deviceColumns: ColumnDef<DeviceTableRow>[] = [
    {
      accessorKey: "customerName",
      header: "Kunde",
      cell: ({ row }) => <p className="font-medium text-foreground">{row.original.customerName}</p>,
    },
    {
      accessorKey: "customerState",
      header: "Ort",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.customerState}</span>
      ),
    },
    {
      accessorKey: "deviceType",
      header: "Gerätetyp",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.deviceType}</span>
      ),
    },
    {
      accessorKey: "lifecycle",
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
                <TooltipContent side="top">Weiter zu {guidedAdvance.nextLifecycle}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "identifier",
      header: "Serial / MAC",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="font-mono text-xs text-foreground">
            {row.original.serialNumber ?? "No serial"}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.original.macAddress ?? "No MAC"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "installationDateLabel",
      header: "Installation",
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.original.installationDateLabel}</span>
      ),
    },
    {
      accessorKey: "onlineLabel",
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
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#fafaf5_100%)]">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="text-4xl leading-none">⚡</div>
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
              Optima Device Fleet Manager
            </h1>
          </div>

          <Button
            onClick={() => {
              void Promise.all([
                devicesQuery.refetch(),
                kpisQuery.refetch(),
                deviceTypesQuery.refetch(),
              ]);
            }}
            className="rounded-full px-5"
          >
            Refresh
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-[1.75rem] border border-border/90 bg-background/96 shadow-[0_24px_80px_rgba(16,31,22,0.06)]">
          <div className="border-b border-border/80 bg-[#f7f8f1] px-5 py-4">
            {kpisQuery.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading fleet summary...</div>
            ) : null}

            {!kpisQuery.isLoading && kpisQuery.error ? (
              <div className="text-sm text-red-700">Could not load fleet summary.</div>
            ) : null}

            {!kpisQuery.isLoading && !kpisQuery.error && kpisQuery.data ? (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9">
                {kpisQuery.data.lifecycleCounts.map((item) => {
                  const isActive = selectedLifecycle === item.lifecycle;

                  return (
                    <button
                      key={item.lifecycle}
                      type="button"
                      onClick={() => {
                        setSelectedLifecycleFilter(isActive ? allFilterValue : item.lifecycle);
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
                        setSelectedInstallationDueFilter(
                          hasInstallationDueFilter ? allFilterValue : installationDueFilterValue,
                        );
                      }}
                      className={[
                        "rounded-[1.15rem] border px-4 py-3 text-left transition-colors",
                        hasInstallationDueFilter
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(22,166,55,0.2)]"
                          : "border-border/80 bg-background hover:border-primary/40 hover:bg-white",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "text-[0.66rem] font-semibold uppercase tracking-[0.22em]",
                          hasInstallationDueFilter
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {installationDueLabel}
                      </p>
                      <p
                        className={[
                          "mt-2 text-2xl font-semibold",
                          hasInstallationDueFilter ? "text-primary-foreground" : "text-foreground",
                        ].join(" ")}
                      >
                        {kpisQuery.data.installationDueCount}
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
              <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.9fr)_240px_240px]">
                <label className="space-y-2">
                  <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Search
                  </span>
                  <Input
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                    }}
                    placeholder="Customer, serial or MAC"
                    aria-label="Search customer, serial or MAC"
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
                    }}
                  >
                    <SelectTrigger
                      className="h-11 w-full rounded-xl border-border/80 bg-background px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                      aria-label="Filter by lifecycle"
                    >
                      <SelectValue placeholder="All lifecycles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={allFilterValue}>All lifecycles</SelectItem>
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
                    Device type
                  </span>
                  <Select
                    value={selectedDeviceTypeFilter}
                    onValueChange={(value) => {
                      setSelectedDeviceTypeFilter(value);
                    }}
                  >
                    <SelectTrigger
                      className="h-11 w-full rounded-xl border-border/80 bg-background px-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                      aria-label="Filter by device type"
                    >
                      <SelectValue placeholder="All device types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={allFilterValue}>All device types</SelectItem>
                      {deviceTypeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="flex items-center justify-end gap-4 pt-1">
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-border/80 bg-background px-4"
                  onClick={() => {
                    setSearchInput("");
                    setSelectedLifecycleFilter(allFilterValue);
                    setSelectedDeviceTypeFilter(allFilterValue);
                    setSelectedInstallationDueFilter(allFilterValue);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {devicesQuery.isLoading ? (
            <div className="px-5 py-16 text-sm text-muted-foreground">Loading device fleet...</div>
          ) : null}

          {!devicesQuery.isLoading && devicesQuery.error ? (
            <div className="px-5 py-8">
              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                <p className="font-medium">Could not load devices.</p>
                <code className="mt-2 block overflow-x-auto rounded-xl bg-white/80 p-3 font-mono text-xs text-red-700">
                  {devicesQuery.error.message}
                </code>
              </div>
            </div>
          ) : null}

          {!devicesQuery.isLoading && !devicesQuery.error ? (
            <DataTable
              columns={deviceColumns}
              data={deviceRows}
              emptyMessage="No devices found."
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
    installationDue:
      search.installationDue === installationDueFilterValue
        ? installationDueFilterValue
        : allFilterValue,
  }),
  component: IndexPage,
});
