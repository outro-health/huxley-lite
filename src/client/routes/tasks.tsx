import type { TaskStatus } from "@server/db/schema"
import { createFileRoute, Link } from "@tanstack/react-router"
import { isPast } from "date-fns"
import { useState } from "react"

import { TaskActions } from "@/components/tasks/TaskActions"
import { TaskTypeBadge } from "@/components/tasks/TaskTypeBadge"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { api } from "@/lib/api"
import { fmtDue, fullName } from "@/lib/format"
import { cx } from "@/lib/utils"

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
})

function TasksPage() {
  const [status, setStatus] = useState<TaskStatus>("open")
  const tasks = api.tasks.list.useQuery({ status })

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Things that need a clinician. Tasks are created automatically when something happens to a patient."
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
      </Tabs>
      {tasks.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Task</Th>
              <Th>Patient</Th>
              <Th>Assignee</Th>
              <Th>Due</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {tasks.data?.length === 0 && (
              <EmptyRow colSpan={5}>Nothing here.</EmptyRow>
            )}
            {tasks.data?.map((task) => (
              <tr key={task.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <TaskTypeBadge type={task.type} />
                    <span className="font-medium">{task.title}</span>
                  </div>
                  {task.description && (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {task.description}
                    </div>
                  )}
                </Td>
                <Td>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: task.patientId }}
                    className="text-accent hover:underline"
                  >
                    {fullName(task.patient)}
                  </Link>
                </Td>
                <Td className="text-muted-foreground">
                  {task.assignee?.name ?? "Unassigned"}
                </Td>
                <Td
                  className={cx(
                    "whitespace-nowrap text-sm",
                    task.status === "open" && task.dueAt && isPast(task.dueAt)
                      ? "text-danger"
                      : "text-muted-foreground",
                  )}
                >
                  {fmtDue(task.dueAt)}
                </Td>
                <Td>
                  <TaskActions task={task} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
