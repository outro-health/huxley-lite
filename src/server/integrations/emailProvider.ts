import { type AppResultAsync, appError, errAsync, okAsync } from "../lib/result"
import { integrationsConfig } from "./config"
import { vendorFetch } from "./http"

// The transactional email provider (CustomerIO in production). Docs:
// docs/integrations/mail.md. Sending is asynchronous: the provider accepts
// the message and its final status shows up later when you fetch it.

export type OutboundEmail = {
  to: string
  subject: string
  body: string
}

export type Accepted = { providerMessageId: string }

export type MessageStatus = "queued" | "delivered" | "bounced"

export type MessageState = {
  providerMessageId: string
  status: MessageStatus
  events: { type: MessageStatus; at: string; reason?: string }[]
}

export type MailClient = {
  send: (email: OutboundEmail) => AppResultAsync<Accepted>
  getMessage: (providerMessageId: string) => AppResultAsync<MessageState>
}

// --- remote --------------------------------------------------------------

type ApiMessage = {
  id: string
  status: MessageStatus
  events: { type: MessageStatus; at: string; reason?: string }[]
}

const toState = (m: ApiMessage): MessageState => ({
  providerMessageId: m.id,
  status: m.status,
  events: m.events,
})

const remoteMail = (): MailClient => ({
  send: (email) =>
    vendorFetch<ApiMessage>({
      method: "POST",
      path: "/mail/v1/messages",
      body: email,
    }).map((m) => ({ providerMessageId: m.id })),
  getMessage: (id) =>
    vendorFetch<ApiMessage>({
      method: "GET",
      path: `/mail/v1/messages/${id}`,
    }).map(toState),
})

// --- local fake ----------------------------------------------------------

type LocalMessage = MessageState & {
  finalStatus: MessageStatus
  finalAt: number
  reason?: string
}
const messages = new Map<string, LocalMessage>()
let localDelayMs = 3000

const localMail = (): MailClient => ({
  send: (email) => {
    if (!email.to.includes("@")) {
      return errAsync(
        appError(
          "INTEGRATION_FAILED",
          "422 validation_failed: to must be a valid email address",
        ),
      )
    }
    const providerMessageId = `msg_${Math.random().toString(36).slice(2, 10)}`
    const bounce = email.to.toLowerCase().includes("+bounce")
    const now = Date.now()
    messages.set(providerMessageId, {
      providerMessageId,
      status: "queued",
      events: [{ type: "queued", at: new Date(now).toISOString() }],
      finalStatus: bounce ? "bounced" : "delivered",
      finalAt: now + localDelayMs,
      reason: bounce ? "550 5.1.1 The email account does not exist" : undefined,
    })
    console.log(
      `[mail:local] accepted "${email.subject}" to ${email.to} (${providerMessageId})`,
    )
    return okAsync({ providerMessageId })
  },
  getMessage: (id) => {
    const m = messages.get(id)
    if (!m) {
      return errAsync(
        appError("INTEGRATION_FAILED", "404 not_found: No such message"),
      )
    }
    if (m.status === "queued" && Date.now() >= m.finalAt) {
      m.status = m.finalStatus
      m.events.push({
        type: m.finalStatus,
        at: new Date(m.finalAt).toISOString(),
        ...(m.reason ? { reason: m.reason } : {}),
      })
    }
    return okAsync({
      providerMessageId: m.providerMessageId,
      status: m.status,
      events: m.events,
    })
  },
})

export const emailProvider: MailClient =
  integrationsConfig.mode === "remote" ? remoteMail() : localMail()

/** Test helpers for the local fake. */
export const _localMail = {
  reset: () => messages.clear(),
  setDelayMs: (ms: number) => {
    localDelayMs = ms
  },
}
