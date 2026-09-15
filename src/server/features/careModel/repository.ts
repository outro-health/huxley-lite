import { and, desc, eq, isNull } from "drizzle-orm"

import { db, schema } from "../../db/client"
import type { CareStage } from "../../db/schema"

export type NewTransition = typeof schema.stageTransitions.$inferInsert

export const careModelRepository = {
  getActiveEnrollment: (patientId: string) =>
    db.query.careModelEnrollments
      .findFirst({
        where: and(
          eq(schema.careModelEnrollments.patientId, patientId),
          isNull(schema.careModelEnrollments.endedAt),
        ),
      })
      .then((row) => row ?? null),

  getEnrollmentById: (id: string) =>
    db.query.careModelEnrollments
      .findFirst({ where: eq(schema.careModelEnrollments.id, id) })
      .then((row) => row ?? null),

  createEnrollment: async (patientId: string, stage: CareStage) => {
    const [row] = await db
      .insert(schema.careModelEnrollments)
      .values({ patientId, stage })
      .returning()
    if (!row) {
      throw new Error("Insert returned no row")
    }
    return row
  },

  endEnrollment: (enrollmentId: string) =>
    db
      .update(schema.careModelEnrollments)
      .set({ endedAt: new Date() })
      .where(eq(schema.careModelEnrollments.id, enrollmentId)),

  setEnrollmentStage: (enrollmentId: string, stage: CareStage) =>
    db
      .update(schema.careModelEnrollments)
      .set({ stage })
      .where(eq(schema.careModelEnrollments.id, enrollmentId)),

  recordEligibilityDecision: (input: {
    enrollmentId: string
    note: string | null
    decidedByClinicianId: string
  }) =>
    db
      .update(schema.careModelEnrollments)
      .set({
        eligibilityNote: input.note,
        eligibilityDecidedAt: new Date(),
        eligibilityDecidedByClinicianId: input.decidedByClinicianId,
      })
      .where(eq(schema.careModelEnrollments.id, input.enrollmentId)),

  insertTransition: async (transition: NewTransition) => {
    const [row] = await db
      .insert(schema.stageTransitions)
      .values(transition)
      .returning()
    if (!row) {
      throw new Error("Insert returned no row")
    }
    return row
  },

  getTransitionById: (id: string) =>
    db.query.stageTransitions
      .findFirst({ where: eq(schema.stageTransitions.id, id) })
      .then((row) => row ?? null),

  listTransitionsForPatient: (patientId: string) =>
    db.query.stageTransitions.findMany({
      where: eq(schema.stageTransitions.patientId, patientId),
      orderBy: [desc(schema.stageTransitions.createdAt)],
      with: { actor: true },
    }),
}
