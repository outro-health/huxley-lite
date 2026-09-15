import type { CareStage } from "@server/db/schema"
import { createFileRoute } from "@tanstack/react-router"

import { AppointmentRowActions } from "@/components/appointments/AppointmentRowActions"
import { AppointmentStatusBadge } from "@/components/appointments/FlagBadge"
import { ModalCorrectStage } from "@/components/careModel/ModalCorrectStage"
import { TransitionHistory } from "@/components/careModel/TransitionHistory"
import { EmailStatusBadge } from "@/components/emails/EmailStatusBadge"
import { ModalDecideEligibility } from "@/components/patients/ModalDecideEligibility"
import { StageBadge } from "@/components/patients/StageBadge"
import { TaskList } from "@/components/tasks/TaskList"
import { Card, CardTitle } from "@/components/ui/Card"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { EmptyRow, Table, Td, Th } from "@/components/ui/Table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { api } from "@/lib/api"
import { fmtDate, fmtDateTime, fullName } from "@/lib/format"

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientPage,
})

const canDecide = (stage: CareStage) =>
  stage === "decision_pending" || stage === "eligible" || stage === "ineligible"

function PatientPage() {
  const { patientId } = Route.useParams()
  const patient = api.patients.get.useQuery(
    { patientId },
    { refetchInterval: 3000 },
  )

  if (patient.isPending) {
    return <Spinner />
  }
  if (patient.isError) {
    return <div className="text-danger">{patient.error.message}</div>
  }
  const p = patient.data

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {fullName(p)}{" "}
            {p.enrollment ? (
              <StageBadge stage={p.enrollment.stage} />
            ) : (
              <span className="text-base text-muted-foreground">
                No enrollment
              </span>
            )}
          </span>
        }
        description={`${p.email} · ${p.state} · DOB ${p.dateOfBirth}`}
        actions={
          p.enrollment && canDecide(p.enrollment.stage) ? (
            <ModalDecideEligibility
              patientId={p.id}
              patientName={fullName(p)}
              revising={p.enrollment.stage !== "decision_pending"}
            />
          ) : null
        }
      />

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="careModel">Care model</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>Medication</CardTitle>
              <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-base">
                <dt className="text-muted-foreground">Current</dt>
                <dd>
                  {p.medicationName} {p.medicationDose}
                </dd>
                <dt className="text-muted-foreground">Clinician</dt>
                <dd>{p.primaryClinician?.name ?? "Unassigned"}</dd>
                <dt className="text-muted-foreground">EHR chart</dt>
                <dd>
                  {p.ehrPatientId ?? (
                    <span className="text-muted-foreground">Not created</span>
                  )}
                </dd>
              </dl>
            </Card>
            <Card>
              <CardTitle>Eligibility</CardTitle>
              {p.enrollment?.eligibilityDecidedAt ? (
                <div className="text-base">
                  <div>
                    Decided {fmtDate(p.enrollment.eligibilityDecidedAt)}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                    {p.enrollment.eligibilityNote ?? "No note."}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No decision recorded yet.
                </p>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="careModel">
          {p.enrollment && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-hairline bg-card px-4 py-3">
              <p className="text-muted-foreground">
                Every stage change is recorded below. If a patient is in the
                wrong stage because of a mistake, correct it here.
              </p>
              <ModalCorrectStage
                patientId={p.id}
                currentStage={p.enrollment.stage}
              />
            </div>
          )}
          <TransitionHistory patientId={patientId} />
        </TabsContent>
        <TabsContent value="appointments">
          <PatientAppointments patientId={patientId} />
        </TabsContent>
        <TabsContent value="tasks">
          <PatientTasks patientId={patientId} />
        </TabsContent>
        <TabsContent value="emails">
          <PatientEmails patientId={patientId} />
        </TabsContent>
      </Tabs>
    </>
  )
}

function PatientAppointments({ patientId }: { patientId: string }) {
  const appointments = api.appointments.listForPatient.useQuery({ patientId })
  if (appointments.isPending) {
    return <Spinner />
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>When</Th>
          <Th>Kind</Th>
          <Th>Clinician</Th>
          <Th>Status</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {appointments.data?.length === 0 && (
          <EmptyRow colSpan={5}>No appointments.</EmptyRow>
        )}
        {appointments.data?.map((a) => (
          <tr key={a.id}>
            <Td className="whitespace-nowrap">{fmtDateTime(a.startsAt)}</Td>
            <Td className="capitalize">{a.kind.replace("_", " ")}</Td>
            <Td className="text-muted-foreground">{a.clinician.name}</Td>
            <Td>
              <AppointmentStatusBadge status={a.status} flag={a.flag} />
              {a.flagNote && (
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {a.flagNote}
                </div>
              )}
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

function PatientTasks({ patientId }: { patientId: string }) {
  const tasks = api.tasks.listForPatient.useQuery(
    { patientId },
    { refetchInterval: 3000 },
  )
  if (tasks.isPending) {
    return <Spinner />
  }
  if (tasks.data?.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">No tasks.</p>
  }
  return <TaskList tasks={tasks.data ?? []} showPatient={false} />
}

function PatientEmails({ patientId }: { patientId: string }) {
  const emails = api.emails.listForPatient.useQuery(
    { patientId },
    { refetchInterval: 3000 },
  )
  if (emails.isPending) {
    return <Spinner />
  }
  if (emails.data?.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No emails sent yet.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {emails.data?.map((email) => (
        <Card key={email.id}>
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-center gap-2 font-medium">
              {email.subject} <EmailStatusBadge status={email.status} />
            </div>
            <div className="whitespace-nowrap text-sm text-muted-foreground">
              {fmtDateTime(email.createdAt)} · {email.sentBy?.name ?? "system"}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            To {email.toAddress}
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-base">
            {email.body}
          </pre>
        </Card>
      ))}
    </div>
  )
}
