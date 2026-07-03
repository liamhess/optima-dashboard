# ⚡Optima Geräteflotte

## Local Dev

```bash
pnpm install
cp .env.example .env
```

Fill `OPTIMA_API_BASE_URL` and `OPTIMA_API_TOKEN` in `.env`, then initialize the local SQLite database:

```bash
pnpm --filter @optima/node prisma:migrate
pnpm dev
```

The backend runs on `http://localhost:4000`; the Vite frontend uses `VITE_API_BASE_URL` from `.env`.

