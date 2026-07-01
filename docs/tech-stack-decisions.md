# Tech Stack Decisions

## Chosen Stack

- `pnpm` workspace monorepo
- `packages/browser`: React + Vite + TypeScript
- `packages/node`: Node.js + Express + tRPC + TypeScript
- `packages/common`: shared types, schemas, and domain constants
- TanStack Query for server state fetching, caching, invalidation, and mutations
- TanStack Table for the device list
- Prisma ORM
- SQLite as the local application database

## Why These Choices

### Monorepo

We want one repository with a frontend, backend, and shared package so type-sharing stays easy and setup stays simple for a small case study.

### React + Vite

This matches the company context, is fast to scaffold, and keeps the frontend modern without adding unnecessary complexity.

### tRPC + Express

We want end-to-end type safety between frontend and backend. tRPC gives us that with very good TypeScript ergonomics, and Express is a familiar, lightweight HTTP layer without introducing more framework opinions than we need.

### TanStack Query

This app is mostly a server-state application. Device lists, KPIs, details, and mutations all map naturally to queries and invalidations, so TanStack Query is a better fit than a custom client-side state architecture.

### TanStack Table

The core UI is an operational device table with filtering, searching, and sorting, so TanStack Table is a natural fit and already familiar.

### Prisma + SQLite

The case explicitly asks for our own backend and database layer. SQLite keeps setup lightweight and easy to run locally, while Prisma gives us a readable schema, migrations, and a productive developer experience.

## State Strategy

- Server state lives in the backend and is consumed in the frontend via tRPC + TanStack Query.
- Client state stays minimal and local to React components.
- We do not plan to add Zustand or websocket subscriptions initially.
- If we want fresher online status later, polling is likely enough for this case study.

## Current Repo Shape

- `packages/browser`
- `packages/node`
- `packages/common`
