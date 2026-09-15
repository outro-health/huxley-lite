import type { AppRouter } from "@server/router"
import { QueryClient } from "@tanstack/react-query"
import { createTRPCReact, httpBatchLink } from "@trpc/react-query"
import type { inferRouterOutputs } from "@trpc/server"
import SuperJSON from "superjson"
import { getClinicianId } from "./clinician"

export const api = createTRPCReact<AppRouter>()

export type RouterOutputs = inferRouterOutputs<AppRouter>

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 5_000 },
  },
})

export const trpcClient = api.createClient({
  links: [
    httpBatchLink({
      url: "/trpc",
      transformer: SuperJSON,
      headers: () => ({ "x-clinician-id": getClinicianId() }),
    }),
  ],
})
