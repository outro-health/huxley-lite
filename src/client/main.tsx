import { QueryClientProvider } from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Toaster } from "sonner"

import "./index.css"
import { api, queryClient, trpcClient } from "./lib/api"
import { ClinicianProvider } from "./lib/clinician"
import { routeTree } from "./routeTree.gen"

const router = createRouter({ routeTree, defaultPreload: "intent" })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClinicianProvider>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster position="bottom-right" richColors closeButton />
        </QueryClientProvider>
      </api.Provider>
    </ClinicianProvider>
  </StrictMode>,
)
