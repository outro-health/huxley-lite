import { asc, eq, isNull } from "drizzle-orm"

import { db, schema } from "../../db/client"

const withActiveEnrollment = {
  primaryClinician: true,
  enrollments: {
    where: isNull(schema.careModelEnrollments.endedAt),
    limit: 1,
  },
} as const

/** Flatten the one active enrollment onto the patient for callers. */
const shape = <
  T extends {
    enrollments: (typeof schema.careModelEnrollments.$inferSelect)[]
  },
>(
  row: T,
) => {
  const { enrollments, ...patient } = row
  return { ...patient, enrollment: enrollments[0] ?? null }
}

export const patientsRepository = {
  list: () =>
    db.query.patients
      .findMany({
        orderBy: [
          asc(schema.patients.lastName),
          asc(schema.patients.firstName),
        ],
        with: withActiveEnrollment,
      })
      .then((rows) => rows.map(shape)),

  getById: (id: string) =>
    db.query.patients
      .findFirst({
        where: eq(schema.patients.id, id),
        with: withActiveEnrollment,
      })
      .then((row) => (row ? shape(row) : null)),

  getByEmail: (email: string) =>
    db.query.patients
      .findFirst({ where: eq(schema.patients.email, email.toLowerCase()) })
      .then((row) => row ?? null),

  setEhrPatientId: (patientId: string, ehrPatientId: string) =>
    db
      .update(schema.patients)
      .set({ ehrPatientId })
      .where(eq(schema.patients.id, patientId)),
}

export type PatientWithEnrollment = NonNullable<
  Awaited<ReturnType<typeof patientsRepository.getById>>
>
