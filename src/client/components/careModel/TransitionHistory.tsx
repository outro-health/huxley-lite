import { RiArrowRightLine } from "@remixicon/react"

import { StageBadge } from "@/components/patients/StageBadge"
import { Badge } from "@/components/ui/Badge"
import { Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { api } from "@/lib/api"
import { fmtDateTime } from "@/lib/format"

export function TransitionHistory({ patientId }: { patientId: string }) {
  const history = api.careModel.history.useQuery({ patientId })
  if (history.isPending) {
    return <Spinner />
  }
  const superseded = new Set(
    history.data?.map((t) => t.supersedesTransitionId).filter(Boolean),
  )
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th>Move</Th>
          <Th>Trigger</Th>
          <Th>Reason</Th>
          <Th>By</Th>
        </tr>
      </thead>
      <tbody>
        {history.data?.length === 0 && (
          <EmptyRow colSpan={5}>No history.</EmptyRow>
        )}
        {history.data?.map((t) => (
          <tr
            key={t.id}
            className={superseded.has(t.id) ? "opacity-50" : undefined}
          >
            <Td className="whitespace-nowrap">{fmtDateTime(t.createdAt)}</Td>
            <Td>
              <span className="inline-flex items-center gap-1.5">
                {t.fromStage ? (
                  <StageBadge stage={t.fromStage} />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
                <RiArrowRightLine className="size-3.5 text-subtle-foreground" />
                <StageBadge stage={t.toStage} />
              </span>
              {superseded.has(t.id) && (
                <span className="ml-2 text-xs text-muted-foreground">
                  superseded
                </span>
              )}
            </Td>
            <Td>
              <Badge
                variant={t.trigger === "correction" ? "warning" : "neutral"}
              >
                {t.trigger}
              </Badge>
            </Td>
            <Td className="max-w-md text-muted-foreground">
              {t.reason ?? "—"}
            </Td>
            <Td className="text-muted-foreground">
              {t.actor?.name ?? "system"}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
