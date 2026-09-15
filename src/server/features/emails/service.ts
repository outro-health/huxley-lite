import type { Email } from "../../db/schema"
import { emailProvider } from "../../integrations/emailProvider"
import {
  type AppResultAsync,
  appError,
  err,
  fromPromise,
  notFound,
  ok,
  ResultAsync,
} from "../../lib/result"
import { tasksRepository } from "../tasks/repository"
import { closeTask } from "../tasks/service"
import { isTaskType } from "../tasks/taskTypes"
import { emailsRepository } from "./repository"
import {
  type EmailTemplateKey,
  emailTemplates,
  renderTemplate,
} from "./templates"

export type EmailDraft = {
  to: string
  subject: string
  body: string
  templateKey: EmailTemplateKey
}

const loadEmailTask = (taskId: string) =>
  ResultAsync.fromSafePromise(tasksRepository.getById(taskId))
    .andThen((task) => (task ? ok(task) : err(notFound("Task", taskId))))
    .andThen((task) => {
      if (!isTaskType(task.type) || task.type !== "send_welcome_email") {
        return err(
          appError("INVALID_STATE", `Task type "${task.type}" has no email.`),
        )
      }
      return ok({ ...task, type: task.type })
    })

/**
 * Build the email a clinician will send for a task, with the template's
 * placeholders filled from patient data. The clinician can edit it before
 * sending.
 */
export const draftEmailForTask = (input: {
  taskId: string
  clinicianName: string
}): AppResultAsync<EmailDraft> =>
  loadEmailTask(input.taskId).map((task) => {
    const templateKey: EmailTemplateKey = "welcome_email"
    const rendered = renderTemplate(emailTemplates[templateKey], {
      firstName: task.patient.firstName,
      clinicianName: input.clinicianName,
      medicationName: task.patient.medicationName,
      medicationDose: task.patient.medicationDose,
    })
    return { ...rendered, to: task.patient.email, templateKey }
  })

export type SendEmailForTaskInput = {
  taskId: string
  to: string
  subject: string
  body: string
  clinicianId: string
}

/**
 * Hand the (possibly edited) draft to the email provider, record it as
 * queued, and close the task. Delivery or bounce arrives later via webhook.
 */
export const sendEmailForTask = (
  input: SendEmailForTaskInput,
): AppResultAsync<{ email: Email }> =>
  loadEmailTask(input.taskId)
    .andThen((task) =>
      task.status === "open"
        ? ok(task)
        : err(appError("INVALID_STATE", `Task is already ${task.status}.`)),
    )
    .andThen((task) =>
      emailProvider
        .send({ to: input.to, subject: input.subject, body: input.body })
        .andThen(({ providerMessageId }) =>
          fromPromise(
            emailsRepository.insert({
              patientId: task.patientId,
              taskId: task.id,
              sentByClinicianId: input.clinicianId,
              templateKey:
                typeof task.payload.templateKey === "string"
                  ? task.payload.templateKey
                  : null,
              toAddress: input.to,
              subject: input.subject,
              body: input.body,
              status: "queued",
              providerMessageId,
            }),
            "INTEGRATION_FAILED",
            "Could not record email",
          ),
        ),
    )
    .andThen((email) =>
      closeTask({
        taskId: input.taskId,
        status: "done",
        clinicianId: input.clinicianId,
      }).map(() => ({ email })),
    )
