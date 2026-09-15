import { z } from "zod"

import { taskStatusList } from "../../db/schema"
import { clinicianProcedure, publicProcedure, router, unwrap } from "../../trpc"
import { tasksRepository } from "./repository"
import { closeTask } from "./service"

export const tasksRouter = router({
  list: publicProcedure
    .input(z.object({ status: z.enum(taskStatusList).default("open") }))
    .query(({ input }) => tasksRepository.listByStatus(input.status)),

  listForPatient: publicProcedure
    .input(z.object({ patientId: z.uuid() }))
    .query(({ input }) => tasksRepository.listForPatient(input.patientId)),

  close: clinicianProcedure
    .input(
      z.object({
        taskId: z.uuid(),
        status: z.enum(["done", "dismissed"]),
      }),
    )
    .mutation(({ input, ctx }) =>
      unwrap(closeTask({ ...input, clinicianId: ctx.clinician.id })),
    ),
})
