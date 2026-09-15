import type { OutboxEvent, Task, TaskStatus } from "../../db/schema"
import {
  type AppResultAsync,
  appError,
  err,
  fromPromise,
  notFound,
  ok,
  ResultAsync,
} from "../../lib/result"
import { patientsRepository } from "../patients/repository"
import { tasksRepository } from "./repository"
import { tasksForEvent } from "./rules"

const asString = (value: unknown) => (typeof value === "string" ? value : null)

/**
 * Outbox handler: run the task rules for an event and persist whatever they
 * produce. Tasks remember the transition and enrollment they came from.
 */
export const createTasksForEvent = (
  event: OutboxEvent,
): AppResultAsync<Task[]> => {
  if (!event.patientId) {
    return fromPromise(Promise.resolve([]), "INTEGRATION_FAILED", "")
  }
  const patientId = event.patientId
  return ResultAsync.fromSafePromise(patientsRepository.getById(patientId))
    .andThen((patient) =>
      patient ? ok(patient) : err(notFound("Patient", patientId)),
    )
    .andThen((patient) => {
      const specs = tasksForEvent({ event, patient, now: new Date() })
      return fromPromise(
        tasksRepository.insertMany(
          specs.map((spec) => ({
            ...spec,
            patientId: patient.id,
            enrollmentId:
              asString(event.payload.enrollmentId) ??
              patient.enrollment?.id ??
              null,
            transitionId: asString(event.payload.transitionId),
            appointmentId: asString(event.payload.appointmentId),
            sourceEventId: event.id,
          })),
        ),
        "INTEGRATION_FAILED",
        "Could not create tasks",
      )
    })
}

export type CloseTaskInput = {
  taskId: string
  status: Exclude<TaskStatus, "open">
  clinicianId: string
}

/** Mark an open task done or dismissed. */
export const closeTask = (input: CloseTaskInput): AppResultAsync<Task> =>
  ResultAsync.fromSafePromise(tasksRepository.getById(input.taskId))
    .andThen((task) => (task ? ok(task) : err(notFound("Task", input.taskId))))
    .andThen((task) =>
      task.status === "open"
        ? ok(task)
        : err(appError("INVALID_STATE", `Task is already ${task.status}.`)),
    )
    .andThen(() =>
      ResultAsync.fromSafePromise(tasksRepository.setStatus(input)),
    )
    .andThen((task) =>
      task
        ? ok(task)
        : err(appError("INVALID_STATE", "Task was closed by someone else.")),
    )
