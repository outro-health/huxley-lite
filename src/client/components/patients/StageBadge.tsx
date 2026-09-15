import type { CareStage } from "@server/db/schema"

import { Badge, type BadgeProps } from "@/components/ui/Badge"

const display: Record<
  CareStage,
  { label: string; variant: BadgeProps["variant"] }
> = {
  intake: { label: "Intake", variant: "neutral" },
  evaluation: { label: "Evaluation", variant: "info" },
  decision_pending: { label: "Decision pending", variant: "warning" },
  eligible: { label: "Eligible", variant: "success" },
  active_care: { label: "Active care", variant: "success" },
  ineligible: { label: "Not eligible", variant: "danger" },
  archived: { label: "Archived", variant: "neutral" },
}

export const StageBadge = ({ stage }: { stage: CareStage }) => (
  <Badge variant={display[stage].variant}>{display[stage].label}</Badge>
)
