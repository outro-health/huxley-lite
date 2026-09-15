import { z } from "zod"

import { clinicianProcedure, publicProcedure, router } from "../trpc"
import { outboxRepository } from "./repository"
import { processOnce } from "./worker"

// Operational view of the outbox. Handy for seeing what the system did and
// for redelivering an event by hand.
export const outboxRouter = router({
  list: publicProcedure.query(() => outboxRepository.list(200)),

  /** Deliver an event again, whatever state it's in. */
  redeliver: clinicianProcedure
    .input(z.object({ eventId: z.uuid() }))
    .mutation(async ({ input }) => {
      await outboxRepository.requeue(input.eventId)
      return processOnce()
    }),
})
