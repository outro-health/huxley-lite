import {
  type AppResultAsync,
  appError,
  err,
  ok,
  ResultAsync,
} from "../../lib/result"
import { enqueueEvent } from "../../outbox/enqueue"
import { emailsRepository } from "./repository"

// Applying what the provider says happened to a message. Used by the
// reconciler (polling) and by the webhook endpoint. Reports can repeat and
// arrive out of order; the newest occurredAt wins.

export type DeliveryReport = {
  messageId: string
  event: "delivered" | "bounced"
  reason?: string
  occurredAt: string
}

export type DeliveryOutcome =
  | { outcome: "updated"; emailId: string }
  | { outcome: "ignored"; reason: string }

export const applyDeliveryReport = (
  report: DeliveryReport,
): AppResultAsync<DeliveryOutcome> =>
  ResultAsync.fromSafePromise(
    emailsRepository.getByProviderMessageId(report.messageId),
  )
    .andThen((email) =>
      email
        ? ok(email)
        : err(
            appError(
              "NOT_FOUND",
              `No email with message id ${report.messageId}`,
            ),
          ),
    )
    .andThen((email) => {
      const occurredAt = new Date(report.occurredAt)
      if (email.statusUpdatedAt && email.statusUpdatedAt >= occurredAt) {
        return ok<DeliveryOutcome>({
          outcome: "ignored",
          reason: "already have a newer status",
        })
      }
      return ResultAsync.fromSafePromise(
        emailsRepository.setStatus({
          id: email.id,
          status: report.event,
          detail: report.reason ?? null,
          updatedAt: occurredAt,
        }),
      )
        .andThen(() => {
          if (report.event !== "bounced") {
            return ok(undefined)
          }
          return enqueueEvent({
            type: "email.bounced",
            patientId: email.patientId,
            actorClinicianId: null,
            payload: {
              emailId: email.id,
              taskId: email.taskId,
              toAddress: email.toAddress,
              reason: report.reason ?? null,
            },
          }).map(() => undefined)
        })
        .map<DeliveryOutcome>(() => ({ outcome: "updated", emailId: email.id }))
    })
