import { addDays } from "date-fns"

import type { OutboxEvent } from "../../db/schema"
import type { PatientWithEnrollment } from "../patients/repository"
import type { TaskPayloads, TaskType } from "./taskTypes"

// Rules map a domain event to the tasks it should create. They are pure:
// given the event and the patient, return zero or more task specs. The
// service persists them (features/tasks/service.ts).

export type TaskSpec<T extends TaskType = TaskType> = {
  type: T
  title: string
  description?: string
  payload: TaskPayloads[T]
  assigneeClinicianId: string | null
  dueAt: Date | null
}

export type RuleContext = {
  event: OutboxEvent
  patient: PatientWithEnrollment
  now: Date
}

export type TaskRule = (ctx: RuleContext) => TaskSpec[]

const welcomeEmailAfterEligible: TaskRule = ({ event, patient, now }) => {
  if (event.type !== "care_model.stage_changed") {
    return []
  }
  if (event.payload.to !== "eligible") {
    return []
  }
  return [
    {
      type: "send_welcome_email",
      title: `Send welcome email to ${patient.firstName} ${patient.lastName}`,
      description:
        "The patient has been marked eligible. Send them the welcome email so they know what happens next.",
      payload: { templateKey: "welcome_email" },
      assigneeClinicianId: event.actorClinicianId ?? patient.primaryClinicianId,
      dueAt: addDays(now, 2),
    },
  ]
}

export const taskRules: TaskRule[] = [welcomeEmailAfterEligible]

export const tasksForEvent = (ctx: RuleContext): TaskSpec[] =>
  taskRules.flatMap((rule) => rule(ctx))
