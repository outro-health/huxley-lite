import type { AppointmentKind } from "../db/schema"
import { appointmentsRepository } from "../features/appointments/repository"
import { cliniciansRepository } from "../features/clinicians/repository"
import { patientsRepository } from "../features/patients/repository"
import type { CalWebhook } from "../integrations/scheduler"
import {
  type AppResultAsync,
  appError,
  err,
  ok,
  ResultAsync,
} from "../lib/result"
import { enqueueEvent } from "../outbox/enqueue"

export type CalWebhookOutcome = {
  outcome: "created" | "updated" | "cancelled" | "rescheduled"
  appointmentId: string
}

const resolveParties = (hook: CalWebhook) =>
  ResultAsync.fromSafePromise(
    Promise.all([
      patientsRepository.getByEmail(hook.payload.attendees[0]?.email ?? ""),
      cliniciansRepository.getByEmail(hook.payload.organizer.email),
    ]),
  ).andThen(([patient, clinician]) => {
    if (!patient) {
      return err(
        appError(
          "NOT_FOUND",
          `No patient with email ${hook.payload.attendees[0]?.email}`,
        ),
      )
    }
    if (!clinician) {
      return err(
        appError(
          "NOT_FOUND",
          `No clinician with email ${hook.payload.organizer.email}`,
        ),
      )
    }
    return ok({ patient, clinician })
  })

/**
 * Booking webhooks from the scheduler. Upserts on the booking uid so a
 * retried webhook is harmless.
 */
export const handleCalWebhook = (
  hook: CalWebhook,
): AppResultAsync<CalWebhookOutcome> =>
  resolveParties(hook).andThen(({ patient, clinician }) => {
    const booking = {
      externalBookingId: hook.payload.uid,
      patientId: patient.id,
      clinicianId: clinician.id,
      kind: hook.payload.eventType.slug as AppointmentKind,
      startsAt: new Date(hook.payload.startTime),
      endsAt: new Date(hook.payload.endTime),
      videoUrl: hook.payload.videoCallUrl ?? null,
    }

    switch (hook.triggerEvent) {
      case "BOOKING_CREATED":
        return ResultAsync.fromSafePromise(
          appointmentsRepository.upsertByExternalId(booking),
        ).andThen(({ appointment, created }) =>
          (created
            ? enqueueEvent({
                type: "appointment.booked",
                patientId: patient.id,
                actorClinicianId: null,
                payload: { appointmentId: appointment.id, kind: booking.kind },
              }).map(() => undefined)
            : ResultAsync.fromSafePromise(Promise.resolve(undefined))
          ).map<CalWebhookOutcome>(() => ({
            outcome: created ? "created" : "updated",
            appointmentId: appointment.id,
          })),
        )

      case "BOOKING_CANCELLED":
        return ResultAsync.fromSafePromise(
          appointmentsRepository.cancelByExternalId(hook.payload.uid),
        ).andThen((appointment) => {
          if (!appointment) {
            return err(
              appError(
                "NOT_FOUND",
                `No appointment for booking ${hook.payload.uid}`,
              ),
            )
          }
          if (!appointment.changed) {
            return ok<CalWebhookOutcome>({
              outcome: "cancelled",
              appointmentId: appointment.id,
            })
          }
          return enqueueEvent({
            type: "appointment.cancelled",
            patientId: patient.id,
            actorClinicianId: null,
            payload: {
              appointmentId: appointment.id,
              reason: hook.payload.cancellationReason ?? null,
              startsAt: appointment.startsAt.toISOString(),
            },
          }).map<CalWebhookOutcome>(() => ({
            outcome: "cancelled",
            appointmentId: appointment.id,
          }))
        })

      case "BOOKING_RESCHEDULED": {
        const previousUid = hook.payload.rescheduleUid
        return ResultAsync.fromSafePromise(
          (async () => {
            if (previousUid) {
              await appointmentsRepository.cancelByExternalId(previousUid)
            }
            return appointmentsRepository.upsertByExternalId(booking)
          })(),
        ).map<CalWebhookOutcome>(({ appointment }) => ({
          outcome: "rescheduled",
          appointmentId: appointment.id,
        }))
      }
    }
  })
