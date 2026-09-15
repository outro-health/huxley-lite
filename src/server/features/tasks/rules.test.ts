import { describe, expect, it } from "vitest"

import type { OutboxEvent } from "../../db/schema"
import type { PatientWithEnrollment } from "../patients/repository"
import { tasksForEvent } from "./rules"

const now = new Date("2026-09-14T10:00:00Z")

const patient: PatientWithEnrollment = {
  id: "p1",
  firstName: "Ana",
  lastName: "Alvarez",
  email: "ana@example.com",
  state: "CA",
  dateOfBirth: "1988-03-14",
  medicationName: "Sertraline",
  medicationDose: "100mg daily",
  primaryClinicianId: "c-primary",
  primaryClinician: null,
  ehrPatientId: null,
  createdAt: now,
  enrollment: {
    id: "e1",
    patientId: "p1",
    stage: "eligible",
    startedAt: now,
    endedAt: null,
    eligibilityNote: null,
    eligibilityDecidedAt: null,
    eligibilityDecidedByClinicianId: null,
  },
}

const stageChanged = (
  payload: Record<string, unknown>,
  overrides: Partial<OutboxEvent> = {},
): OutboxEvent => ({
  id: "evt1",
  type: "care_model.stage_changed",
  patientId: patient.id,
  actorClinicianId: "c-actor",
  payload: { enrollmentId: "e1", transitionId: "t1", ...payload },
  status: "processing",
  attempts: 1,
  maxAttempts: 5,
  nextAttemptAt: now,
  lastError: null,
  deliveredAt: null,
  createdAt: now,
  ...overrides,
})

describe("tasksForEvent", () => {
  it("creates a welcome email task when a patient becomes eligible", () => {
    const specs = tasksForEvent({
      event: stageChanged({ from: "decision_pending", to: "eligible" }),
      patient,
      now,
    })

    expect(specs).toHaveLength(1)
    expect(specs[0]).toMatchObject({
      type: "send_welcome_email",
      title: "Send welcome email to Ana Alvarez",
      assigneeClinicianId: "c-actor",
      payload: { templateKey: "welcome_email" },
    })
    expect(specs[0]?.dueAt?.toISOString()).toBe("2026-09-16T10:00:00.000Z")
  })

  it("falls back to the primary clinician when the event has no actor", () => {
    const specs = tasksForEvent({
      event: stageChanged({ to: "eligible" }, { actorClinicianId: null }),
      patient,
      now,
    })
    expect(specs[0]?.assigneeClinicianId).toBe("c-primary")
  })

  it("creates nothing for other stage changes", () => {
    for (const to of ["ineligible", "decision_pending", "active_care"]) {
      expect(
        tasksForEvent({ event: stageChanged({ to }), patient, now }),
      ).toEqual([])
    }
  })

  it("creates nothing for events with no rule", () => {
    const specs = tasksForEvent({
      event: stageChanged({ flag: "no_show" }, { type: "appointment.flagged" }),
      patient,
      now,
    })
    expect(specs).toEqual([])
  })
})
