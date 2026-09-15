import { describe, expect, it } from "vitest"

import { db, schema } from "../db/client"
import { sendEmailForTask } from "../features/emails/service"
import { createClinician, createPatient, listEvents } from "../test/fixtures"
import { handleEmailWebhook } from "./email"

const setup = async () => {
  const clinician = await createClinician()
  const { patient } = await createPatient({ stage: "eligible" })
  const [task] = await db
    .insert(schema.tasks)
    .values({
      type: "send_welcome_email",
      title: "Send welcome email",
      patientId: patient.id,
      payload: { templateKey: "welcome_email" },
    })
    .returning()
  const sent = await sendEmailForTask({
    taskId: task!.id,
    to: patient.email,
    subject: "Hi",
    body: "Hello",
    clinicianId: clinician.id,
  })
  return { clinician, patient, task: task!, email: sent._unsafeUnwrap().email }
}

const report = (
  messageId: string,
  event: "delivered" | "bounced",
  at: string,
  id = `evt_${at}`,
) => ({
  id,
  messageId,
  event,
  occurredAt: at,
  reason: event === "bounced" ? "550 mailbox unavailable" : undefined,
})

describe("sendEmailForTask", () => {
  it("records the email as queued and closes the task", async () => {
    const { email, task } = await setup()
    expect(email.status).toBe("queued")
    expect(email.providerMessageId).toMatch(/^msg_/)
    const stored = await db.query.tasks.findFirst({
      where: (t, { eq }) => eq(t.id, task.id),
    })
    expect(stored?.status).toBe("done")
  })
})

describe("handleEmailWebhook", () => {
  it("moves a queued email to delivered", async () => {
    const { email } = await setup()
    const result = await handleEmailWebhook(
      report(email.providerMessageId!, "delivered", "2026-09-14T10:00:00Z"),
    )
    expect(result._unsafeUnwrap()).toMatchObject({ outcome: "updated" })
    const stored = await db.query.emails.findFirst({
      where: (e, { eq }) => eq(e.id, email.id),
    })
    expect(stored?.status).toBe("delivered")
  })

  it("ignores a duplicate or older report", async () => {
    const { email } = await setup()
    const at = "2026-09-14T10:00:00Z"
    await handleEmailWebhook(report(email.providerMessageId!, "delivered", at))
    const dup = await handleEmailWebhook(
      report(email.providerMessageId!, "delivered", at),
    )
    expect(dup._unsafeUnwrap()).toMatchObject({ outcome: "ignored" })

    const older = await handleEmailWebhook(
      report(email.providerMessageId!, "bounced", "2026-09-14T09:00:00Z"),
    )
    expect(older._unsafeUnwrap()).toMatchObject({ outcome: "ignored" })
    const stored = await db.query.emails.findFirst({
      where: (e, { eq }) => eq(e.id, email.id),
    })
    expect(stored?.status).toBe("delivered")
  })

  it("a bounce records the reason and emits email.bounced", async () => {
    const { email, task } = await setup()
    await handleEmailWebhook(
      report(email.providerMessageId!, "bounced", "2026-09-14T10:00:00Z"),
    )
    const stored = await db.query.emails.findFirst({
      where: (e, { eq }) => eq(e.id, email.id),
    })
    expect(stored).toMatchObject({
      status: "bounced",
      statusDetail: "550 mailbox unavailable",
    })
    const bounced = (await listEvents()).find((e) => e.type === "email.bounced")
    expect(bounced?.payload).toMatchObject({
      emailId: email.id,
      taskId: task.id,
    })
  })

  it("rejects reports for unknown messages", async () => {
    const result = await handleEmailWebhook(
      report("msg_unknown", "delivered", "2026-09-14T10:00:00Z"),
    )
    expect(result._unsafeUnwrapErr().code).toBe("NOT_FOUND")
  })
})
