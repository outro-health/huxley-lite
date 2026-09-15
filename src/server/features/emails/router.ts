import { z } from "zod"

import { clinicianProcedure, publicProcedure, router, unwrap } from "../../trpc"
import { emailsRepository } from "./repository"
import { draftEmailForTask, sendEmailForTask } from "./service"

export const emailsRouter = router({
  listForPatient: publicProcedure
    .input(z.object({ patientId: z.uuid() }))
    .query(({ input }) => emailsRepository.listForPatient(input.patientId)),

  draftForTask: clinicianProcedure
    .input(z.object({ taskId: z.uuid() }))
    .query(({ input, ctx }) =>
      unwrap(
        draftEmailForTask({
          taskId: input.taskId,
          clinicianName: ctx.clinician.name,
        }),
      ),
    ),

  sendForTask: clinicianProcedure
    .input(
      z.object({
        taskId: z.uuid(),
        to: z.email(),
        subject: z.string().min(1).max(255),
        body: z.string().min(1).max(20_000),
      }),
    )
    .mutation(({ input, ctx }) =>
      unwrap(sendEmailForTask({ ...input, clinicianId: ctx.clinician.id })),
    ),
})
