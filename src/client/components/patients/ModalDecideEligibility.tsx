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
import { Label, Textarea } from "@/components/ui/Field"
import { api } from "@/lib/api"
import { cx } from "@/lib/utils"

type Decision = "eligible" | "ineligible"

const OPTIONS: { value: Decision; label: string; description: string }[] = [
  {
    value: "eligible",
    label: "Eligible",
    description:
      "Ungate the patient, create their chart, and queue follow-up work.",
  },
  {
    value: "ineligible",
    label: "Not eligible",
    description: "Requires a clinical note explaining the decision.",
  },
]

export function ModalDecideEligibility({
  patientId,
  patientName,
}: {
  patientId: string
  patientName: string
}) {
  const [open, setOpen] = useState(false)
  const [decision, setDecision] = useState<Decision | null>(null)
  const [note, setNote] = useState("")
  const utils = api.useUtils()

  const decide = api.patients.decideEligibility.useMutation({
    onSuccess: (_, variables) => {
      toast.success(
        `${patientName} marked ${variables.decision === "eligible" ? "eligible" : "not eligible"}`,
      )
      utils.patients.invalidate()
      utils.careModel.invalidate()
      utils.tasks.invalidate()
      utils.outbox.invalidate()
      setOpen(false)
      setDecision(null)
      setNote("")
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">Decide eligibility</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Eligibility decision</DialogTitle>
        <DialogDescription>
          Is {patientName} a good fit for the program?
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDecision(option.value)}
              className={cx(
                "rounded-md border px-3 py-2 text-left hover:bg-muted",
                decision === option.value
                  ? "border-foreground bg-muted"
                  : "border-border",
              )}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-muted-foreground">
                {option.description}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <Label htmlFor="eligibility-note">
            Clinical note{" "}
            {decision === "ineligible" ? "(required)" : "(optional)"}
          </Label>
          <Textarea
            id="eligibility-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this decision?"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={!decision}
            loading={decide.isPending}
            onClick={() =>
              decision && decide.mutate({ patientId, decision, note })
            }
          >
            Save decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
