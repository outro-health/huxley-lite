import { appointmentsRouter } from "./features/appointments/router"
import { careModelRouter } from "./features/careModel/router"
import { cliniciansRouter } from "./features/clinicians/router"
import { emailsRouter } from "./features/emails/router"
import { patientsRouter } from "./features/patients/router"
import { tasksRouter } from "./features/tasks/router"
import { outboxRouter } from "./outbox/router"
import { router } from "./trpc"

export const appRouter = router({
  clinicians: cliniciansRouter,
  patients: patientsRouter,
  careModel: careModelRouter,
  appointments: appointmentsRouter,
  tasks: tasksRouter,
  emails: emailsRouter,
  outbox: outboxRouter,
})

export type AppRouter = typeof appRouter
