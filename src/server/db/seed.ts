import { addDays, addMinutes, setHours, setMinutes, subDays } from "date-fns"
import { db, schema } from "./client"
import type { CareStage } from "./schema"

// Deterministic ids so URLs are stable between resets.
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

export const seedIds = {
  clinicians: { maya: id(1), sam: id(2) },
  patients: {
    ana: id(101),
    ben: id(102),
    chloe: id(103),
    devon: id(104),
    elena: id(105),
    farid: id(106),
    grace: id(107),
    hugo: id(108),
  },
}

const daysAgo = (n: number) => subDays(new Date(), n)
const at = (daysFromNow: number, hour: number, minute = 0) =>
  setMinutes(setHours(addDays(new Date(), daysFromNow), hour), minute)

type SeedPatient = {
  id: string
  firstName: string
  lastName: string
  email: string
  state: string
  dateOfBirth: string
  medicationName: string
  medicationDose: string
  primaryClinicianId: string | null
  ehrPatientId?: string
  // The stages they went through, oldest first; the last is current.
  path: {
    to: CareStage
    daysAgo: number
    trigger?: "system" | "manual"
    reason?: string
  }[]
  eligibility?: { note: string; daysAgo: number }
}

export async function seedIfEmpty() {
  const [existing] = await db.select().from(schema.clinicians).limit(1)
  if (existing) {
    return
  }
  console.log("[seed] empty database, seeding demo data")

  const { maya, sam } = seedIds.clinicians
  await db.insert(schema.clinicians).values([
    {
      id: maya,
      name: "Dr. Maya Chen",
      email: "maya@outro.example",
      role: "clinician",
    },
    {
      id: sam,
      name: "Sam Okafor",
      email: "sam@outro.example",
      role: "operations",
    },
  ])

  const p = seedIds.patients
  const patients: SeedPatient[] = [
    {
      id: p.ana,
      firstName: "Ana",
      lastName: "Alvarez",
      email: "ana.alvarez@example.com",
      state: "CA",
      dateOfBirth: "1988-03-14",
      medicationName: "Sertraline",
      medicationDose: "100mg daily",
      primaryClinicianId: maya,
      path: [
        { to: "intake", daysAgo: 12 },
        {
          to: "evaluation",
          daysAgo: 9,
          trigger: "system",
          reason: "Evaluation booked",
        },
        {
          to: "decision_pending",
          daysAgo: 1,
          trigger: "system",
          reason: "Evaluation appointment completed",
        },
      ],
    },
    {
      id: p.ben,
      firstName: "Ben",
      lastName: "Brooks",
      email: "ben.brooks@example.com",
      state: "NY",
      dateOfBirth: "1979-11-02",
      medicationName: "Escitalopram",
      medicationDose: "10mg daily",
      primaryClinicianId: maya,
      path: [
        { to: "intake", daysAgo: 8 },
        {
          to: "evaluation",
          daysAgo: 5,
          trigger: "system",
          reason: "Evaluation booked",
        },
      ],
    },
    {
      id: p.chloe,
      firstName: "Chloe",
      lastName: "Carter",
      email: "chloe.carter@example.com",
      state: "TX",
      dateOfBirth: "1994-06-21",
      medicationName: "Venlafaxine",
      medicationDose: "150mg daily",
      primaryClinicianId: maya,
      ehrPatientId: "ehr_carter_seed",
      path: [
        { to: "intake", daysAgo: 15 },
        {
          to: "evaluation",
          daysAgo: 11,
          trigger: "system",
          reason: "Evaluation booked",
        },
        {
          to: "decision_pending",
          daysAgo: 3,
          trigger: "system",
          reason: "Evaluation appointment completed",
        },
        {
          to: "eligible",
          daysAgo: 1,
          trigger: "manual",
          reason: "Stable for 18 months, motivated, no contraindications.",
        },
      ],
      eligibility: {
        note: "Stable for 18 months, motivated, no contraindications.",
        daysAgo: 1,
      },
    },
    {
      id: p.devon,
      firstName: "Devon",
      lastName: "Diaz",
      email: "devon.diaz@example.com",
      state: "CA",
      dateOfBirth: "1990-09-09",
      medicationName: "Fluoxetine",
      medicationDose: "20mg daily",
      primaryClinicianId: maya,
      ehrPatientId: "ehr_diaz_seed",
      path: [
        { to: "intake", daysAgo: 60 },
        {
          to: "evaluation",
          daysAgo: 50,
          trigger: "system",
          reason: "Evaluation booked",
        },
        {
          to: "decision_pending",
          daysAgo: 42,
          trigger: "system",
          reason: "Evaluation appointment completed",
        },
        {
          to: "eligible",
          daysAgo: 40,
          trigger: "manual",
          reason: "Good candidate.",
        },
        {
          to: "active_care",
          daysAgo: 35,
          trigger: "system",
          reason: "First taper appointment completed",
        },
      ],
      eligibility: { note: "Good candidate.", daysAgo: 40 },
    },
    {
      id: p.elena,
      firstName: "Elena",
      lastName: "Ivanova",
      email: "elena.ivanova@example.com",
      state: "WA",
      dateOfBirth: "1985-01-30",
      medicationName: "Paroxetine",
      medicationDose: "30mg daily",
      primaryClinicianId: maya,
      path: [
        { to: "intake", daysAgo: 6 },
        {
          to: "evaluation",
          daysAgo: 4,
          trigger: "system",
          reason: "Evaluation booked",
        },
      ],
    },
    {
      id: p.farid,
      firstName: "Farid",
      lastName: "Haddad",
      email: "farid.haddad@example.com",
      state: "NY",
      dateOfBirth: "1972-12-12",
      medicationName: "Duloxetine",
      medicationDose: "60mg daily",
      primaryClinicianId: maya,
      path: [
        { to: "intake", daysAgo: 20 },
        {
          to: "evaluation",
          daysAgo: 14,
          trigger: "system",
          reason: "Evaluation booked",
        },
        {
          to: "decision_pending",
          daysAgo: 6,
          trigger: "system",
          reason: "Evaluation appointment completed",
        },
        {
          to: "ineligible",
          daysAgo: 5,
          trigger: "manual",
          reason:
            "Recent hospitalisation; recommended staying with current prescriber for now.",
        },
      ],
      eligibility: {
        note: "Recent hospitalisation; recommended staying with current prescriber for now.",
        daysAgo: 5,
      },
    },
    {
      id: p.grace,
      firstName: "Grace",
      lastName: "Nakamura",
      email: "grace.nakamura@example.com",
      state: "CA",
      dateOfBirth: "1998-04-04",
      medicationName: "Sertraline",
      medicationDose: "50mg daily",
      primaryClinicianId: null,
      path: [{ to: "intake", daysAgo: 2 }],
    },
    {
      id: p.hugo,
      firstName: "Hugo",
      lastName: "Lindqvist",
      email: "hugo.lindqvist@example.com",
      state: "TX",
      dateOfBirth: "1983-07-19",
      medicationName: "Citalopram",
      medicationDose: "20mg daily",
      primaryClinicianId: maya,
      path: [
        { to: "intake", daysAgo: 7 },
        {
          to: "evaluation",
          daysAgo: 3,
          trigger: "system",
          reason: "Evaluation booked",
        },
      ],
    },
  ]

  const transitionIds: Record<string, string> = {}
  for (const sp of patients) {
    const { path, eligibility, ...row } = sp
    await db.insert(schema.patients).values(row)
    const current = path[path.length - 1]!
    const [enrollment] = await db
      .insert(schema.careModelEnrollments)
      .values({
        patientId: sp.id,
        stage: current.to,
        startedAt: daysAgo(path[0]!.daysAgo),
        eligibilityNote: eligibility?.note,
        eligibilityDecidedAt: eligibility ? daysAgo(eligibility.daysAgo) : null,
        eligibilityDecidedByClinicianId: eligibility ? maya : null,
      })
      .returning()
    let from: CareStage | null = null
    for (const step of path) {
      const [t] = await db
        .insert(schema.stageTransitions)
        .values({
          enrollmentId: enrollment!.id,
          patientId: sp.id,
          fromStage: from,
          toStage: step.to,
          trigger: step.trigger ?? "system",
          reason: step.reason ?? (from ? null : "Signed up"),
          actorClinicianId: step.trigger === "manual" ? maya : null,
          createdAt: daysAgo(step.daysAgo),
        })
        .returning()
      transitionIds[`${sp.id}:${step.to}`] = t!.id
      from = step.to
    }
  }

  const appt = (
    patientId: string,
    kind: schema.AppointmentKind,
    startsAt: Date,
    extra: Partial<typeof schema.appointments.$inferInsert> = {},
  ): typeof schema.appointments.$inferInsert => ({
    patientId,
    clinicianId: maya,
    kind,
    startsAt,
    endsAt: addMinutes(startsAt, kind === "evaluation" ? 45 : 30),
    videoUrl: "https://meet.example.com/outro",
    externalBookingId: `cal_${patientId.slice(-3)}_${startsAt.getTime().toString(36)}`,
    ...extra,
  })

  await db.insert(schema.appointments).values([
    appt(p.ana, "evaluation", at(-1, 10), {
      status: "completed",
      completedAt: at(-1, 10, 45),
    }),
    appt(p.ben, "evaluation", at(0, 9)),
    appt(p.chloe, "evaluation", at(-3, 14), {
      status: "completed",
      completedAt: at(-3, 14, 45),
    }),
    appt(p.chloe, "follow_up", at(4, 11)),
    appt(p.devon, "evaluation", at(-42, 13), {
      status: "completed",
      completedAt: at(-42, 13, 45),
    }),
    appt(p.devon, "follow_up", at(-35, 15), {
      status: "completed",
      completedAt: at(-35, 15, 30),
    }),
    appt(p.devon, "follow_up", at(-14, 15), {
      status: "completed",
      completedAt: at(-14, 15, 30),
    }),
    appt(p.devon, "follow_up", at(-2, 15), {
      flag: "no_show",
      flagNote: "Waited 15 minutes, no reply to text.",
      flaggedAt: at(-2, 15, 20),
      flaggedByClinicianId: maya,
    }),
    appt(p.devon, "follow_up", at(5, 15)),
    appt(p.elena, "evaluation", at(1, 10)),
    appt(p.farid, "evaluation", at(-6, 16), {
      status: "completed",
      completedAt: at(-6, 16, 45),
    }),
    appt(p.hugo, "evaluation", at(0, 16)),
  ])

  // Chloe was marked eligible yesterday. The event was delivered and the rule
  // created a welcome-email task.
  const [chloeEvent] = await db
    .insert(schema.outboxEvents)
    .values({
      type: "care_model.stage_changed",
      patientId: p.chloe,
      actorClinicianId: maya,
      payload: {
        enrollmentId: null,
        transitionId: transitionIds[`${p.chloe}:eligible`],
        from: "decision_pending",
        to: "eligible",
        trigger: "manual",
      },
      status: "delivered",
      attempts: 1,
      deliveredAt: daysAgo(1),
      createdAt: daysAgo(1),
    })
    .returning()

  await db.insert(schema.tasks).values([
    {
      type: "send_welcome_email",
      status: "open",
      title: "Send welcome email to Chloe Carter",
      description:
        "The patient has been marked eligible. Send them the welcome email so they know what happens next.",
      patientId: p.chloe,
      transitionId: transitionIds[`${p.chloe}:eligible`],
      assigneeClinicianId: maya,
      sourceEventId: chloeEvent?.id,
      payload: { templateKey: "welcome_email" },
      dueAt: addDays(new Date(), 1),
      createdAt: daysAgo(1),
    },
    {
      type: "send_welcome_email",
      status: "done",
      title: "Send welcome email to Devon Diaz",
      patientId: p.devon,
      transitionId: transitionIds[`${p.devon}:eligible`],
      assigneeClinicianId: maya,
      payload: { templateKey: "welcome_email" },
      dueAt: daysAgo(38),
      completedAt: daysAgo(39),
      completedByClinicianId: maya,
      createdAt: daysAgo(40),
    },
  ])

  await db.insert(schema.emails).values({
    patientId: p.devon,
    sentByClinicianId: maya,
    templateKey: "welcome_email",
    toAddress: "devon.diaz@example.com",
    subject: "Welcome to Outro, Devon",
    body: "Hi Devon,\n\nGreat news: after your evaluation, Dr. Maya Chen has confirmed you're a good fit for the Outro program.\n\n...",
    status: "delivered",
    providerMessageId: "msg_seed_devon",
    statusUpdatedAt: daysAgo(39),
    createdAt: daysAgo(39),
  })
}
