import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import "./index.css";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { router } from "./router.tsx";
import { queryClient } from "./trpc.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
