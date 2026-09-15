import type { OutboxEvent } from "../db/schema"
import { type AppResultAsync, fromPromise } from "../lib/result"
import type { EventType } from "./eventTypes"
import { outboxRepository } from "./repository"

export type EnqueueEventInput = {
  type: EventType
  patientId: string | null
  actorClinicianId: string | null
  payload: Record<string, unknown>
}

/**
 * Write a domain event to the outbox. The worker (worker.ts) delivers it to
 * handlers shortly after. Nothing happens synchronously here.
 */
export const enqueueEvent = (
  input: EnqueueEventInput,
): AppResultAsync<OutboxEvent> =>
  fromPromise(
    outboxRepository.insert(input),
    "INTEGRATION_FAILED",
    "Could not enqueue event",
  )
