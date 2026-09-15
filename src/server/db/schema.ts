import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core"

// ---------------------------------------------------------------------------
// Clinicians (staff). No auth in this prototype: the client sends the acting
// clinician's id in an `x-clinician-id` header.
// ---------------------------------------------------------------------------

export const clinicianRoleList = ["clinician", "operations"] as const
export type ClinicianRole = (typeof clinicianRoleList)[number]
export const clinicianRoleEnum = pgEnum("clinician_role", clinicianRoleList)

export const clinicians = pgTable("clinicians", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: clinicianRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// Patients. Demographics and medication only; where they are in care lives on
// their enrollment.
// ---------------------------------------------------------------------------

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstName: varchar("first_name", { length: 80 }).notNull(),
  lastName: varchar("last_name", { length: 80 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  // Two-letter US state. Clinicians are licensed per state.
  state: varchar("state", { length: 2 }).notNull(),
  dateOfBirth: varchar("date_of_birth", { length: 10 }).notNull(),
  medicationName: varchar("medication_name", { length: 120 }).notNull(),
  medicationDose: varchar("medication_dose", { length: 60 }).notNull(),
  primaryClinicianId: uuid("primary_clinician_id").references(
    () => clinicians.id,
  ),
  // Id of the patient's chart in the (fake) EHR, set once we sync.
  ehrPatientId: varchar("ehr_patient_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// Care model. A patient has at most one active enrollment; the enrollment is
// in exactly one stage. Every stage change is an append-only transition.
// The rules for which moves are allowed live in features/careModel/stages.ts.
// ---------------------------------------------------------------------------

export const careStageList = [
  "intake",
  "evaluation",
  "decision_pending",
  "eligible",
  "active_care",
  "ineligible",
  "archived",
] as const
export type CareStage = (typeof careStageList)[number]
export const careStageEnum = pgEnum("care_stage", careStageList)

export const careModelEnrollments = pgTable(
  "care_model_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    stage: careStageEnum("stage").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set when the patient restarts; the new enrollment starts fresh.
    endedAt: timestamp("ended_at", { withTimezone: true }),
    // Eligibility decision, if one has been made on this enrollment.
    eligibilityNote: text("eligibility_note"),
    eligibilityDecidedAt: timestamp("eligibility_decided_at", {
      withTimezone: true,
    }),
    eligibilityDecidedByClinicianId: uuid(
      "eligibility_decided_by_clinician_id",
    ).references(() => clinicians.id),
  },
  (t) => [
    // One active enrollment per patient.
    uniqueIndex("enrollments_one_active_idx")
      .on(t.patientId)
      .where(sqlNull(t.endedAt)),
  ],
)

export const transitionTriggerList = [
  "system", // caused by something that happened (appointment completed, ...)
  "manual", // a clinician chose it (eligibility decision, ...)
  "correction", // staff fixing a mistake; supersedes an earlier transition
] as const
export type TransitionTrigger = (typeof transitionTriggerList)[number]
export const transitionTriggerEnum = pgEnum(
  "transition_trigger",
  transitionTriggerList,
)

export const stageTransitions = pgTable(
  "stage_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => careModelEnrollments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    fromStage: careStageEnum("from_stage"),
    toStage: careStageEnum("to_stage").notNull(),
    trigger: transitionTriggerEnum("trigger").notNull(),
    reason: text("reason"),
    actorClinicianId: uuid("actor_clinician_id").references(
      () => clinicians.id,
    ),
    // For corrections: the transition being undone. That transition's
    // effects (tasks, ...) may need revisiting.
    supersedesTransitionId: uuid("supersedes_transition_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("transitions_enrollment_idx").on(t.enrollmentId, t.createdAt)],
)

// ---------------------------------------------------------------------------
// Appointments. `flag` is NULL when the appointment happened as expected.
// Bookings come from the (fake) scheduler via webhooks; `externalBookingId`
// is its id.
// ---------------------------------------------------------------------------

export const appointmentKindList = ["evaluation", "follow_up"] as const
export type AppointmentKind = (typeof appointmentKindList)[number]
export const appointmentKindEnum = pgEnum(
  "appointment_kind",
  appointmentKindList,
)

export const appointmentStatusList = [
  "scheduled",
  "completed",
  "cancelled",
] as const
export type AppointmentStatus = (typeof appointmentStatusList)[number]
export const appointmentStatusEnum = pgEnum(
  "appointment_status",
  appointmentStatusList,
)

export const appointmentFlagList = [
  "no_show",
  "late_cancelled",
  "patient_issue",
  "clinician_or_platform_issue",
] as const
export type AppointmentFlag = (typeof appointmentFlagList)[number]
export const appointmentFlagEnum = pgEnum(
  "appointment_flag",
  appointmentFlagList,
)

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    clinicianId: uuid("clinician_id")
      .notNull()
      .references(() => clinicians.id),
    kind: appointmentKindEnum("kind").notNull(),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    videoUrl: varchar("video_url", { length: 255 }),
    externalBookingId: varchar("external_booking_id", { length: 120 }),
    flag: appointmentFlagEnum("flag"),
    flagNote: text("flag_note"),
    flaggedAt: timestamp("flagged_at", { withTimezone: true }),
    flaggedByClinicianId: uuid("flagged_by_clinician_id").references(
      () => clinicians.id,
    ),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("appointments_patient_idx").on(t.patientId),
    index("appointments_clinician_starts_idx").on(t.clinicianId, t.startsAt),
    uniqueIndex("appointments_external_booking_idx").on(t.externalBookingId),
  ],
)

// ---------------------------------------------------------------------------
// Outbox. Domain events are written here in the same request as the change
// that caused them, and a worker delivers them to handlers afterwards
// (src/server/outbox/), retrying failures.
// ---------------------------------------------------------------------------

export const outboxStatusList = [
  "pending",
  "processing",
  "delivered",
  "dead", // gave up after maxAttempts
] as const
export type OutboxStatus = (typeof outboxStatusList)[number]
export const outboxStatusEnum = pgEnum("outbox_status", outboxStatusList)

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // e.g. "care_model.stage_changed", "appointment.flagged"
    type: varchar("type", { length: 80 }).notNull(),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "cascade",
    }),
    actorClinicianId: uuid("actor_clinician_id").references(
      () => clinicians.id,
    ),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("outbox_pending_idx").on(t.status, t.nextAttemptAt),
    index("outbox_patient_idx").on(t.patientId),
  ],
)

// ---------------------------------------------------------------------------
// Tasks. The clinician work queue. `type` is validated in code, not the DB,
// so adding a task type needs no migration (see features/tasks/taskTypes.ts).
// ---------------------------------------------------------------------------

export const taskStatusList = ["open", "done", "dismissed"] as const
export type TaskStatus = (typeof taskStatusList)[number]
export const taskStatusEnum = pgEnum("task_status", taskStatusList)

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: varchar("type", { length: 80 }).notNull(),
    status: taskStatusEnum("status").notNull().default("open"),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    enrollmentId: uuid("enrollment_id").references(
      () => careModelEnrollments.id,
      { onDelete: "set null" },
    ),
    // The transition that caused this task, when it came from one.
    transitionId: uuid("transition_id").references(() => stageTransitions.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    assigneeClinicianId: uuid("assignee_clinician_id").references(
      () => clinicians.id,
    ),
    sourceEventId: uuid("source_event_id").references(() => outboxEvents.id, {
      onDelete: "set null",
    }),
    // Task-type specific data. Shape is defined per type in taskTypes.ts.
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByClinicianId: uuid("completed_by_clinician_id").references(
      () => clinicians.id,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tasks_status_idx").on(t.status, t.dueAt),
    index("tasks_patient_idx").on(t.patientId),
  ],
)

// ---------------------------------------------------------------------------
// Emails. Sending is asynchronous: the provider accepts the message and
// reports delivery or bounce later through a webhook (src/server/webhooks/).
// ---------------------------------------------------------------------------

export const emailStatusList = [
  "queued", // accepted by the provider
  "delivered",
  "bounced",
  "failed", // provider rejected it outright
] as const
export type EmailStatus = (typeof emailStatusList)[number]
export const emailStatusEnum = pgEnum("email_status", emailStatusList)

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    sentByClinicianId: uuid("sent_by_clinician_id").references(
      () => clinicians.id,
    ),
    templateKey: varchar("template_key", { length: 80 }),
    toAddress: varchar("to_address", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    body: text("body").notNull(),
    status: emailStatusEnum("status").notNull(),
    providerMessageId: varchar("provider_message_id", { length: 120 }),
    statusDetail: text("status_detail"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("emails_patient_idx").on(t.patientId),
    uniqueIndex("emails_provider_message_idx").on(t.providerMessageId),
  ],
)

// ---------------------------------------------------------------------------
// Relations (for db.query.*.findMany({ with: ... }))
// ---------------------------------------------------------------------------

export const patientsRelations = relations(patients, ({ one, many }) => ({
  primaryClinician: one(clinicians, {
    fields: [patients.primaryClinicianId],
    references: [clinicians.id],
  }),
  enrollments: many(careModelEnrollments),
  appointments: many(appointments),
  tasks: many(tasks),
}))

export const enrollmentsRelations = relations(
  careModelEnrollments,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [careModelEnrollments.patientId],
      references: [patients.id],
    }),
    transitions: many(stageTransitions),
  }),
)

export const transitionsRelations = relations(stageTransitions, ({ one }) => ({
  enrollment: one(careModelEnrollments, {
    fields: [stageTransitions.enrollmentId],
    references: [careModelEnrollments.id],
  }),
  actor: one(clinicians, {
    fields: [stageTransitions.actorClinicianId],
    references: [clinicians.id],
  }),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  clinician: one(clinicians, {
    fields: [appointments.clinicianId],
    references: [clinicians.id],
  }),
}))

export const outboxRelations = relations(outboxEvents, ({ one }) => ({
  patient: one(patients, {
    fields: [outboxEvents.patientId],
    references: [patients.id],
  }),
  actor: one(clinicians, {
    fields: [outboxEvents.actorClinicianId],
    references: [clinicians.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  patient: one(patients, {
    fields: [tasks.patientId],
    references: [patients.id],
  }),
  transition: one(stageTransitions, {
    fields: [tasks.transitionId],
    references: [stageTransitions.id],
  }),
  appointment: one(appointments, {
    fields: [tasks.appointmentId],
    references: [appointments.id],
  }),
  assignee: one(clinicians, {
    fields: [tasks.assigneeClinicianId],
    references: [clinicians.id],
  }),
}))

export const emailsRelations = relations(emails, ({ one }) => ({
  patient: one(patients, {
    fields: [emails.patientId],
    references: [patients.id],
  }),
  sentBy: one(clinicians, {
    fields: [emails.sentByClinicianId],
    references: [clinicians.id],
  }),
}))

export type Clinician = typeof clinicians.$inferSelect
export type Patient = typeof patients.$inferSelect
export type Enrollment = typeof careModelEnrollments.$inferSelect
export type StageTransition = typeof stageTransitions.$inferSelect
export type Appointment = typeof appointments.$inferSelect
export type OutboxEvent = typeof outboxEvents.$inferSelect
export type Task = typeof tasks.$inferSelect
export type Email = typeof emails.$inferSelect

// Drizzle needs a SQL fragment for partial indexes.
function sqlNull(column: { name: string }) {
  return sql`${sql.identifier(column.name)} is null`
}
