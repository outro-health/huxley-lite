// Which implementation of each external system to use.
//
// With INTEGRATIONS_API_KEY set, the EHR and email provider are real HTTP
// services (docs in docs/integrations/). Without it, in-process fakes with
// the same interface are used so tests and offline work still run.

export type IntegrationsMode = "remote" | "local"

export const integrationsConfig = {
  mode: (process.env.INTEGRATIONS_API_KEY
    ? "remote"
    : "local") as IntegrationsMode,
  baseUrl: (
    process.env.INTEGRATIONS_BASE_URL ?? "http://localhost:8787"
  ).replace(/\/$/, ""),
  apiKey: process.env.INTEGRATIONS_API_KEY ?? "",
}
