import { z } from "zod"

// Stand-in for the scheduling engine (Cal.com). We don't call it; it calls us
// with booking webhooks (see webhooks/cal.ts). This is the shape of those.
//
// Cal semantics worth knowing:
//  - A reschedule is a *new* booking with a new uid. `rescheduleUid` points at
//    the booking it replaces, which should be treated as cancelled.
//  - Webhooks are retried, so the same event can arrive more than once.
//  - Delivery order is not guaranteed.

export const calTriggerList = [
  "BOOKING_CREATED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
] as const
export type CalTrigger = (typeof calTriggerList)[number]

export const ZCalWebhook = z.object({
  triggerEvent: z.enum(calTriggerList),
  createdAt: z.string(),
  payload: z.object({
    uid: z.string().min(1),
    rescheduleUid: z.string().nullable().optional(),
    startTime: z.string(),
    endTime: z.string(),
    eventType: z.object({ slug: z.enum(["evaluation", "follow_up"]) }),
    organizer: z.object({ email: z.string() }),
    attendees: z.array(z.object({ email: z.string() })).min(1),
    videoCallUrl: z.string().nullable().optional(),
    cancellationReason: z.string().nullable().optional(),
  }),
})
export type CalWebhook = z.infer<typeof ZCalWebhook>
