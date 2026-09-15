import type { Appointment, AppointmentFlag } from "../../db/schema"
import {
  type AppResultAsync,
  appError,
  err,
  notFound,
  ok,
  ResultAsync,
} from "../../lib/result"
import { enqueueEvent } from "../../outbox/enqueue"
import { careModelRepository } from "../careModel/repository"
import { transitionStage } from "../careModel/service"
import { appointmentsRepository } from "./repository"

const loadAppointment = (appointmentId: string) =>
  ResultAsync.fromSafePromise(
    appointmentsRepository.getById(appointmentId),
  ).andThen((appointment) =>
    appointment ? ok(appointment) : err(notFound("Appointment", appointmentId)),
  )

export type FlagAppointmentInput = {
  appointmentId: string
  flag: AppointmentFlag | null
  note: string
  clinicianId: string
}

/**
 * Record what happened to an appointment that did not go to plan (no-show,
 * late cancellation, ...). Passing `flag: null` clears a previous flag.
 */
export const flagAppointment = (
  input: FlagAppointmentInput,
): AppResultAsync<{ appointment: Appointment }> =>
  loadAppointment(input.appointmentId)
    .andThen((appointment) => {
      if (appointment.status === "completed") {
        return err(
          appError(
            "INVALID_STATE",
            "A completed appointment cannot be flagged.",
          ),
        )
      }
      return ok(appointment)
    })
    .andThen(() =>
      ResultAsync.fromSafePromise(
        appointmentsRepository.recordFlag({
          appointmentId: input.appointmentId,
          flag: input.flag,
          note: input.note.trim() || null,
          clinicianId: input.clinicianId,
        }),
      ),
    )
    .andThen((appointment) =>
      appointment
        ? ok(appointment)
        : err(notFound("Appointment", input.appointmentId)),
    )
    .andThen((appointment) => {
      if (!input.flag) {
        return ok({ appointment })
      }
      return enqueueEvent({
        type: "appointment.flagged",
        patientId: appointment.patientId,
        actorClinicianId: input.clinicianId,
        payload: {
          appointmentId: appointment.id,
          kind: appointment.kind,
          flag: input.flag,
          note: input.note.trim(),
        },
      }).map(() => ({ appointment }))
    })

export type CompleteAppointmentInput = {
  appointmentId: string
  clinicianId: string
}

/**
 * Mark an appointment as having happened. Completing an evaluation moves the
 * patient to `decision_pending` so the clinician is prompted to decide
 * eligibility.
 */
export const completeAppointment = (
  input: CompleteAppointmentInput,
): AppResultAsync<{ appointment: Appointment }> =>
  loadAppointment(input.appointmentId)
    .andThen((appointment) => {
      if (appointment.status !== "scheduled") {
        return err(
          appError(
            "INVALID_STATE",
            `Only scheduled appointments can be completed (status is "${appointment.status}").`,
          ),
        )
      }
      if (appointment.flag) {
        return err(
          appError(
            "INVALID_STATE",
            "Clear the flag before marking this appointment completed.",
          ),
        )
      }
      return ok(appointment)
    })
    .andThen((appointment) =>
      ResultAsync.fromSafePromise(
        appointmentsRepository.markCompleted(appointment.id),
      ).andThen((updated) =>
        updated ? ok(updated) : err(notFound("Appointment", appointment.id)),
      ),
    )
    .andThen((appointment) => {
      // Finishing the evaluation is what moves a patient to decision_pending.
      // If they aren't in evaluation (already decided, or corrected), leave
      // the stage alone.
      if (appointment.kind !== "evaluation") {
        return ok(appointment)
      }
      return ResultAsync.fromSafePromise(
        careModelRepository.getActiveEnrollment(appointment.patientId),
      ).andThen((enrollment) =>
        enrollment?.stage === "evaluation"
          ? transitionStage({
              patientId: appointment.patientId,
              to: "decision_pending",
              trigger: "system",
              reason: "Evaluation appointment completed",
              actorClinicianId: input.clinicianId,
            }).map(() => appointment)
          : ok(appointment),
      )
    })
    .andThen((appointment) =>
      enqueueEvent({
        type: "appointment.completed",
        patientId: appointment.patientId,
        actorClinicianId: input.clinicianId,
        payload: { appointmentId: appointment.id, kind: appointment.kind },
      }).map(() => ({ appointment })),
    )
