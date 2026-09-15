import type { AppointmentFlag } from "@server/db/schema"
import { useEffect, useState } from "react"
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

const OPTIONS: {
  value: AppointmentFlag
  label: string
  description: string
}[] = [
  {
    value: "no_show",
    label: "No-show",
    description: "Patient didn't show and didn't cancel.",
  },
  {
    value: "late_cancelled",
    label: "Late cancel",
    description: "Cancelled inside the 24h window.",
  },
  {
    value: "patient_issue",
    label: "Patient issue",
    description: "Couldn't complete, patient side (tech, wrong state).",
  },
  {
    value: "clinician_or_platform_issue",
    label: "Clinician / platform issue",
    description: "Couldn't complete, our side.",
  },
]

export function ModalFlagAppointment({
  appointmentId,
  currentFlag,
  currentNote,
  children,
}: {
  appointmentId: string
  currentFlag: AppointmentFlag | null
  currentNote: string | null
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [flag, setFlag] = useState<AppointmentFlag | null>(currentFlag)
  const [note, setNote] = useState(currentNote ?? "")
  const utils = api.useUtils()

  // Re-seed each time the modal opens so it shows what's recorded now.
  useEffect(() => {
    if (open) {
      setFlag(currentFlag)
      setNote(currentNote ?? "")
    }
  }, [open, currentFlag, currentNote])

  const mutation = api.appointments.flag.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.flag ? "Appointment flagged" : "Flag cleared")
      utils.appointments.invalidate()
      utils.tasks.invalidate()
      setOpen(false)
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>What happened?</DialogTitle>
        <DialogDescription>
          Record why this appointment didn't go to plan.
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-2">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFlag(option.value)}
              className={cx(
                "rounded-md border px-3 py-2 text-left hover:bg-muted",
                flag === option.value
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
          <Label htmlFor="flag-note">Note (optional)</Label>
          <Textarea
            id="flag-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          {currentFlag && (
            <Button
              variant="ghost"
              className="mr-auto"
              loading={mutation.isPending}
              onClick={() =>
                mutation.mutate({ appointmentId, flag: null, note: "" })
              }
            >
              Clear flag
            </Button>
          )}
          <DialogClose asChild>
            <Button>Cancel</Button>
          </DialogClose>
          <Button
            variant="primary"
            disabled={!flag}
            loading={mutation.isPending}
            onClick={() =>
              flag && mutation.mutate({ appointmentId, flag, note })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
