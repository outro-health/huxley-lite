import { describe, expect, it } from "vitest"

import { db } from "../db/client"
import type { CalWebhook } from "../integrations/cal"
import { createClinician, createPatient, listEvents } from "../test/fixtures"
import { handleCalWebhook } from "./cal"

const hook = (
  triggerEvent: CalWebhook["triggerEvent"],
  payload: Partial<CalWebhook["payload"]> & { uid: string },
  parties: { patientEmail: string; clinicianEmail: string },
): CalWebhook => ({
  triggerEvent,
  createdAt: new Date().toISOString(),
  payload: {
    startTime: "2026-09-20T10:00:00Z",
    endTime: "2026-09-20T10:30:00Z",
    eventType: { slug: "follow_up" },
    organizer: { email: parties.clinicianEmail },
    attendees: [{ email: parties.patientEmail }],
    videoCallUrl: "https://meet.example.com/x",
    ...payload,
  },
})

const listAppointments = (patientId: string) =>
  db.query.appointments.findMany({
    where: (a, { eq }) => eq(a.patientId, patientId),
    orderBy: (a, { asc }) => [asc(a.createdAt)],
  })

const setup = async () => {
  const clinician = await createClinician()
  const { patient } = await createPatient({ stage: "active_care" })
  return {
    clinician,
    patient,
    parties: { patientEmail: patient.email, clinicianEmail: clinician.email },
  }
}

describe("handleCalWebhook", () => {
  it("creates an appointment and emits appointment.booked", async () => {
    const { patient, parties } = await setup()
    const result = await handleCalWebhook(
      hook("BOOKING_CREATED", { uid: "cal_1" }, parties),
    )
    expect(result._unsafeUnwrap().outcome).toBe("created")
    const [appointment] = await listAppointments(patient.id)
    expect(appointment).toMatchObject({
      externalBookingId: "cal_1",
      status: "scheduled",
    })
    expect((await listEvents()).map((e) => e.type)).toEqual([
      "appointment.booked",
    ])
  })

  it("a duplicate BOOKING_CREATED is a no-op", async () => {
    const { patient, parties } = await setup()
    await handleCalWebhook(hook("BOOKING_CREATED", { uid: "cal_1" }, parties))
    const again = await handleCalWebhook(
      hook("BOOKING_CREATED", { uid: "cal_1" }, parties),
    )
    expect(again._unsafeUnwrap().outcome).toBe("updated")
    expect(await listAppointments(patient.id)).toHaveLength(1)
    expect(await listEvents()).toHaveLength(1)
  })

  it("a reschedule cancels the old booking and creates the new one", async () => {
    const { patient, parties } = await setup()
    await handleCalWebhook(hook("BOOKING_CREATED", { uid: "cal_1" }, parties))
    await handleCalWebhook(
      hook(
        "BOOKING_RESCHEDULED",
        {
          uid: "cal_2",
          rescheduleUid: "cal_1",
          startTime: "2026-09-22T10:00:00Z",
          endTime: "2026-09-22T10:30:00Z",
        },
        parties,
      ),
    )
    const appointments = await listAppointments(patient.id)
    expect(appointments.map((a) => [a.externalBookingId, a.status])).toEqual([
      ["cal_1", "cancelled"],
      ["cal_2", "scheduled"],
    ])
  })

  it("cancelling emits appointment.cancelled once, even if the webhook repeats", async () => {
    const { parties } = await setup()
    await handleCalWebhook(hook("BOOKING_CREATED", { uid: "cal_1" }, parties))
    await handleCalWebhook(
      hook(
        "BOOKING_CANCELLED",
        { uid: "cal_1", cancellationReason: "sick" },
        parties,
      ),
    )
    await handleCalWebhook(
      hook(
        "BOOKING_CANCELLED",
        { uid: "cal_1", cancellationReason: "sick" },
        parties,
      ),
    )
    const cancelled = (await listEvents()).filter(
      (e) => e.type === "appointment.cancelled",
    )
    expect(cancelled).toHaveLength(1)
    expect(cancelled[0]?.payload).toMatchObject({ reason: "sick" })
  })

  it("rejects bookings for unknown patients", async () => {
    const { parties } = await setup()
    const result = await handleCalWebhook(
      hook(
        "BOOKING_CREATED",
        { uid: "cal_x" },
        { ...parties, patientEmail: "nobody@example.com" },
      ),
    )
    expect(result._unsafeUnwrapErr().code).toBe("NOT_FOUND")
  })
})
