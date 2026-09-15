import type {
  CareStage,
  Enrollment,
  StageTransition,
  TransitionTrigger,
} from "../../db/schema"
import {
  type AppResultAsync,
  appError,
  err,
  errAsync,
  notFound,
  ok,
  ResultAsync,
} from "../../lib/result"
import { enqueueEvent } from "../../outbox/enqueue"
import { careModelRepository } from "./repository"
import { checkTransition } from "./stages"

export type TransitionInput = {
  patientId: string
  to: CareStage
  trigger: Exclude<TransitionTrigger, "correction">
  reason?: string
  actorClinicianId: string | null
}

export type TransitionResult = {
  enrollment: Enrollment
  transition: StageTransition
}

export const loadActiveEnrollment = (
  patientId: string,
): AppResultAsync<Enrollment> =>
  ResultAsync.fromSafePromise(
    careModelRepository.getActiveEnrollment(patientId),
  ).andThen((enrollment) =>
    enrollment
      ? ok(enrollment)
      : err(
          appError(
            "INVALID_STATE",
            "Patient has no active enrollment in the care model.",
          ),
        ),
  )

const applyTransition = (
  enrollment: Enrollment,
  input: {
    to: CareStage
    trigger: TransitionTrigger
    reason: string | null
    actorClinicianId: string | null
    supersedesTransitionId: string | null
  },
): AppResultAsync<TransitionResult> =>
  ResultAsync.fromSafePromise(
    careModelRepository.insertTransition({
      enrollmentId: enrollment.id,
      patientId: enrollment.patientId,
      fromStage: enrollment.stage,
      toStage: input.to,
      trigger: input.trigger,
      reason: input.reason,
      actorClinicianId: input.actorClinicianId,
      supersedesTransitionId: input.supersedesTransitionId,
    }),
  )
    .andThen((transition) =>
      ResultAsync.fromSafePromise(
        careModelRepository.setEnrollmentStage(enrollment.id, input.to),
      ).map(() => transition),
    )
    .andThen((transition) =>
      enqueueEvent({
        type:
          input.trigger === "correction"
            ? "care_model.stage_corrected"
            : "care_model.stage_changed",
        patientId: enrollment.patientId,
        actorClinicianId: input.actorClinicianId,
        payload: {
          enrollmentId: enrollment.id,
          transitionId: transition.id,
          from: enrollment.stage,
          to: input.to,
          trigger: input.trigger,
          supersedesTransitionId: input.supersedesTransitionId,
        },
      }).map(() => ({
        enrollment: { ...enrollment, stage: input.to },
        transition,
      })),
    )

/**
 * Move a patient's active enrollment to a new stage, if the care model allows
 * it. Records the transition and emits `care_model.stage_changed`.
 */
export const transitionStage = (
  input: TransitionInput,
): AppResultAsync<TransitionResult> =>
  loadActiveEnrollment(input.patientId).andThen((enrollment) => {
    const check = checkTransition(enrollment.stage, input.to, input.trigger)
    if (!check.allowed) {
      return errAsync(appError("INVALID_STATE", check.reason))
    }
    return applyTransition(enrollment, {
      to: input.to,
      trigger: input.trigger,
      reason: input.reason?.trim() || null,
      actorClinicianId: input.actorClinicianId,
      supersedesTransitionId: null,
    })
  })

export type CorrectionInput = {
  patientId: string
  to: CareStage
  reason: string
  actorClinicianId: string
}

/**
 * Staff correction: the patient was moved to the wrong stage. Any stage is
 * reachable, a reason is required, and the transition being undone is
 * recorded so its side effects can be revisited. Emits
 * `care_model.stage_corrected`.
 */
export const correctStage = (
  input: CorrectionInput,
): AppResultAsync<TransitionResult> => {
  const reason = input.reason.trim()
  if (!reason) {
    return errAsync(
      appError("VALIDATION", "A reason is required to correct a stage."),
    )
  }
  return loadActiveEnrollment(input.patientId).andThen((enrollment) => {
    const check = checkTransition(enrollment.stage, input.to, "correction")
    if (!check.allowed) {
      return errAsync(appError("INVALID_STATE", check.reason))
    }
    return ResultAsync.fromSafePromise(
      careModelRepository.listTransitionsForPatient(input.patientId),
    ).andThen((history) => {
      const latest = history.find((t) => t.enrollmentId === enrollment.id)
      return applyTransition(enrollment, {
        to: input.to,
        trigger: "correction",
        reason,
        actorClinicianId: input.actorClinicianId,
        supersedesTransitionId: latest?.id ?? null,
      })
    })
  })
}

/**
 * Restart: end the current enrollment and start a fresh one at intake.
 * Used when a patient comes back after being archived.
 */
export const restartEnrollment = (input: {
  patientId: string
  actorClinicianId: string
}): AppResultAsync<TransitionResult> =>
  ResultAsync.fromSafePromise(
    careModelRepository.getActiveEnrollment(input.patientId),
  )
    .andThen((current) => {
      if (!current) {
        return ok(null)
      }
      if (current.stage !== "archived") {
        return err(
          appError(
            "INVALID_STATE",
            "Only archived patients can restart. Archive them first.",
          ),
        )
      }
      return ok(current)
    })
    .andThen((current) =>
      ResultAsync.fromSafePromise(
        (async () => {
          if (current) {
            await careModelRepository.endEnrollment(current.id)
          }
          return careModelRepository.createEnrollment(input.patientId, "intake")
        })(),
      ),
    )
    .andThen((enrollment) =>
      ResultAsync.fromSafePromise(
        careModelRepository.insertTransition({
          enrollmentId: enrollment.id,
          patientId: enrollment.patientId,
          fromStage: null,
          toStage: "intake",
          trigger: "manual",
          reason: "Restarted",
          actorClinicianId: input.actorClinicianId,
        }),
      ).andThen((transition) =>
        enqueueEvent({
          type: "care_model.enrollment_restarted",
          patientId: enrollment.patientId,
          actorClinicianId: input.actorClinicianId,
          payload: { enrollmentId: enrollment.id, transitionId: transition.id },
        }).map(() => ({ enrollment, transition })),
      ),
    )

export const getTransitionOrNotFound = (
  transitionId: string,
): AppResultAsync<StageTransition> =>
  ResultAsync.fromSafePromise(
    careModelRepository.getTransitionById(transitionId),
  ).andThen((t) => (t ? ok(t) : err(notFound("Transition", transitionId))))
