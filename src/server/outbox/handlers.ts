import type { OutboxEvent } from "../db/schema"
import { syncEligiblePatientToEhr } from "../features/patients/ehrSync"
import { createTasksForEvent } from "../features/tasks/service"
import type { AppResultAsync } from "../lib/result"
import type { EventType } from "./eventTypes"

export type EventHandler = {
  name: string
  handle: (event: OutboxEvent) => AppResultAsync<unknown>
}

// Which handlers run for which event, in order. Tasks go first so the
// clinician's inbox is right even when the EHR is slow.
export const handlersByEventType: Partial<Record<EventType, EventHandler[]>> = {
  "care_model.stage_changed": [
    { name: "createTasksForEvent", handle: createTasksForEvent },
    { name: "syncEligiblePatientToEhr", handle: syncEligiblePatientToEhr },
  ],
  "care_model.stage_corrected": [
    { name: "createTasksForEvent", handle: createTasksForEvent },
  ],
  "appointment.flagged": [
    { name: "createTasksForEvent", handle: createTasksForEvent },
  ],
  "appointment.completed": [
    { name: "createTasksForEvent", handle: createTasksForEvent },
  ],
}

export const handlersFor = (type: string): EventHandler[] =>
  handlersByEventType[type as EventType] ?? []
