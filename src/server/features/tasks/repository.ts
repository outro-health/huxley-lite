import { and, asc, desc, eq, sql } from "drizzle-orm"

import { db, schema } from "../../db/client"
import type { TaskStatus } from "../../db/schema"

export type NewTask = typeof schema.tasks.$inferInsert

export const tasksRepository = {
  getById: (id: string) =>
    db.query.tasks
      .findFirst({
        where: eq(schema.tasks.id, id),
        with: {
          patient: true,
          appointment: true,
          assignee: true,
          transition: true,
        },
      })
      .then((row) => row ?? null),

  /** The inbox: tasks in a status, soonest due first, undated last. */
  listByStatus: (status: TaskStatus) =>
    db.query.tasks.findMany({
      where: eq(schema.tasks.status, status),
      orderBy: [
        sql`${schema.tasks.dueAt} asc nulls last`,
        desc(schema.tasks.createdAt),
      ],
      with: { patient: true, assignee: true, transition: true },
    }),

  listForPatient: (patientId: string) =>
    db.query.tasks.findMany({
      where: eq(schema.tasks.patientId, patientId),
      orderBy: [asc(schema.tasks.status), desc(schema.tasks.createdAt)],
      with: { assignee: true, transition: true },
    }),

  insertMany: (rows: NewTask[]) =>
    rows.length === 0
      ? Promise.resolve([])
      : db.insert(schema.tasks).values(rows).returning(),

  setStatus: async (input: {
    taskId: string
    status: TaskStatus
    clinicianId: string
  }) => {
    const closing = input.status !== "open"
    const [row] = await db
      .update(schema.tasks)
      .set({
        status: input.status,
        completedAt: closing ? new Date() : null,
        completedByClinicianId: closing ? input.clinicianId : null,
      })
      .where(
        and(eq(schema.tasks.id, input.taskId), eq(schema.tasks.status, "open")),
      )
      .returning()
    return row ?? null
  },
}
