import {
  type AppError,
  type AppResultAsync,
  appError,
  fromPromise,
} from "../lib/result"
import { integrationsConfig } from "./config"

// Small fetch wrapper for the vendor APIs. Turns non-2xx into AppError and
// keeps the vendor's error code/message so callers can branch on it.

export type VendorError = {
  status: number
  code: string
  message: string
  retryAfterSeconds: number | null
}

export type VendorRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  body?: unknown
  headers?: Record<string, string>
}

const describe = (error: VendorError) =>
  `${error.status} ${error.code}: ${error.message}` +
  (error.retryAfterSeconds ? ` (retry after ${error.retryAfterSeconds}s)` : "")

export const vendorFetch = <T>(request: VendorRequest): AppResultAsync<T> =>
  fromPromise(
    (async () => {
      const response = await fetch(
        `${integrationsConfig.baseUrl}${request.path}`,
        {
          method: request.method,
          headers: {
            authorization: `Bearer ${integrationsConfig.apiKey}`,
            "content-type": "application/json",
            ...request.headers,
          },
          body:
            request.body === undefined
              ? undefined
              : JSON.stringify(request.body),
        },
      )
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { code?: string; message?: string }
      }
      if (!response.ok) {
        const retryAfter = response.headers.get("retry-after")
        const error: VendorError = {
          status: response.status,
          code: payload.error?.code ?? "http_error",
          message: payload.error?.message ?? response.statusText,
          retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
        }
        throw new VendorRequestError(error)
      }
      return payload as T
    })(),
    "INTEGRATION_FAILED",
    `${request.method} ${request.path} failed`,
  ).mapErr((error): AppError => {
    // Keep the vendor detail readable in the message.
    return appError("INTEGRATION_FAILED", error.message)
  })

export class VendorRequestError extends Error {
  constructor(public readonly detail: VendorError) {
    super(describe(detail))
    this.name = "VendorRequestError"
  }
}
