import { describe, expect, it } from "vitest"

import { createClinician, createPatient, listEvents } from "../../test/fixtures"
import { careModelRepository } from "./repository"
import { correctStage, restartEnrollment, transitionStage } from "./service"

describe("transitionStage", () => {
  it("records the transition, updates the enrollment, and enqueues an event", async () => {
    const clinician = await createClinician()
    const { patient, enrollment } = await createPatient({ stage: "evaluation" })

    const result = await transitionStage({
      patientId: patient.id,
      to: "decision_pending",
      trigger: "system",
      reason: "Evaluation completed",
      actorClinicianId: clinician.id,
    })

    expect(result.isOk()).toBe(true)
    const updated = await careModelRepository.getEnrollmentById(enrollment.id)
    expect(updated?.stage).toBe("decision_pending")

    const history = await careModelRepository.listTransitionsForPatient(
      patient.id,
    )
    expect(history[0]).toMatchObject({
      fromStage: "evaluation",
      toStage: "decision_pending",
      trigger: "system",
    })

    const events = await listEvents()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: "care_model.stage_changed",
      status: "pending",
      payload: {
        from: "evaluation",
        to: "decision_pending",
        enrollmentId: enrollment.id,
      },
    })
  })

  it("refuses a move the care model does not allow", async () => {
    const { patient } = await createPatient({ stage: "intake" })
    const result = await transitionStage({
      patientId: patient.id,
      to: "eligible",
      trigger: "manual",
      actorClinicianId: null,
    })
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe("INVALID_STATE")
    expect(await listEvents()).toHaveLength(0)
  })
})

describe("correctStage", () => {
  it("requires a reason and records which transition it supersedes", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "decision_pending" })
    await transitionStage({
      patientId: patient.id,
      to: "eligible",
      trigger: "manual",
      actorClinicianId: clinician.id,
    })

    const noReason = await correctStage({
      patientId: patient.id,
      to: "decision_pending",
      reason: " ",
      actorClinicianId: clinician.id,
    })
    expect(noReason._unsafeUnwrapErr().code).toBe("VALIDATION")

    const corrected = await correctStage({
      patientId: patient.id,
      to: "decision_pending",
      reason: "Clicked the wrong patient",
      actorClinicianId: clinician.id,
    })
    expect(corrected.isOk()).toBe(true)

    const history = await careModelRepository.listTransitionsForPatient(
      patient.id,
    )
    const [latest, superseded] = history
    expect(latest).toMatchObject({
      trigger: "correction",
      toStage: "decision_pending",
    })
    expect(latest?.supersedesTransitionId).toBe(superseded?.id)

    const events = await listEvents()
    expect(events.map((e) => e.type)).toEqual([
      "care_model.stage_changed",
      "care_model.stage_corrected",
    ])
  })
})

describe("restartEnrollment", () => {
  it("ends the archived enrollment and starts a new one at intake", async () => {
    const clinician = await createClinician()
    const { patient, enrollment } = await createPatient({ stage: "archived" })

    const result = await restartEnrollment({
      patientId: patient.id,
      actorClinicianId: clinician.id,
    })
    expect(result.isOk()).toBe(true)

    const old = await careModelRepository.getEnrollmentById(enrollment.id)
    expect(old?.endedAt).not.toBeNull()
    const active = await careModelRepository.getActiveEnrollment(patient.id)
    expect(active?.id).not.toBe(enrollment.id)
    expect(active?.stage).toBe("intake")
  })

  it("refuses to restart a patient who is not archived", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "active_care" })
    const result = await restartEnrollment({
      patientId: patient.id,
      actorClinicianId: clinician.id,
    })
    expect(result._unsafeUnwrapErr().code).toBe("INVALID_STATE")
  })
})
