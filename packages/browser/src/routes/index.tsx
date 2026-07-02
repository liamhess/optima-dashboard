import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-[2rem] border border-line/70 bg-surface-strong/90 p-6 shadow-[0_24px_90px_rgba(18,33,24,0.08)] backdrop-blur md:p-10">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Optima Dashboard
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="max-w-[12ch] text-4xl font-semibold tracking-[-0.06em] text-ink sm:text-6xl">
                Router foundation is in place.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
                This page now lives on the index route, which gives us a clean base for shadcn
                components and the upcoming device table flow.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void checkBackend()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary/20"
            >
              Retry check
            </button>
          </div>
        </div>

        <div className="grid gap-4 rounded-[1.5rem] border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Backend status</h2>
              <p className="text-sm text-ink-muted">Current browser-to-backend smoke test.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Router live
            </span>
          </div>

          {isLoading ? (
            <p className="rounded-2xl border border-dashed border-line bg-white/70 px-4 py-6 text-sm text-ink-muted">
              Checking <code className="font-mono text-ink">trpc.health</code> and{" "}
              <code className="font-mono text-ink">trpc.config</code>...
            </p>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-2xl border border-red-200 bg-danger-soft px-4 py-4 text-sm text-red-700">
              <p className="font-medium">Connection failed.</p>
              <code className="mt-2 block overflow-x-auto rounded-xl bg-white/80 p-3 font-mono text-xs text-red-700">
                {error}
              </code>
            </div>
          ) : null}

          {!isLoading && health ? (
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  API base URL
                </dt>
                <dd className="mt-2 break-all text-sm font-medium text-ink">{apiBaseUrl}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  tRPC endpoint
                </dt>
                <dd className="mt-2 break-all text-sm font-medium text-ink">{`${apiBaseUrl}/trpc`}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Healthy
                </dt>
                <dd className="mt-2 text-sm font-medium text-ink">{String(health.ok)}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Timestamp
                </dt>
                <dd className="mt-2 text-sm font-medium text-ink">{health.timestamp}</dd>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  API URL configured
                </dt>
                <dd className="mt-2 text-sm font-medium text-ink">
                  {String(config?.hasApiBaseUrl ?? false)}
                </dd>
              </div>
              <div className="rounded-2xl border border-line bg-white px-4 py-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  API token configured
                </dt>
                <dd className="mt-2 text-sm font-medium text-ink">
                  {String(config?.hasApiToken ?? false)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});
