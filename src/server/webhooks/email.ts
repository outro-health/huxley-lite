import { z } from "zod"

import { applyDeliveryReport } from "../features/emails/delivery"

// Delivery reports pushed by the provider. Not used by the default setup
// (the reconciler polls instead) but kept for providers that push.

export const ZEmailWebhook = z.object({
  id: z.string(),
  messageId: z.string(),
  event: z.enum(["delivered", "bounced"]),
  reason: z.string().optional(),
  occurredAt: z.string(),
})
export type EmailWebhook = z.infer<typeof ZEmailWebhook>

export const handleEmailWebhook = (input: EmailWebhook) =>
  applyDeliveryReport({
    messageId: input.messageId,
    event: input.event,
    reason: input.reason,
    occurredAt: input.occurredAt,
  })
