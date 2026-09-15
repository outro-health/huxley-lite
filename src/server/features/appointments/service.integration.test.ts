import { describe, expect, it } from "vitest"

import {
  createAppointment,
  createClinician,
  createPatient,
  listEvents,
} from "../../test/fixtures"
import { careModelRepository } from "../careModel/repository"
import { completeAppointment, flagAppointment } from "./service"

describe("completeAppointment", () => {
  it("completing an evaluation moves the patient to decision_pending", async () => {
    const clinician = await createClinician()
    const { patient, enrollment } = await createPatient({ stage: "evaluation" })
    const appointment = await createAppointment({
      patientId: patient.id,
      clinicianId: clinician.id,
      kind: "evaluation",
    })

    const result = await completeAppointment({
      appointmentId: appointment.id,
      clinicianId: clinician.id,
    })
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap().appointment.status).toBe("completed")

    const updated = await careModelRepository.getEnrollmentById(enrollment.id)
    expect(updated?.stage).toBe("decision_pending")
    expect((await listEvents()).map((e) => e.type)).toEqual([
      "care_model.stage_changed",
      "appointment.completed",
    ])
  })

  it("completing a follow-up leaves the stage alone", async () => {
    const clinician = await createClinician()
    const { patient, enrollment } = await createPatient({
      stage: "active_care",
    })
    const appointment = await createAppointment({
      patientId: patient.id,
      clinicianId: clinician.id,
      kind: "follow_up",
    })
    await completeAppointment({
      appointmentId: appointment.id,
      clinicianId: clinician.id,
    })
    expect(
      (await careModelRepository.getEnrollmentById(enrollment.id))?.stage,
    ).toBe("active_care")
  })

  it("refuses to complete a flagged or already-completed appointment", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "evaluation" })
    const appointment = await createAppointment({
      patientId: patient.id,
      clinicianId: clinician.id,
    })
    await flagAppointment({
      appointmentId: appointment.id,
      flag: "no_show",
      note: "",
      clinicianId: clinician.id,
    })
    const blocked = await completeAppointment({
      appointmentId: appointment.id,
      clinicianId: clinician.id,
    })
    expect(blocked._unsafeUnwrapErr().code).toBe("INVALID_STATE")
  })
})

describe("flagAppointment", () => {
  it("records the flag and emits appointment.flagged with the appointment id", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "active_care" })
    const appointment = await createAppointment({
      patientId: patient.id,
      clinicianId: clinician.id,
      kind: "follow_up",
    })

    const result = await flagAppointment({
      appointmentId: appointment.id,
      flag: "no_show",
      note: "No answer",
      clinicianId: clinician.id,
    })
    expect(result._unsafeUnwrap().appointment).toMatchObject({
      flag: "no_show",
      flagNote: "No answer",
      flaggedByClinicianId: clinician.id,
    })
    const [event] = await listEvents()
    expect(event).toMatchObject({
      type: "appointment.flagged",
      payload: { appointmentId: appointment.id, flag: "no_show" },
    })
  })

  it("clearing a flag emits nothing", async () => {
    const clinician = await createClinician()
    const { patient } = await createPatient({ stage: "active_care" })
    const appointment = await createAppointment({
      patientId: patient.id,
      clinicianId: clinician.id,
      flag: "no_show",
    })
    await flagAppointment({
      appointmentId: appointment.id,
      flag: null,
      note: "",
      clinicianId: clinician.id,
    })
    expect(await listEvents()).toHaveLength(0)
  })
})
