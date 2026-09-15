// Every domain event the system emits. Payload shapes are documented where
// the event is enqueued; handlers read them as Record<string, unknown> and
// must validate what they need.

export const eventTypeList = [
  "care_model.stage_changed",
  "care_model.stage_corrected",
  "care_model.enrollment_restarted",
  "appointment.booked",
  "appointment.cancelled",
  "appointment.completed",
  "appointment.flagged",
  "email.bounced",
] as const
export type EventType = (typeof eventTypeList)[number]
