import { rmSync } from "node:fs"

const dataDir = process.env.DATABASE_DIR ?? ".data/pglite"

rmSync(dataDir, { recursive: true, force: true })
console.log(`Removed ${dataDir}. Run \`npm run dev\` to migrate and re-seed.`)
