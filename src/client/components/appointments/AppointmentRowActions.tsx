import type { Appointment } from "@server/db/schema"
import { toast } from "sonner"

import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"
import { ModalFlagAppointment } from "./ModalFlagAppointment"

export function AppointmentRowActions({
  appointment,
}: {
  appointment: Appointment
}) {
  const utils = api.useUtils()
  const complete = api.appointments.complete.useMutation({
    onSuccess: () => {
      toast.success("Appointment completed")
      utils.appointments.invalidate()
      utils.patients.invalidate()
      utils.tasks.invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  if (appointment.status !== "scheduled") {
    return null
  }

  return (
    <div className="flex justify-end gap-1">
      <ModalFlagAppointment
        appointmentId={appointment.id}
        currentFlag={appointment.flag}
        currentNote={appointment.flagNote}
      >
        <Button size="sm" variant="ghost">
          {appointment.flag ? "Edit flag" : "Flag"}
        </Button>
      </ModalFlagAppointment>
      {!appointment.flag && (
        <Button
          size="sm"
          loading={complete.isPending}
          onClick={() => complete.mutate({ appointmentId: appointment.id })}
        >
          Mark completed
        </Button>
      )}
    </div>
  )
}
