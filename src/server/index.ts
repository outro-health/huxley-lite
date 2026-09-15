import "dotenv/config"

import { createServer } from "node:http"

import { createHTTPHandler } from "@trpc/server/adapters/standalone"

import { createContext } from "./context"
import { runMigrations } from "./db/migrate"
import { seedIfEmpty } from "./db/seed"
import { startEmailReconciler } from "./features/emails/reconcile"
import { integrationsConfig, integrationsProblem } from "./integrations/config"
import { ai } from "./lib/ai"
import { startWorker } from "./outbox/worker"
import { appRouter } from "./router"
import { handleWebhookRequest, isWebhookRequest } from "./webhooks/http"

const PORT = Number(process.env.PORT ?? 3000)

async function main() {
  await runMigrations()
  await seedIfEmpty()

  const trpc = createHTTPHandler({
    router: appRouter,
    createContext,
    basePath: "/trpc/",
    onError: ({ path, error }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[trpc] ${path ?? "<unknown>"}:`, error)
      }
    },
  })

  const server = createServer((req, res) => {
    if (isWebhookRequest(req)) {
      void handleWebhookRequest(req, res)
      return
    }
    trpc(req, res)
  })

  const problem = integrationsProblem()
  if (problem) {
    console.warn(
      `\n[integrations] ${problem}. EHR and email calls will fail until this is fixed. See .env.example.\n`,
    )
  }

  const stopWorker = startWorker(1000)
  const stopReconciler = startEmailReconciler(3000)
  process.on("SIGINT", () => {
    stopWorker()
    stopReconciler()
    server.close()
    process.exit(0)
  })

  server.listen(PORT)
  console.log(
    `API on http://localhost:${PORT}/trpc · webhooks on /webhooks/{cal,email} · integrations: ${integrationsConfig.mode}${integrationsConfig.mode === "remote" ? ` (${integrationsConfig.baseUrl})` : ""} · ai: ${ai.name}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
