import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DataTable } from "@/components/data-table.tsx";
import { toDeviceTableRows, type DeviceTableRow } from "@/devices.ts";
import { rootRoute } from "./__root.tsx";
import { trpc } from "../trpc.ts";

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
    cell: ({ row }) => (
      <Badge
        variant="secondary"
        className="rounded-full border border-border/60 bg-secondary px-3 py-1 text-foreground"
      >
        {row.original.lifecycle}
      </Badge>
    ),
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

const onlineIndicatorClassNameByTone: Record<DeviceTableRow["onlineTone"], string> = {
  neutral: "size-2.5 rounded-full bg-muted-foreground/35",
  positive: "size-2.5 rounded-full bg-primary",
  warning: "size-2.5 rounded-full bg-amber-500",
  danger: "size-2.5 rounded-full bg-red-500",
};

function IndexPage(): React.JSX.Element {
  const devicesQuery = useQuery(trpc.devices.list.queryOptions());
  const deviceRows = devicesQuery.data ? toDeviceTableRows(devicesQuery.data) : [];

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
              void devicesQuery.refetch();
            }}
            className="rounded-full px-5"
          >
            Refresh
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1680px] flex-col gap-6 px-4 py-5 sm:px-6">
        <section className="overflow-hidden rounded-[1.75rem] border border-border/90 bg-background/96 shadow-[0_24px_80px_rgba(16,31,22,0.06)]">
          <div className="px-5 py-4">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Device Registry
              </p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">Fleet table</h2>
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
            <DataTable columns={deviceColumns} data={deviceRows} emptyMessage="No devices found." />
          ) : null}
        </section>
      </section>
    </main>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
