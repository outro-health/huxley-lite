import { initTRPC, TRPCError } from "@trpc/server"
import SuperJSON from "superjson"

import type { Context } from "./context"
import type { AppError, AppErrorCode, AppResultAsync } from "./lib/result"

const t = initTRPC.context<Context>().create({ transformer: SuperJSON })

export const router = t.router
export const publicProcedure = t.procedure

/** Requires an acting clinician (the x-clinician-id header). */
export const clinicianProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.clinician) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No acting clinician. Pick one in the sidebar.",
    })
  }
  return next({ ctx: { ...ctx, clinician: ctx.clinician } })
})

const trpcCodeFor: Record<AppErrorCode, TRPCError["code"]> = {
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "BAD_REQUEST",
  INVALID_STATE: "PRECONDITION_FAILED",
  INTEGRATION_FAILED: "INTERNAL_SERVER_ERROR",
}

const toTRPCError = (error: AppError) =>
  new TRPCError({ code: trpcCodeFor[error.code], message: error.message })

/**
 * The boundary between services (which return Results) and tRPC (which
 * throws). Routers call `unwrap(service(...))` and nothing else.
 */
export async function unwrap<T>(result: AppResultAsync<T>): Promise<T> {
  const resolved = await result
  if (resolved.isErr()) {
    throw toTRPCError(resolved.error)
  }
  return resolved.value
}

unwrap.notFound = (what: string, id: string) =>
  toTRPCError({ code: "NOT_FOUND", message: `${what} ${id} not found` })
