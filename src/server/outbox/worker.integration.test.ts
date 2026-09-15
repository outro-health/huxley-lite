import { afterEach, describe, expect, it, vi } from "vitest"

import { appError, errAsync, okAsync } from "../lib/result"
import { enqueueEvent } from "./enqueue"
import * as handlers from "./handlers"
import { outboxRepository } from "./repository"
import { processOnce } from "./worker"

// These tests pin the delivery guarantees the rest of the system relies on.
// Handlers are stubbed so only the worker is under test.

const stubHandlers = (handle: handlers.EventHandler["handle"]) =>
  vi
    .spyOn(handlers, "handlersFor")
    .mockImplementation(() => [{ name: "stub", handle }])

afterEach(() => {
  vi.restoreAllMocks()
})

describe("processOnce", () => {
  it("delivers pending events and marks them delivered", async () => {
    const handle = vi.fn(() => okAsync(undefined))
    stubHandlers(handle)
    const event = (
      await enqueueEvent({
        type: "appointment.flagged",
        patientId: null,
        actorClinicianId: null,
        payload: {},
      })
    )._unsafeUnwrap()

    const summary = await processOnce()

    expect(summary).toMatchObject({ claimed: 1, delivered: 1 })
    expect(handle).toHaveBeenCalledTimes(1)
    const stored = await outboxRepository.getById(event.id)
    expect(stored?.status).toBe("delivered")
    expect(stored?.attempts).toBe(1)
  })

  it("retries a failed delivery with backoff and parks it after maxAttempts", async () => {
    stubHandlers(() => errAsync(appError("INTEGRATION_FAILED", "boom")))
    const event = (
      await enqueueEvent({
        type: "appointment.flagged",
        patientId: null,
        actorClinicianId: null,
        payload: {},
      })
    )._unsafeUnwrap()

    const first = await processOnce()
    expect(first).toMatchObject({ claimed: 1, failed: 1 })
    let stored = await outboxRepository.getById(event.id)
    expect(stored?.status).toBe("pending")
    expect(stored?.attempts).toBe(1)
    expect(stored?.lastError).toContain("boom")
    expect(stored!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now())

    // Not due yet: a pass right now does nothing.
    expect((await processOnce()).claimed).toBe(0)

    // Fast-forward through the remaining attempts.
    for (let i = 2; i <= event.maxAttempts; i += 1) {
      await processOnce(new Date(Date.now() + 60_000 * i))
    }
    stored = await outboxRepository.getById(event.id)
    expect(stored?.status).toBe("dead")
    expect(stored?.attempts).toBe(event.maxAttempts)
  })

  it("a requeued event is delivered to its handlers again", async () => {
    const handle = vi.fn(() => okAsync(undefined))
    stubHandlers(handle)
    const event = (
      await enqueueEvent({
        type: "appointment.flagged",
        patientId: null,
        actorClinicianId: null,
        payload: {},
      })
    )._unsafeUnwrap()
    await processOnce()
    await outboxRepository.requeue(event.id)
    await processOnce()
    expect(handle).toHaveBeenCalledTimes(2)
  })
})
