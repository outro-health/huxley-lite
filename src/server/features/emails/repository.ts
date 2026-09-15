import { desc, eq } from "drizzle-orm"

import { db, schema } from "../../db/client"
import type { EmailStatus } from "../../db/schema"

export type NewEmail = typeof schema.emails.$inferInsert

export const emailsRepository = {
  insert: async (email: NewEmail) => {
    const [row] = await db.insert(schema.emails).values(email).returning()
    if (!row) {
      throw new Error("Insert returned no row")
    }
    return row
  },

  getByProviderMessageId: (providerMessageId: string) =>
    db.query.emails
      .findFirst({
        where: eq(schema.emails.providerMessageId, providerMessageId),
      })
      .then((row) => row ?? null),

  setStatus: (input: {
    id: string
    status: EmailStatus
    detail: string | null
    updatedAt: Date
  }) =>
    db
      .update(schema.emails)
      .set({
        status: input.status,
        statusDetail: input.detail,
        statusUpdatedAt: input.updatedAt,
      })
      .where(eq(schema.emails.id, input.id)),

  listQueued: () =>
    db.query.emails.findMany({ where: eq(schema.emails.status, "queued") }),

  listForPatient: (patientId: string) =>
    db.query.emails.findMany({
      where: eq(schema.emails.patientId, patientId),
      orderBy: [desc(schema.emails.createdAt)],
      with: { sentBy: true },
    }),
}
