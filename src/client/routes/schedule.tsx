import { createFileRoute, Link } from "@tanstack/react-router"

import { AppointmentRowActions } from "@/components/appointments/AppointmentRowActions"
import { AppointmentStatusBadge } from "@/components/appointments/FlagBadge"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { api, type RouterOutputs } from "@/lib/api"
import { fmtDateTime, fullName } from "@/lib/format"

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
})

function SchedulePage() {
  const schedule = api.appointments.mySchedule.useQuery()

  if (schedule.isPending) {
    return <Spinner />
  }
  if (schedule.isError) {
    return <div className="text-danger">{schedule.error.message}</div>
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Your upcoming and recent appointments."
      />
      <h2 className="mb-2 text-md font-medium">Upcoming</h2>
      <AppointmentsTable
        rows={schedule.data.upcoming}
        empty="Nothing booked."
      />
      <h2 className="mb-2 mt-8 text-md font-medium">Recent</h2>
      <AppointmentsTable
        rows={schedule.data.past}
        empty="No past appointments."
      />
    </>
  )
}

type Row = RouterOutputs["appointments"]["mySchedule"]["upcoming"][number]

function AppointmentsTable({ rows, empty }: { rows: Row[]; empty: string }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th>Patient</Th>
          <Th>Kind</Th>
          <Th>Status</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <EmptyRow colSpan={5}>{empty}</EmptyRow>}
        {rows.map((a) => (
          <tr key={a.id}>
            <Td className="whitespace-nowrap">{fmtDateTime(a.startsAt)}</Td>
            <Td>
              <Link
                to="/patients/$patientId"
                params={{ patientId: a.patientId }}
                className="font-medium text-accent hover:underline"
              >
                {fullName(a.patient)}
              </Link>
            </Td>
            <Td className="capitalize">{a.kind.replace("_", " ")}</Td>
            <Td>
              <AppointmentStatusBadge status={a.status} flag={a.flag} />
            </Td>
            <Td>
              <AppointmentRowActions appointment={a} />
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
