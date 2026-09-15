import type { OutboxEvent } from "../../db/schema"
import { ehr } from "../../integrations/ehr"
import { type AppResultAsync, okAsync, ResultAsync } from "../../lib/result"
import { patientsRepository } from "./repository"

/**
 * Outbox handler: when a patient becomes eligible, create their chart in the
 * EHR. Safe to run more than once: the EHR call carries an idempotency key
 * (the patient id), and we skip patients that already have a chart.
 */
export const syncEligiblePatientToEhr = (
  event: OutboxEvent,
): AppResultAsync<{ synced: boolean }> => {
  if (event.payload.to !== "eligible" || !event.patientId) {
    return okAsync({ synced: false })
  }
  const patientId = event.patientId
  return ResultAsync.fromSafePromise(
    patientsRepository.getById(patientId),
  ).andThen((patient) => {
    if (!patient || patient.ehrPatientId) {
      return okAsync({ synced: false })
    }
    return ehr
      .createPatient({
        idempotencyKey: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        email: patient.email,
      })
      .andThen(({ ehrPatientId }) =>
        ResultAsync.fromSafePromise(
          patientsRepository.setEhrPatientId(patient.id, ehrPatientId),
        ).map(() => ({ synced: true })),
      )
  })
}
