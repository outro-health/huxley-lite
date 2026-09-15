import { beforeAll, beforeEach } from "vitest"

import { pglite } from "./client"
import { runMigrations } from "./migrate"

// Each test file runs in its own process (pool: forks) and DATABASE_DIR is
// memory://, so every file gets a fresh, migrated database. Tables are
// emptied between tests so tests in a file don't see each other's rows.

beforeAll(async () => {
  await runMigrations()
})

beforeEach(async () => {
  await pglite.exec(
    "TRUNCATE emails, tasks, outbox_events, appointments, stage_transitions, care_model_enrollments, patients, clinicians CASCADE",
  )
})
