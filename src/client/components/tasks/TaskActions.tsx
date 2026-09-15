import { toast } from "sonner"

import { ModalSendEmail } from "@/components/emails/ModalSendEmail"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"

type TaskLike = { id: string; type: string; status: string }

/**
 * The buttons a clinician can press on a task. The primary action depends on
 * the task type; every open task can also be dismissed.
 */
export function TaskActions({ task }: { task: TaskLike }) {
  const utils = api.useUtils()
  const close = api.tasks.close.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "done" ? "Task done" : "Task dismissed",
      )
      utils.tasks.invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (task.status !== "open") {
    return null
  }

  return (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        loading={close.isPending}
        onClick={() => close.mutate({ taskId: task.id, status: "dismissed" })}
      >
        Dismiss
      </Button>
      <PrimaryAction task={task} />
    </div>
  )
}

function PrimaryAction({ task }: { task: TaskLike }) {
  switch (task.type) {
    case "send_welcome_email":
      return (
        <ModalSendEmail taskId={task.id}>
          <Button size="sm" variant="primary">
            Draft email
          </Button>
        </ModalSendEmail>
      )
    default:
      return null
  }
}
