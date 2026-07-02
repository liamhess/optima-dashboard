import { createRouter } from "@tanstack/react-router";
import { indexRoute } from "./routes/index.tsx";
import { rootRoute } from "./routes/__root.tsx";

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
