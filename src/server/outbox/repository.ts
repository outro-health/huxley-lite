import { and, asc, desc, eq, inArray, lte } from "drizzle-orm"

import { db, schema } from "../db/client"
import type { OutboxEvent } from "../db/schema"

export type NewOutboxEvent = typeof schema.outboxEvents.$inferInsert

export const outboxRepository = {
  insert: async (event: NewOutboxEvent) => {
    const [row] = await db.insert(schema.outboxEvents).values(event).returning()
    if (!row) {
      throw new Error("Insert returned no row")
    }
    return row
  },

  getById: (id: string) =>
    db.query.outboxEvents
      .findFirst({ where: eq(schema.outboxEvents.id, id) })
      .then((row) => row ?? null),

  list: (limit = 100) =>
    db.query.outboxEvents.findMany({
      orderBy: [desc(schema.outboxEvents.createdAt)],
      limit,
      with: { patient: true, actor: true },
    }),

  /**
   * Take a batch of due events and mark them processing. Two steps, not
   * atomic: fine for one worker on one connection.
   */
  claimDue: async (now: Date, limit: number): Promise<OutboxEvent[]> => {
    const due = await db.query.outboxEvents.findMany({
      where: and(
        eq(schema.outboxEvents.status, "pending"),
        lte(schema.outboxEvents.nextAttemptAt, now),
      ),
      orderBy: [asc(schema.outboxEvents.createdAt)],
      limit,
    })
    if (due.length === 0) {
      return []
    }
    await db
      .update(schema.outboxEvents)
      .set({ status: "processing" })
      .where(
        inArray(
          schema.outboxEvents.id,
          due.map((e) => e.id),
        ),
      )
    return due
  },

  markDelivered: (id: string, attempts: number) =>
    db
      .update(schema.outboxEvents)
      .set({
        status: "delivered",
        attempts,
        deliveredAt: new Date(),
        lastError: null,
      })
      .where(eq(schema.outboxEvents.id, id)),

  markFailed: (input: {
    id: string
    attempts: number
    error: string
    nextAttemptAt: Date
    dead: boolean
  }) =>
    db
      .update(schema.outboxEvents)
      .set({
        status: input.dead ? "dead" : "pending",
        attempts: input.attempts,
        lastError: input.error,
        nextAttemptAt: input.nextAttemptAt,
      })
      .where(eq(schema.outboxEvents.id, input.id)),

  /** Put an event back on the queue regardless of its state. */
  requeue: (id: string) =>
    db
      .update(schema.outboxEvents)
      .set({ status: "pending", nextAttemptAt: new Date(), lastError: null })
      .where(eq(schema.outboxEvents.id, id)),
}
