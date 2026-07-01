import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../node/src/router/index.ts";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/trpc`,
    }),
  ],
});
