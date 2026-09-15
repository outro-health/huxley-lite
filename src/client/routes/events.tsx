import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"

import { EventStatusBadge } from "@/components/outbox/EventStatusBadge"
import { Button } from "@/components/ui/Button"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { api } from "@/lib/api"
import { fmtDateTime, fullName } from "@/lib/format"

export const Route = createFileRoute("/events")({
  component: EventsPage,
})

function EventsPage() {
  const events = api.outbox.list.useQuery(undefined, { refetchInterval: 2000 })
  const utils = api.useUtils()
  const redeliver = api.outbox.redeliver.useMutation({
    onSuccess: (summary) => {
      const text = `Redelivered: ${summary.delivered} ok, ${summary.failed} retrying, ${summary.dead} dead`
      if (summary.dead > 0) {
        toast.error(`${text}. See the error on the event row.`)
      } else if (summary.failed > 0) {
        toast.warning(`${text}. The worker will try again.`)
      } else {
        toast.success(text)
      }
      utils.invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <>
      <PageHeader
        title="Events"
        description="Everything written to the outbox and what the worker did with it. Redeliver runs an event's handlers again."
      />
      {events.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Event</Th>
              <Th>Patient</Th>
              <Th>Status</Th>
              <Th>Attempts</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {events.data?.length === 0 && (
              <EmptyRow colSpan={6}>No events yet.</EmptyRow>
            )}
            {events.data?.map((event) => (
              <tr key={event.id}>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {fmtDateTime(event.createdAt)}
                </Td>
                <Td>
                  <div className="font-mono text-sm">{event.type}</div>
                  <div className="max-w-md truncate font-mono text-xs text-subtle-foreground">
                    {JSON.stringify(event.payload)}
                  </div>
                </Td>
                <Td>
                  {event.patient ? (
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: event.patient.id }}
                      className="text-accent hover:underline"
                    >
                      {fullName(event.patient)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Td>
                <Td>
                  <EventStatusBadge status={event.status} />
                  {event.lastError && (
                    <div
                      className="mt-0.5 max-w-xs truncate text-xs text-danger"
                      title={event.lastError}
                    >
                      {event.lastError}
                    </div>
                  )}
                </Td>
                <Td className="text-muted-foreground">
                  {event.attempts}/{event.maxAttempts}
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={
                      redeliver.isPending &&
                      redeliver.variables?.eventId === event.id
                    }
                    onClick={() => redeliver.mutate({ eventId: event.id })}
                  >
                    Redeliver
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
