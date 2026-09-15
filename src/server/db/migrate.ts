import { migrate } from "drizzle-orm/pglite/migrator"

import { db } from "./client"

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "src/server/db/migrations" })
}
