import type { EmailStatus } from "@server/db/schema"

import { Badge, type BadgeProps } from "@/components/ui/Badge"

const display: Record<EmailStatus, BadgeProps["variant"]> = {
  queued: "info",
  delivered: "success",
  bounced: "danger",
  failed: "danger",
}

export const EmailStatusBadge = ({ status }: { status: EmailStatus }) => (
  <Badge variant={display[status]}>{status}</Badge>
)
