import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { rootRoute } from "./__root.tsx";
import { apiBaseUrl, trpc } from "../trpc.ts";

type HealthResponse = Awaited<ReturnType<typeof trpc.health.query>>;
type ConfigResponse = Awaited<ReturnType<typeof trpc.config.query>>;

async function loadBackendState(): Promise<{
  config: ConfigResponse;
  health: HealthResponse;
}> {
  const [health, config] = await Promise.all([trpc.health.query(), trpc.config.query()]);

  return {
    config,
    health,
  };
}

function IndexPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function checkBackend() {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await loadBackendState();
      setHealth(payload.health);
      setConfig(payload.config);
    } catch (caughtError) {
      setHealth(null);
      setConfig(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown backend error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void checkBackend();
  }, []);

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
                shadcn foundation is in place.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                The browser app now has the router, theme tokens, aliases, and the first shadcn
                components wired up so we can build the device table on a real UI foundation next.
              </p>
            </div>

            <Button onClick={() => void checkBackend()} className="rounded-full px-5">
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
                  {error}
                </code>
              </div>
            </CardContent>
          ) : null}

          {!isLoading && health ? (
            <CardContent className="grid gap-3 pt-0 sm:grid-cols-2 xl:grid-cols-3">
              <StatusCard label="API base URL" value={apiBaseUrl} />
              <StatusCard label="tRPC endpoint" value={`${apiBaseUrl}/trpc`} />
              <StatusCard label="Healthy" value={String(health.ok)} />
              <StatusCard label="Timestamp" value={health.timestamp} />
              <StatusCard
                label="API URL configured"
                value={String(config?.hasApiBaseUrl ?? false)}
              />
              <StatusCard
                label="API token configured"
                value={String(config?.hasApiToken ?? false)}
              />
            </CardContent>
          ) : null}
        </Card>
      </section>
    </main>
  );
}

function StatusCard(props: { label: string; value: string }) {
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
