import type { Enrollment, StageTransition } from "../../db/schema"
import {
  type AppResultAsync,
  appError,
  errAsync,
  ResultAsync,
} from "../../lib/result"
import { careModelRepository } from "../careModel/repository"
import { loadActiveEnrollment, transitionStage } from "../careModel/service"

export type EligibilityDecision = "eligible" | "ineligible"

export type DecideEligibilityInput = {
  patientId: string
  decision: EligibilityDecision
  note: string
  clinicianId: string
}

export type DecideEligibilityResult = {
  enrollment: Enrollment
  transition: StageTransition
}

/**
 * Record the clinician's eligibility decision. This is a manual stage
 * transition (decision_pending → eligible | ineligible); the care model
 * decides whether it's allowed from where the patient is. Everything that
 * follows an "eligible" decision (EHR chart, tasks) happens through the
 * outbox handlers for `care_model.stage_changed`.
 */
export const decideEligibility = (
  input: DecideEligibilityInput,
): AppResultAsync<DecideEligibilityResult> => {
  const note = input.note.trim()
  if (input.decision === "ineligible" && note.length === 0) {
    return errAsync(
      appError(
        "VALIDATION",
        "A clinical note is required for an ineligible decision.",
      ),
    )
  }
  return loadActiveEnrollment(input.patientId)
    .andThen((enrollment) =>
      ResultAsync.fromSafePromise(
        careModelRepository.recordEligibilityDecision({
          enrollmentId: enrollment.id,
          note: note || null,
          decidedByClinicianId: input.clinicianId,
        }),
      ),
    )
    .andThen(() =>
      transitionStage({
        patientId: input.patientId,
        to: input.decision,
        trigger: "manual",
        reason: note || undefined,
        actorClinicianId: input.clinicianId,
      }),
    )
}
