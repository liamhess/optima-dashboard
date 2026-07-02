import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DataTable } from "@/components/data-table.tsx";
import { toDeviceTableRows, type DeviceTableRow } from "@/devices.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { rootRoute } from "./__root.tsx";
import { trpc } from "../trpc.ts";

const deviceColumns: ColumnDef<DeviceTableRow>[] = [
  {
    accessorKey: "customerName",
    header: "Kunde",
  },
  {
    accessorKey: "customerState",
    header: "Ort",
  },
  {
    accessorKey: "deviceType",
    header: "Gerätetyp",
  },
  {
    accessorKey: "lifecycle",
    header: "Lifecycle",
    cell: ({ row }) => (
      <Badge variant="secondary" className="rounded-full px-3 py-1 text-foreground">
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
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-[2rem] border border-border/80 bg-card/95 p-6 shadow-[0_24px_90px_rgba(18,33,24,0.08)] backdrop-blur md:p-10">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Optima Dashboard
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl">
                Real device data is flowing through now.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                The table is now backed by the merged device read model. Next we can add search and
                structured filters on top without reworking the foundation.
              </p>
            </div>

            <Button
              onClick={() => {
                void devicesQuery.refetch();
              }}
              className="rounded-full px-5"
            >
              Refresh devices
            </Button>
          </div>
        </div>

        <Card className="rounded-[1.5rem] border-border bg-card shadow-none">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Devices</CardTitle>
              <CardDescription>
                Live data from <code className="font-mono text-foreground">trpc.devices.list</code>.
              </CardDescription>
            </div>
            <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
              {devicesQuery.data ? `${devicesQuery.data.length} devices` : "live query"}
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {devicesQuery.isLoading ? (
              <div className="rounded-[1.5rem] border border-dashed border-border bg-secondary/40 px-4 py-10 text-sm text-muted-foreground">
                Loading device fleet...
              </div>
            ) : null}

            {!devicesQuery.isLoading && devicesQuery.error ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                <p className="font-medium">Could not load devices.</p>
                <code className="mt-2 block overflow-x-auto rounded-xl bg-white/80 p-3 font-mono text-xs text-red-700">
                  {devicesQuery.error.message}
                </code>
              </div>
            ) : null}

            {!devicesQuery.isLoading && !devicesQuery.error ? (
              <DataTable
                columns={deviceColumns}
                data={deviceRows}
                emptyMessage="No devices found."
              />
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
