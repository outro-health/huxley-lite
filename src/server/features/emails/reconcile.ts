import { emailProvider } from "../../integrations/emailProvider"
import { applyDeliveryReport } from "./delivery"
import { emailsRepository } from "./repository"

// Asks the provider what happened to every email we still think is queued.
// Runs on an interval in the server; tests call reconcileQueuedEmails().

export type ReconcileSummary = {
  checked: number
  updated: number
  failed: number
}

export const reconcileQueuedEmails = async (): Promise<ReconcileSummary> => {
  const queued = await emailsRepository.listQueued()
  const summary: ReconcileSummary = {
    checked: queued.length,
    updated: 0,
    failed: 0,
  }

  for (const email of queued) {
    if (!email.providerMessageId) {
      continue
    }
    const state = await emailProvider.getMessage(email.providerMessageId)
    if (state.isErr()) {
      summary.failed += 1
      console.warn(
        `[mail] could not fetch ${email.providerMessageId}: ${state.error.message}`,
      )
      continue
    }
    const final = state.value.events.find(
      (e) => e.type === "delivered" || e.type === "bounced",
    )
    if (!final || (final.type !== "delivered" && final.type !== "bounced")) {
      continue
    }
    const applied = await applyDeliveryReport({
      messageId: email.providerMessageId,
      event: final.type,
      reason: final.reason,
      occurredAt: final.at,
    })
    if (applied.isOk() && applied.value.outcome === "updated") {
      summary.updated += 1
      console.log(`[mail] ${email.providerMessageId} → ${final.type}`)
    }
  }
  return summary
}

export const startEmailReconciler = (intervalMs = 3000) => {
  let running = false
  const timer = setInterval(async () => {
    if (running) {
      return
    }
    running = true
    try {
      await reconcileQueuedEmails()
    } catch (error) {
      console.error("[mail] reconcile failed", error)
    } finally {
      running = false
    }
  }, intervalMs)
  return () => clearInterval(timer)
}
