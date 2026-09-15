import type { AppointmentFlag, AppointmentStatus } from "@server/db/schema"

import { Badge, type BadgeProps } from "@/components/ui/Badge"

const flagDisplay: Record<
  AppointmentFlag,
  { label: string; variant: BadgeProps["variant"] }
> = {
  no_show: { label: "No-show", variant: "danger" },
  late_cancelled: { label: "Late cancel", variant: "warning" },
  patient_issue: { label: "Patient issue", variant: "warning" },
  clinician_or_platform_issue: { label: "Platform issue", variant: "warning" },
}

const statusDisplay: Record<
  AppointmentStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  scheduled: { label: "Scheduled", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "neutral" },
}

export const AppointmentStatusBadge = ({
  status,
  flag,
}: {
  status: AppointmentStatus
  flag: AppointmentFlag | null
}) => {
  const d = flag ? flagDisplay[flag] : statusDisplay[status]
  return <Badge variant={d.variant}>{d.label}</Badge>
}
