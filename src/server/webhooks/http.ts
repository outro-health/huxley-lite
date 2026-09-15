import type { IncomingMessage, ServerResponse } from "node:http"

import { ZCalWebhook } from "../integrations/scheduler"
import { handleCalWebhook } from "./cal"
import { handleEmailWebhook, ZEmailWebhook } from "./email"

// Plain HTTP endpoints for the (fake) external systems that call us. No
// signature verification here.

const readJson = (req: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    let raw = ""
    req.on("data", (chunk) => {
      raw += chunk
    })
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })

const respond = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(JSON.stringify(body))
}

export const isWebhookRequest = (req: IncomingMessage) =>
  req.url?.startsWith("/webhooks/") ?? false

export const handleWebhookRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  if (req.method !== "POST") {
    return respond(res, 405, { error: "POST only" })
  }
  let body: unknown
  try {
    body = await readJson(req)
  } catch {
    return respond(res, 400, { error: "Invalid JSON" })
  }

  const route = req.url?.split("?")[0]
  const parsed =
    route === "/webhooks/cal"
      ? ZCalWebhook.safeParse(body)
      : route === "/webhooks/email"
        ? ZEmailWebhook.safeParse(body)
        : null

  if (!parsed) {
    return respond(res, 404, { error: "Unknown webhook" })
  }
  if (!parsed.success) {
    return respond(res, 400, { error: parsed.error.issues })
  }

  const result =
    route === "/webhooks/cal"
      ? await handleCalWebhook(parsed.data as never)
      : await handleEmailWebhook(parsed.data as never)

  if (result.isErr()) {
    console.warn(`[webhook] ${route} rejected: ${result.error.message}`)
    return respond(res, result.error.code === "NOT_FOUND" ? 404 : 422, {
      error: result.error,
    })
  }
  console.log(`[webhook] ${route}`, result.value)
  return respond(res, 200, result.value)
}
