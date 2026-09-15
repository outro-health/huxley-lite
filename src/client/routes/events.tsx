import { createFileRoute, Link } from "@tanstack/react-router"
import { toast } from "sonner"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { api } from "@/lib/api"
import { describeEvent, describeStatus } from "@/lib/describeEvent"
import { fmtDateTime, fullName } from "@/lib/format"

export const Route = createFileRoute("/events")({
  component: EventsPage,
})

function EventsPage() {
  const events = api.outbox.list.useQuery(undefined, { refetchInterval: 2000 })
  const utils = api.useUtils()
  const rerun = api.outbox.redeliver.useMutation({
    onSuccess: (summary) => {
      if (summary.dead > 0) {
        toast.error("The follow-up work failed. See the error on the row.")
      } else if (summary.failed > 0) {
        toast.warning("The follow-up work failed; it will be retried.")
      } else {
        toast.success("Follow-up work ran again.")
      }
      utils.invalidate()
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <>
      <PageHeader
        title="Events"
        description="Things that happened to patients, and whether the follow-up work for each (creating tasks, syncing the EHR) has run."
      />
      {events.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>What happened</Th>
              <Th>Patient</Th>
              <Th>Follow-up</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {events.data?.length === 0 && (
              <EmptyRow colSpan={5}>Nothing has happened yet.</EmptyRow>
            )}
            {events.data?.map((event) => {
              const status = describeStatus(event)
              return (
                <tr key={event.id}>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {fmtDateTime(event.createdAt)}
                  </Td>
                  <Td>
                    <div>{describeEvent(event)}</div>
                    <details className="mt-0.5">
                      <summary className="cursor-pointer text-xs text-subtle-foreground">
                        {event.type}
                        {event.actor ? ` · by ${event.actor.name}` : ""}
                      </summary>
                      <pre className="mt-1 max-w-md overflow-x-auto rounded-sm bg-muted p-2 text-xs text-muted-foreground">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
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
                    <Badge
                      variant={
                        status.tone === "ok"
                          ? "success"
                          : status.tone === "bad"
                            ? "danger"
                            : "info"
                      }
                    >
                      {status.label}
                    </Badge>
                    {event.attempts > 1 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {event.attempts} tries
                      </span>
                    )}
                    {event.lastError && (
                      <div
                        className="mt-0.5 max-w-xs truncate text-xs text-danger"
                        title={event.lastError}
                      >
                        {event.lastError}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Run this event's follow-up work again, as if it had just happened."
                      loading={
                        rerun.isPending && rerun.variables?.eventId === event.id
                      }
                      onClick={() => rerun.mutate({ eventId: event.id })}
                    >
                      Run again
                    </Button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </>
  )
}
