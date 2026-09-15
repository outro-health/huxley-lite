import type { CareStage } from "@server/db/schema"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog"
import { Label, Select, Textarea } from "@/components/ui/Field"
import { api } from "@/lib/api"

/**
 * Staff correction: the patient is in the wrong stage. Any stage is allowed;
 * a reason is required and the correction is recorded against the transition
 * it undoes.
 */
export function ModalCorrectStage({
  patientId,
  currentStage,
}: {
  patientId: string
  currentStage: CareStage
}) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState<CareStage>(currentStage)
  const [reason, setReason] = useState("")
  const utils = api.useUtils()
  const stages = api.careModel.stages.useQuery()

  const correct = api.careModel.correctStage.useMutation({
    onSuccess: () => {
      toast.success("Stage corrected")
      utils.patients.invalidate()
      utils.careModel.invalidate()
      utils.tasks.invalidate()
      utils.outbox.invalidate()
      setOpen(false)
      setReason("")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Correct stage</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Correct stage</DialogTitle>
        <DialogDescription>
          For fixing mistakes. This bypasses the care model's normal moves and
          is recorded as a correction.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <Label htmlFor="correct-to">Move to</Label>
            <Select
              id="correct-to"
              value={to}
              onChange={(e) => setTo(e.target.value as CareStage)}
            >
              {stages.data?.stages.map((stage) => (
                <option
                  key={stage}
                  value={stage}
                  disabled={stage === currentStage}
                >
                  {stages.data.labels[stage]}
                  {stage === currentStage ? " (current)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="correct-reason">Reason (required)</Label>
            <Textarea
              id="correct-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What went wrong?"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={to === currentStage || !reason.trim()}
            loading={correct.isPending}
            onClick={() => correct.mutate({ patientId, to, reason })}
          >
            Correct
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
