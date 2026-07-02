import { Outlet, createRootRoute } from "@tanstack/react-router";

function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <Outlet />
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
