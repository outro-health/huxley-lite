import { z } from "zod"

import { careStageList } from "../../db/schema"
import { clinicianProcedure, publicProcedure, router, unwrap } from "../../trpc"
import { careModelRepository } from "./repository"
import { correctStage, restartEnrollment } from "./service"
import { allowedTransitions, stageLabels } from "./stages"

export const careModelRouter = router({
  /** The stage machine, for the UI to render what's allowed. */
  stages: publicProcedure.query(() => ({
    stages: careStageList,
    labels: stageLabels,
    allowed: allowedTransitions,
  })),

  history: publicProcedure
    .input(z.object({ patientId: z.uuid() }))
    .query(({ input }) =>
      careModelRepository.listTransitionsForPatient(input.patientId),
    ),

  correctStage: clinicianProcedure
    .input(
      z.object({
        patientId: z.uuid(),
        to: z.enum(careStageList),
        reason: z.string().max(2000),
      }),
    )
    .mutation(({ input, ctx }) =>
      unwrap(correctStage({ ...input, actorClinicianId: ctx.clinician.id })),
    ),

  restart: clinicianProcedure
    .input(z.object({ patientId: z.uuid() }))
    .mutation(({ input, ctx }) =>
      unwrap(
        restartEnrollment({ ...input, actorClinicianId: ctx.clinician.id }),
      ),
    ),
})
