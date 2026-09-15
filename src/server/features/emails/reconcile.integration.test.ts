import { beforeEach, describe, expect, it } from "vitest"

import { db, schema } from "../../db/client"
import { _localMail } from "../../integrations/emailProvider"
import { createClinician, createPatient, listEvents } from "../../test/fixtures"
import { reconcileQueuedEmails } from "./reconcile"
import { sendEmailForTask } from "./service"

beforeEach(() => {
  _localMail.reset()
  _localMail.setDelayMs(0)
})

const sendTo = async (to: string) => {
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
    to,
    subject: "Hi",
    body: "Hello",
    clinicianId: clinician.id,
  })
  return sent._unsafeUnwrap().email
}

const emailStatus = async (id: string) =>
  (await db.query.emails.findFirst({ where: (e, { eq }) => eq(e.id, id) }))
    ?.status

describe("reconcileQueuedEmails", () => {
  it("moves queued emails to their final status", async () => {
    const ok = await sendTo("ana@example.com")
    const bad = await sendTo("ana+bounce@example.com")
    expect(await emailStatus(ok.id)).toBe("queued")

    const summary = await reconcileQueuedEmails()
    expect(summary).toMatchObject({ checked: 2, updated: 2, failed: 0 })
    expect(await emailStatus(ok.id)).toBe("delivered")
    expect(await emailStatus(bad.id)).toBe("bounced")
    expect(
      (await listEvents()).filter((e) => e.type === "email.bounced"),
    ).toHaveLength(1)
  })

  it("leaves still-queued messages alone and is safe to run repeatedly", async () => {
    _localMail.setDelayMs(60_000)
    const email = await sendTo("ana@example.com")
    await reconcileQueuedEmails()
    expect(await emailStatus(email.id)).toBe("queued")

    _localMail.setDelayMs(0)
    const again = await sendTo("bo@example.com")
    expect((await reconcileQueuedEmails()).updated).toBe(1)
    expect(await emailStatus(again.id)).toBe("delivered")
    expect((await reconcileQueuedEmails()).updated).toBe(0)
  })
})
