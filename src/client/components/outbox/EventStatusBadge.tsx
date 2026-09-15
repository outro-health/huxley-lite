import type { OutboxStatus } from "@server/db/schema"

import { Badge, type BadgeProps } from "@/components/ui/Badge"

const display: Record<OutboxStatus, BadgeProps["variant"]> = {
  pending: "info",
  processing: "warning",
  delivered: "success",
  dead: "danger",
}

export const EventStatusBadge = ({ status }: { status: OutboxStatus }) => (
  <Badge variant={display[status]}>{status}</Badge>
)
