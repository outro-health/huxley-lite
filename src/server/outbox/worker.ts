import type { OutboxEvent } from "../db/schema"
import { type AppError, type AppResultAsync, ok } from "../lib/result"
import { handlersFor } from "./handlers"
import { outboxRepository } from "./repository"

// Delivers outbox events to their handlers. An event is marked delivered once
// every handler has succeeded; anything that fails is retried with backoff
// until maxAttempts, then parked as dead.

const BATCH_SIZE = 20
const backoffMs = (attempt: number) => Math.min(30_000, 500 * 2 ** attempt)

const log = (message: string) => console.log(`[outbox] ${message}`)

/** Run every handler for one event, in order. Stops at the first failure. */
export const deliverEvent = (event: OutboxEvent): AppResultAsync<void> => {
  const handlers = handlersFor(event.type)
  let chain: AppResultAsync<void> = ok(
    undefined,
  ) as unknown as AppResultAsync<void>
  for (const handler of handlers) {
    chain = chain.andThen(() => handler.handle(event).map(() => undefined))
  }
  return chain
}

const attemptDelivery = async (
  event: OutboxEvent,
  now: Date,
): Promise<{ ok: true } | { ok: false; error: AppError }> => {
  const result = await deliverEvent(event)
  if (result.isErr()) {
    return { ok: false, error: result.error }
  }
  void now
  return { ok: true }
}

export type ProcessSummary = {
  claimed: number
  delivered: number
  failed: number
  dead: number
}

/** One pass over due events. Returns what happened, for logs and tests. */
export const processOnce = async (
  now = new Date(),
): Promise<ProcessSummary> => {
  const claimed = await outboxRepository.claimDue(now, BATCH_SIZE)
  const summary: ProcessSummary = {
    claimed: claimed.length,
    delivered: 0,
    failed: 0,
    dead: 0,
  }

  for (const event of claimed) {
    const attempts = event.attempts + 1
    const outcome = await attemptDelivery(event, now)
    if (outcome.ok) {
      await outboxRepository.markDelivered(event.id, attempts)
      summary.delivered += 1
      continue
    }
    const dead = attempts >= event.maxAttempts
    await outboxRepository.markFailed({
      id: event.id,
      attempts,
      error: outcome.error.message,
      nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
      dead,
    })
    if (dead) {
      summary.dead += 1
      log(
        `DEAD ${event.type} ${event.id} after ${attempts} attempts: ${outcome.error.message}`,
      )
    } else {
      summary.failed += 1
      log(
        `retry ${event.type} ${event.id} (attempt ${attempts}): ${outcome.error.message}`,
      )
    }
  }
  return summary
}

/** Poll forever. Returns a stop function. */
export const startWorker = (intervalMs = 1000) => {
  let running = false
  const timer = setInterval(async () => {
    if (running) {
      return
    }
    running = true
    try {
      const summary = await processOnce()
      if (summary.claimed > 0) {
        log(
          `delivered ${summary.delivered}, retrying ${summary.failed}, dead ${summary.dead}`,
        )
      }
    } catch (error) {
      console.error("[outbox] worker pass failed", error)
    } finally {
      running = false
    }
  }, intervalMs)
  return () => clearInterval(timer)
}
