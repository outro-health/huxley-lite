// Which implementation of each external system to use.
//
// Default is the hosted EHR and mail services (docs in docs/integrations/),
// which need INTEGRATIONS_API_KEY. Set INTEGRATIONS=local to use in-process
// stand-ins instead; tests do this.

export type IntegrationsMode = "remote" | "local"

const mode: IntegrationsMode =
  process.env.INTEGRATIONS === "local" ? "local" : "remote"

export const integrationsConfig = {
  mode,
  baseUrl: (process.env.INTEGRATIONS_BASE_URL ?? "").replace(/\/$/, ""),
  apiKey: process.env.INTEGRATIONS_API_KEY ?? "",
}

export const integrationsProblem = (): string | null => {
  if (mode === "local") {
    return null
  }
  if (!integrationsConfig.baseUrl) {
    return "INTEGRATIONS_BASE_URL is not set"
  }
  if (!integrationsConfig.apiKey) {
    return "INTEGRATIONS_API_KEY is not set (ask Jack for a key, or set INTEGRATIONS=local)"
  }
  return null
}
