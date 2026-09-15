import { isTaskType, taskTypeLabels } from "@server/features/tasks/taskTypes"

import { Badge } from "@/components/ui/Badge"

export const TaskTypeBadge = ({ type }: { type: string }) => (
  <Badge variant="neutral">
    {isTaskType(type) ? taskTypeLabels[type] : type}
  </Badge>
)
