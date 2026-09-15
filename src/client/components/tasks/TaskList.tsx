import { Link } from "@tanstack/react-router"
import { isPast } from "date-fns"

import { Badge } from "@/components/ui/Badge"
import { fmtDateTime, fmtDue, fullName } from "@/lib/format"
import { cx } from "@/lib/utils"
import { TaskActions } from "./TaskActions"
import { TaskTypeBadge } from "./TaskTypeBadge"

type TaskRow = {
  id: string
  type: string
  status: string
  title: string
  description: string | null
  patientId: string
  dueAt: Date | null
  createdAt: Date
  completedAt: Date | null
  patient?: { firstName: string; lastName: string } | null
  assignee?: { name: string } | null
}

/** Stacked cards: one task per row, actions on the right. */
export function TaskList({
  tasks,
  showPatient = true,
}: {
  tasks: TaskRow[]
  showPatient?: boolean
}) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => {
        const overdue =
          task.status === "open" && task.dueAt !== null && isPast(task.dueAt)
        return (
          <li
            key={task.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-hairline bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{task.title}</span>
                <TaskTypeBadge type={task.type} />
                {task.status !== "open" && (
                  <Badge variant="neutral">{task.status}</Badge>
                )}
              </div>
              {task.description && (
                <p className="mt-1 text-muted-foreground">{task.description}</p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {showPatient && task.patient && (
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: task.patientId }}
                    className="text-accent hover:underline"
                  >
                    {fullName(task.patient)}
                  </Link>
                )}
                <span>{task.assignee?.name ?? "Unassigned"}</span>
                {task.status === "open" ? (
                  <span className={cx(overdue && "text-danger")}>
                    {fmtDue(task.dueAt)}
                  </span>
                ) : (
                  task.completedAt && (
                    <span>Closed {fmtDateTime(task.completedAt)}</span>
                  )
                )}
              </div>
            </div>
            <div className="shrink-0">
              <TaskActions task={task} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
