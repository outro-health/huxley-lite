import { createFileRoute, Link } from "@tanstack/react-router"

import { StageBadge } from "@/components/patients/StageBadge"
import { PageHeader, Spinner } from "@/components/ui/PageHeader"
import { Table, Td, Th } from "@/components/ui/Table"
import { api } from "@/lib/api"
import { fullName } from "@/lib/format"

export const Route = createFileRoute("/patients/")({
  component: PatientsPage,
})

function PatientsPage() {
  const patients = api.patients.list.useQuery()

  return (
    <>
      <PageHeader title="Patients" />
      {patients.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Stage</Th>
              <Th>State</Th>
              <Th>Medication</Th>
              <Th>Clinician</Th>
            </tr>
          </thead>
          <tbody>
            {patients.data?.map((patient) => (
              <tr key={patient.id}>
                <Td>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: patient.id }}
                    className="font-medium text-accent hover:underline"
                  >
                    {fullName(patient)}
                  </Link>
                  <div className="text-sm text-muted-foreground">
                    {patient.email}
                  </div>
                </Td>
                <Td>
                  {patient.enrollment ? (
                    <StageBadge stage={patient.enrollment.stage} />
                  ) : (
                    <span className="text-muted-foreground">No enrollment</span>
                  )}
                </Td>
                <Td>{patient.state}</Td>
                <Td>
                  {patient.medicationName}{" "}
                  <span className="text-muted-foreground">
                    {patient.medicationDose}
                  </span>
                </Td>
                <Td className="text-muted-foreground">
                  {patient.primaryClinician?.name ?? "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}
