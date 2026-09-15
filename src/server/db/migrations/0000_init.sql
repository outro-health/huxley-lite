CREATE TYPE "public"."appointment_flag" AS ENUM('no_show', 'late_cancelled', 'patient_issue', 'clinician_or_platform_issue');--> statement-breakpoint
CREATE TYPE "public"."appointment_kind" AS ENUM('evaluation', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."care_stage" AS ENUM('intake', 'evaluation', 'decision_pending', 'eligible', 'active_care', 'ineligible', 'archived');--> statement-breakpoint
CREATE TYPE "public"."clinician_role" AS ENUM('clinician', 'operations');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('queued', 'delivered', 'bounced', 'failed');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'processing', 'delivered', 'dead');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."transition_trigger" AS ENUM('system', 'manual', 'correction');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinician_id" uuid NOT NULL,
	"kind" "appointment_kind" NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"video_url" varchar(255),
	"external_booking_id" varchar(120),
	"flag" "appointment_flag",
	"flag_note" text,
	"flagged_at" timestamp with time zone,
	"flagged_by_clinician_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_model_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"stage" "care_stage" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"eligibility_note" text,
	"eligibility_decided_at" timestamp with time zone,
	"eligibility_decided_by_clinician_id" uuid
);
--> statement-breakpoint
CREATE TABLE "clinicians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "clinician_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"task_id" uuid,
	"sent_by_clinician_id" uuid,
	"template_key" varchar(80),
	"to_address" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"status" "email_status" NOT NULL,
	"provider_message_id" varchar(120),
	"status_detail" text,
	"status_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(80) NOT NULL,
	"patient_id" uuid,
	"actor_clinician_id" uuid,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(80) NOT NULL,
	"last_name" varchar(80) NOT NULL,
	"email" varchar(255) NOT NULL,
	"state" varchar(2) NOT NULL,
	"date_of_birth" varchar(10) NOT NULL,
	"medication_name" varchar(120) NOT NULL,
	"medication_dose" varchar(60) NOT NULL,
	"primary_clinician_id" uuid,
	"ehr_patient_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"from_stage" "care_stage",
	"to_stage" "care_stage" NOT NULL,
	"trigger" "transition_trigger" NOT NULL,
	"reason" text,
	"actor_clinician_id" uuid,
	"supersedes_transition_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(80) NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"patient_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"transition_id" uuid,
	"appointment_id" uuid,
	"assignee_clinician_id" uuid,
	"source_event_id" uuid,
	"payload" jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by_clinician_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinician_id_clinicians_id_fk" FOREIGN KEY ("clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_flagged_by_clinician_id_clinicians_id_fk" FOREIGN KEY ("flagged_by_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_model_enrollments" ADD CONSTRAINT "care_model_enrollments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_model_enrollments" ADD CONSTRAINT "care_model_enrollments_eligibility_decided_by_clinician_id_clinicians_id_fk" FOREIGN KEY ("eligibility_decided_by_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_sent_by_clinician_id_clinicians_id_fk" FOREIGN KEY ("sent_by_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_actor_clinician_id_clinicians_id_fk" FOREIGN KEY ("actor_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_primary_clinician_id_clinicians_id_fk" FOREIGN KEY ("primary_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_enrollment_id_care_model_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."care_model_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_actor_clinician_id_clinicians_id_fk" FOREIGN KEY ("actor_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_enrollment_id_care_model_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."care_model_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_transition_id_stage_transitions_id_fk" FOREIGN KEY ("transition_id") REFERENCES "public"."stage_transitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_clinician_id_clinicians_id_fk" FOREIGN KEY ("assignee_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_event_id_outbox_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."outbox_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_clinician_id_clinicians_id_fk" FOREIGN KEY ("completed_by_clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_clinician_starts_idx" ON "appointments" USING btree ("clinician_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_external_booking_idx" ON "appointments" USING btree ("external_booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_one_active_idx" ON "care_model_enrollments" USING btree ("patient_id") WHERE "ended_at" is null;--> statement-breakpoint
CREATE INDEX "emails_patient_idx" ON "emails" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_provider_message_idx" ON "emails" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "outbox_patient_idx" ON "outbox_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "transitions_enrollment_idx" ON "stage_transitions" USING btree ("enrollment_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "tasks_patient_idx" ON "tasks" USING btree ("patient_id");