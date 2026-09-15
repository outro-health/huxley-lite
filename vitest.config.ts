import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src/client"),
      "@server": resolve(import.meta.dirname, "src/server"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    isolate: true,
    env: {
      DATABASE_DIR: "memory://",
      TZ: "UTC",
    },
    setupFiles: ["src/server/db/testSetup.ts"],
  },
})
