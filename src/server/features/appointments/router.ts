import { z } from "zod"

import { appointmentFlagList } from "../../db/schema"
import { clinicianProcedure, publicProcedure, router, unwrap } from "../../trpc"
import { appointmentsRepository } from "./repository"
import { completeAppointment, flagAppointment } from "./service"

export const appointmentsRouter = router({
  listForPatient: publicProcedure
    .input(z.object({ patientId: z.uuid() }))
    .query(({ input }) =>
      appointmentsRepository.listForPatient(input.patientId),
    ),

  mySchedule: clinicianProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const [upcoming, past] = await Promise.all([
      appointmentsRepository.listUpcomingForClinician(ctx.clinician.id, now),
      appointmentsRepository.listPastForClinician(ctx.clinician.id, now),
    ])
    return { upcoming, past }
  }),

  flag: clinicianProcedure
    .input(
      z.object({
        appointmentId: z.uuid(),
        flag: z.enum(appointmentFlagList).nullable(),
        note: z.string().max(2000).default(""),
      }),
    )
    .mutation(({ input, ctx }) =>
      unwrap(flagAppointment({ ...input, clinicianId: ctx.clinician.id })),
    ),

  complete: clinicianProcedure
    .input(z.object({ appointmentId: z.uuid() }))
    .mutation(({ input, ctx }) =>
      unwrap(completeAppointment({ ...input, clinicianId: ctx.clinician.id })),
    ),
})
