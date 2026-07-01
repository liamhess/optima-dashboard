import { useEffect, useState } from "react";
import { apiBaseUrl, trpc } from "./trpc.ts";

type HealthResponse = Awaited<ReturnType<typeof trpc.health.query>>;
type ConfigResponse = Awaited<ReturnType<typeof trpc.config.query>>;

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function checkBackend() {
    setIsLoading(true);
    setError(null);

    try {
      const [healthPayload, configPayload] = await Promise.all([
        trpc.health.query(),
        trpc.config.query(),
      ]);

      setHealth(healthPayload);
      setConfig(configPayload);
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
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Optima Dashboard</p>
        <h1>Frontend-backend smoke check</h1>
        <p className="intro">
          This page calls the Node backend via tRPC using the configured API base URL. If this
          works, our local browser-to-backend connection is healthy and we can start wiring real app
          data next.
        </p>
        <div className="status-card">
          <div className="status-header">
            <h2>Backend status</h2>
            <button type="button" onClick={() => void checkBackend()}>
              Retry
            </button>
          </div>

          {isLoading ? (
            <p className="status-loading">Checking `trpc.health` and `trpc.config`...</p>
          ) : null}

          {!isLoading && error ? (
            <div className="status-error">
              <p>Connection failed.</p>
              <code>{error}</code>
            </div>
          ) : null}

          {!isLoading && health ? (
            <div className="status-success">
              <p>Backend responded successfully.</p>
              <dl className="status-grid">
                <div>
                  <dt>API base URL</dt>
                  <dd>{apiBaseUrl}</dd>
                </div>
                <div>
                  <dt>tRPC endpoint</dt>
                  <dd>{`${apiBaseUrl}/trpc`}</dd>
                </div>
                <div>
                  <dt>Healthy</dt>
                  <dd>{String(health.ok)}</dd>
                </div>
                <div>
                  <dt>Timestamp</dt>
                  <dd>{health.timestamp}</dd>
                </div>
                <div>
                  <dt>API URL configured</dt>
                  <dd>{String(config?.hasApiBaseUrl ?? false)}</dd>
                </div>
                <div>
                  <dt>API token configured</dt>
                  <dd>{String(config?.hasApiToken ?? false)}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
