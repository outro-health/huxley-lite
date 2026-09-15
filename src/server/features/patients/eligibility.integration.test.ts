import { beforeEach, describe, expect, it } from "vitest"

import { _resetLocalEhr } from "../../integrations/ehr"
import { processOnce } from "../../outbox/worker"
import {
  createClinician,
  createPatient,
  listEvents,
  listTasks,
} from "../../test/fixtures"
import { careModelRepository } from "../careModel/repository"
import { patientsRepository } from "./repository"
import { decideEligibility } from "./service"

// The whole eligible path: decision → transition → event → worker → handlers.

beforeEach(() => _resetLocalEhr())

describe("decideEligibility", () => {
  it("moves the patient to eligible and, once delivered, syncs the EHR and creates the welcome task", async () => {
    const clinician = await createClinician()
    const { patient, enrollment } = await createPatient({
      stage: "decision_pending",
    })

    const result = await decideEligibility({
      patientId: patient.id,
      decision: "eligible",
      note: "Good candidate",
      clinicianId: clinician.id,
    })
    expect(result.isOk()).toBe(true)

    // Synchronously: stage moved, note recorded, event queued, nothing else.
    const updated = await careModelRepository.getEnrollmentById(enrollment.id)
    expect(updated).toMatchObject({
      stage: "eligible",
      eligibilityNote: "Good candidate",
      eligibilityDecidedByClinicianId: clinician.id,
    })
    expect(await listTasks(patient.id)).toHaveLength(0)
    expect(
      (await patientsRepository.getById(patient.id))?.ehrPatientId,
    ).toBeNull()

    // After delivery: chart created, task created and linked to the transition.
    const summary = await processOnce()
    expect(summary).toMatchObject({ claimed: 1, delivered: 1 })

    expect(
      (await patientsRepository.getById(patient.id))?.ehrPatientId,
    ).toMatch(/^pt_/)
    const tasks = await listTasks(patient.id)
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      type: "send_welcome_email",
      status: "open",
      assigneeClinicianId: clinician.id,
      enrollmentId: enrollment.id,
      transitionId: result._unsafeUnwrap().transition.id,
    })
  })

  it("marks ineligible with a note and creates no task", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "decision_pending" })

    const result = await decideEligibility({
      patientId: patient.id,
      decision: "ineligible",
      note: "Recent hospitalisation",
      clinicianId: clinician.id,
    })
    expect(result.isOk()).toBe(true)
    await processOnce()
    expect(await listTasks(patient.id)).toHaveLength(0)
    expect((await listEvents()).map((e) => e.status)).toEqual(["delivered"])
  })

  it("rejects an ineligible decision without a note", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "decision_pending" })
    const result = await decideEligibility({
      patientId: patient.id,
      decision: "ineligible",
      note: "   ",
      clinicianId: clinician.id,
    })
    expect(result._unsafeUnwrapErr().code).toBe("VALIDATION")
  })

  it("refuses to decide for a patient still in intake", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "intake" })
    const result = await decideEligibility({
      patientId: patient.id,
      decision: "eligible",
      note: "",
      clinicianId: clinician.id,
    })
    expect(result._unsafeUnwrapErr().code).toBe("INVALID_STATE")
  })

  it("EHR sync is safe to run twice", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "decision_pending" })
    await decideEligibility({
      patientId: patient.id,
      decision: "eligible",
      note: "",
      clinicianId: clinician.id,
    })
    await processOnce()
    const first = (await patientsRepository.getById(patient.id))?.ehrPatientId

    const [event] = await listEvents()
    const { outboxRepository } = await import("../../outbox/repository")
    await outboxRepository.requeue(event!.id)
    await processOnce()

    const second = (await patientsRepository.getById(patient.id))?.ehrPatientId
    expect(second).toBe(first)
  })
})
