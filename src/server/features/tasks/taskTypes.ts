// Task types are code config: the DB stores the key as text, this file says
// what each key means. Add a type here and a rule in rules.ts to create it.

export const taskTypeList = ["send_welcome_email"] as const
export type TaskType = (typeof taskTypeList)[number]

export type TaskPayloads = {
  send_welcome_email: {
    templateKey: "welcome_email"
  }
}

export const taskTypeLabels: Record<TaskType, string> = {
  send_welcome_email: "Welcome email",
}

export const isTaskType = (value: string): value is TaskType =>
  (taskTypeList as readonly string[]).includes(value)
