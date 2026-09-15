import { z } from "zod"

import { clinicianProcedure, publicProcedure, router, unwrap } from "../../trpc"
import { patientsRepository } from "./repository"
import { decideEligibility } from "./service"

export const patientsRouter = router({
  list: publicProcedure.query(() => patientsRepository.list()),

  get: publicProcedure
    .input(z.object({ patientId: z.uuid() }))
    .query(async ({ input }) => {
      const patient = await patientsRepository.getById(input.patientId)
      if (!patient) {
        throw unwrap.notFound("Patient", input.patientId)
      }
      return patient
    }),

  decideEligibility: clinicianProcedure
    .input(
      z.object({
        patientId: z.uuid(),
        decision: z.enum(["eligible", "ineligible"]),
        note: z.string().max(2000).default(""),
      }),
    )
    .mutation(({ input, ctx }) =>
      unwrap(decideEligibility({ ...input, clinicianId: ctx.clinician.id })),
    ),
})
