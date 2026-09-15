import { mkdirSync } from "node:fs"

import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"

import * as schema from "./schema"

// PGlite is Postgres compiled to WASM: real Postgres SQL, no server to run.
// DATABASE_DIR=memory:// gives a throwaway in-memory database (used by tests).
const dataDir = process.env.DATABASE_DIR ?? ".data/pglite"

if (!dataDir.startsWith("memory://")) {
  mkdirSync(dataDir, { recursive: true })
}

export const pglite = new PGlite(dataDir)
export const db = drizzle(pglite, { schema })

export type Db = typeof db
export { schema }
