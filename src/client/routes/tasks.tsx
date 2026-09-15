import type { TaskStatus } from "@server/db/schema"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import { TaskList } from "@/components/tasks/TaskList"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { api } from "@/lib/api"

export const Route = createFileRoute("/tasks")({
  component: TasksPage,
})

const empty: Record<TaskStatus, string> = {
  open: "Nothing to do right now.",
  done: "No completed tasks yet.",
  dismissed: "No dismissed tasks.",
}

function TasksPage() {
  const [status, setStatus] = useState<TaskStatus>("open")
  const tasks = api.tasks.list.useQuery({ status }, { refetchInterval: 3000 })

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Work waiting for a clinician. Tasks appear here on their own when something happens to a patient, such as being marked eligible."
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
      ) : tasks.data?.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {empty[status]}
        </p>
      ) : (
        <TaskList tasks={tasks.data ?? []} />
      )}
    </>
  )
}
