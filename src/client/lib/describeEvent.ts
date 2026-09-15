import type { RouterOutputs } from "./api"

type EventRow = RouterOutputs["outbox"]["list"][number]

const stageLabel: Record<string, string> = {
  intake: "Intake",
  evaluation: "Evaluation",
  decision_pending: "Decision pending",
  eligible: "Eligible",
  active_care: "Active care",
  ineligible: "Not eligible",
  archived: "Archived",
}

const flagLabel: Record<string, string> = {
  no_show: "no-show",
  late_cancelled: "late cancellation",
  patient_issue: "patient issue",
  clinician_or_platform_issue: "clinician or platform issue",
}

const str = (v: unknown) => (typeof v === "string" ? v : null)

/** A one-line, human sentence for an event. */
export const describeEvent = (event: EventRow): string => {
  const p = event.payload
  switch (event.type) {
    case "care_model.stage_changed": {
      const from = str(p.from)
      const to = str(p.to)
      return `Stage changed${from ? ` from ${stageLabel[from] ?? from}` : ""} to ${to ? (stageLabel[to] ?? to) : "?"}`
    }
    case "care_model.stage_corrected": {
      const from = str(p.from)
      const to = str(p.to)
      return `Stage corrected${from ? ` from ${stageLabel[from] ?? from}` : ""} to ${to ? (stageLabel[to] ?? to) : "?"}`
    }
    case "care_model.enrollment_restarted":
      return "Care restarted from intake"
    case "appointment.booked":
      return `Appointment booked (${str(p.kind)?.replace("_", " ") ?? "unknown kind"})`
    case "appointment.cancelled":
      return `Appointment cancelled${str(p.reason) ? `: ${str(p.reason)}` : ""}`
    case "appointment.completed":
      return `Appointment completed (${str(p.kind)?.replace("_", " ") ?? "unknown kind"})`
    case "appointment.flagged": {
      const flag = str(p.flag)
      return `Appointment flagged as ${flag ? (flagLabel[flag] ?? flag) : "?"}`
    }
    case "email.bounced":
      return `Email to ${str(p.toAddress) ?? "patient"} bounced`
    default:
      return event.type
  }
}

export const describeStatus = (
  event: EventRow,
): { label: string; tone: "ok" | "wait" | "bad" } => {
  switch (event.status) {
    case "delivered":
      return { label: "Done", tone: "ok" }
    case "pending":
      return {
        label: event.attempts > 0 ? "Will retry" : "Waiting",
        tone: "wait",
      }
    case "processing":
      return { label: "Running", tone: "wait" }
    case "dead":
      return { label: "Failed, gave up", tone: "bad" }
  }
}
