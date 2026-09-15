import { and, asc, desc, eq, gte, lt } from "drizzle-orm"

import { db, schema } from "../../db/client"
import type { AppointmentFlag, AppointmentKind } from "../../db/schema"

export const appointmentsRepository = {
  getById: (id: string) =>
    db.query.appointments
      .findFirst({
        where: eq(schema.appointments.id, id),
        with: { patient: true, clinician: true },
      })
      .then((row) => row ?? null),

  listForPatient: (patientId: string) =>
    db.query.appointments.findMany({
      where: eq(schema.appointments.patientId, patientId),
      orderBy: [desc(schema.appointments.startsAt)],
      with: { clinician: true },
    }),

  /** Upcoming appointments for a clinician, soonest first. */
  listUpcomingForClinician: (clinicianId: string, from: Date) =>
    db.query.appointments.findMany({
      where: and(
        eq(schema.appointments.clinicianId, clinicianId),
        gte(schema.appointments.startsAt, from),
      ),
      orderBy: [asc(schema.appointments.startsAt)],
      with: { patient: true },
    }),

  /** Past appointments for a clinician, most recent first. */
  listPastForClinician: (clinicianId: string, before: Date, limit = 20) =>
    db.query.appointments.findMany({
      where: and(
        eq(schema.appointments.clinicianId, clinicianId),
        lt(schema.appointments.startsAt, before),
      ),
      orderBy: [desc(schema.appointments.startsAt)],
      limit,
      with: { patient: true },
    }),

  /** Insert or update by the Cal booking uid. */
  upsertByExternalId: async (input: {
    externalBookingId: string
    patientId: string
    clinicianId: string
    kind: AppointmentKind
    startsAt: Date
    endsAt: Date
    videoUrl: string | null
  }) => {
    const existing = await db.query.appointments.findFirst({
      where: eq(schema.appointments.externalBookingId, input.externalBookingId),
    })
    if (existing) {
      const [row] = await db
        .update(schema.appointments)
        .set({
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          videoUrl: input.videoUrl,
          clinicianId: input.clinicianId,
        })
        .where(eq(schema.appointments.id, existing.id))
        .returning()
      return { appointment: row ?? existing, created: false }
    }
    const [row] = await db.insert(schema.appointments).values(input).returning()
    if (!row) {
      throw new Error("Insert returned no row")
    }
    return { appointment: row, created: true }
  },

  /** Returns null if unknown; `changed` is false if it was already cancelled. */
  cancelByExternalId: async (externalBookingId: string) => {
    const existing = await db.query.appointments.findFirst({
      where: eq(schema.appointments.externalBookingId, externalBookingId),
    })
    if (!existing) {
      return null
    }
    if (existing.status === "cancelled") {
      return { ...existing, changed: false }
    }
    const [row] = await db
      .update(schema.appointments)
      .set({ status: "cancelled" })
      .where(eq(schema.appointments.id, existing.id))
      .returning()
    return { ...(row ?? existing), changed: true }
  },

  recordFlag: async (input: {
    appointmentId: string
    flag: AppointmentFlag | null
    note: string | null
    clinicianId: string
  }) => {
    const [row] = await db
      .update(schema.appointments)
      .set({
        flag: input.flag,
        flagNote: input.note,
        flaggedAt: input.flag ? new Date() : null,
        flaggedByClinicianId: input.flag ? input.clinicianId : null,
      })
      .where(eq(schema.appointments.id, input.appointmentId))
      .returning()
    return row ?? null
  },

  markCompleted: async (appointmentId: string) => {
    const [row] = await db
      .update(schema.appointments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(schema.appointments.id, appointmentId))
      .returning()
    return row ?? null
  },
}
