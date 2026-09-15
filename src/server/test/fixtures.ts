import { addDays } from "date-fns"

import { db, schema } from "../db/client"
import type { CareStage } from "../db/schema"

// Small factories for integration tests. Each test file has its own empty
// database, so ids are fresh every time.

let counter = 0
const next = () => (counter += 1)

export const createClinician = async (
  overrides: Partial<typeof schema.clinicians.$inferInsert> = {},
) => {
  const n = next()
  const [row] = await db
    .insert(schema.clinicians)
    .values({
      name: `Dr. Test ${n}`,
      email: `clinician${n}@example.com`,
      role: "clinician",
      ...overrides,
    })
    .returning()
  return row!
}

export const createPatient = async (
  input: { stage?: CareStage; primaryClinicianId?: string | null } & Partial<
    typeof schema.patients.$inferInsert
  > = {},
) => {
  const { stage = "decision_pending", ...overrides } = input
  const n = next()
  const [patient] = await db
    .insert(schema.patients)
    .values({
      firstName: "Ana",
      lastName: `Alvarez${n}`,
      email: `ana${n}@example.com`,
      state: "CA",
      dateOfBirth: "1988-03-14",
      medicationName: "Sertraline",
      medicationDose: "100mg daily",
      ...overrides,
    })
    .returning()
  const [enrollment] = await db
    .insert(schema.careModelEnrollments)
    .values({ patientId: patient!.id, stage })
    .returning()
  await db.insert(schema.stageTransitions).values({
    enrollmentId: enrollment!.id,
    patientId: patient!.id,
    fromStage: null,
    toStage: stage,
    trigger: "system",
    reason: "seeded",
  })
  return { patient: patient!, enrollment: enrollment! }
}

export const createAppointment = async (
  input: {
    patientId: string
    clinicianId: string
  } & Partial<typeof schema.appointments.$inferInsert>,
) => {
  const startsAt = input.startsAt ?? addDays(new Date(), -1)
  const [row] = await db
    .insert(schema.appointments)
    .values({
      kind: "evaluation",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 45 * 60_000),
      ...input,
    })
    .returning()
  return row!
}

export const listTasks = (patientId: string) =>
  db.query.tasks.findMany({ where: (t, { eq }) => eq(t.patientId, patientId) })

export const listEvents = () =>
  db.query.outboxEvents.findMany({
    orderBy: (e, { asc }) => [asc(e.createdAt)],
  })
