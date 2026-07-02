import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DataTable } from "@/components/data-table.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { rootRoute } from "./__root.tsx";
import { apiBaseUrl, trpc } from "../trpc.ts";

type TablePreviewRow = {
  customer: string;
  location: string;
  deviceType: string;
  lifecycle: string;
  identifier: string;
  installationDate: string;
  onlineStatus: string;
};

type StatusCardProps = {
  label: string;
  value: string;
};

const tablePreviewRows: TablePreviewRow[] = [
  {
    customer: "Fam. Muster",
    location: "Tirol",
    deviceType: "GW5",
    lifecycle: "Verschickt",
    identifier: "GW5-002931 / A4:CF:12:AB:CD:EF",
    installationDate: "08 Jul 2026",
    onlineStatus: "Waiting for install",
  },
  {
    customer: "M. Berger",
    location: "Wien",
    deviceType: "Zero",
    lifecycle: "Online",
    identifier: "ZERO-009102 / 80:6D:97:33:4A:AA",
    installationDate: "01 Jul 2026",
    onlineStatus: "Online now",
  },
];

const tablePreviewColumns: ColumnDef<TablePreviewRow>[] = [
  {
    accessorKey: "customer",
    header: "Kunde",
  },
  {
    accessorKey: "location",
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
    accessorKey: "identifier",
    header: "Serial / MAC",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-foreground">{row.original.identifier}</span>
    ),
  },
  {
    accessorKey: "installationDate",
    header: "Installation",
  },
  {
    accessorKey: "onlineStatus",
    header: "Online",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.onlineStatus}</span>
    ),
  },
];

function IndexPage(): React.JSX.Element {
  const healthQuery = useQuery(trpc.health.queryOptions());
  const configQuery = useQuery(trpc.config.queryOptions());
  const isLoading = healthQuery.isLoading || configQuery.isLoading;
  const error = healthQuery.error ?? configQuery.error;

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
                Query is live. The table shell is ready.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                We now have the proper server-state layer in place and a reusable table component
                built on shadcn plus TanStack Table. The next step is swapping the preview rows for
                real device data and wiring filters into the backend query.
              </p>
            </div>

            <Button
              onClick={() => {
                void Promise.all([healthQuery.refetch(), configQuery.refetch()]);
              }}
              className="rounded-full px-5"
            >
              Retry check
            </Button>
          </div>
        </div>

        <Card className="rounded-[1.5rem] border-border bg-secondary shadow-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Backend status</CardTitle>
              <CardDescription>Current browser-to-backend smoke test.</CardDescription>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full px-3 py-1 uppercase tracking-[0.18em] text-primary"
            >
              shadcn live
            </Badge>
          </CardHeader>

          {isLoading ? (
            <CardContent className="pt-0">
              <p className="rounded-2xl border border-dashed border-border bg-background/80 px-4 py-6 text-sm text-muted-foreground">
                Checking <code className="font-mono text-foreground">trpc.health</code> and{" "}
                <code className="font-mono text-foreground">trpc.config</code>...
              </p>
            </CardContent>
          ) : null}

          {!isLoading && error ? (
            <CardContent className="pt-0">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <p className="font-medium">Connection failed.</p>
                <code className="mt-2 block overflow-x-auto rounded-xl bg-white/80 p-3 font-mono text-xs text-red-700">
                  {error.message}
                </code>
              </div>
            </CardContent>
          ) : null}

          {!isLoading && healthQuery.data && configQuery.data ? (
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-3">
              <StatusCard label="API base URL" value={apiBaseUrl} />
              <StatusCard label="tRPC endpoint" value={`${apiBaseUrl}/trpc`} />
              <StatusCard label="Healthy" value={String(healthQuery.data.ok)} />
              <StatusCard label="Timestamp" value={healthQuery.data.timestamp} />
              <StatusCard
                label="API URL configured"
                value={String(configQuery.data.hasApiBaseUrl)}
              />
              <StatusCard
                label="API token configured"
                value={String(configQuery.data.hasApiToken)}
              />
            </CardContent>
          ) : null}
        </Card>

        <Card className="rounded-[1.5rem] border-border bg-card shadow-none">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">Device table foundation</CardTitle>
              <CardDescription>
                Reusable data-table shell with the target MVP columns already modeled.
              </CardDescription>
            </div>
            <Badge className="rounded-full px-3 py-1 uppercase tracking-[0.18em]">
              table preview
            </Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable columns={tablePreviewColumns} data={tablePreviewRows} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function StatusCard(props: StatusCardProps): React.JSX.Element {
  return (
    <Card className="rounded-2xl border-border bg-background shadow-none">
      <CardHeader className="gap-1 pb-2">
        <CardDescription className="text-[0.72rem] font-semibold uppercase tracking-[0.18em]">
          {props.label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="break-all text-sm font-medium text-foreground">{props.value}</p>
      </CardContent>
    </Card>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
