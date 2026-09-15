import type { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone"

import type { Clinician } from "./db/schema"
import { cliniciansRepository } from "./features/clinicians/repository"

// There is no login. The client sends the acting clinician's id in a header
// and we trust it. Procedures that need an actor use `clinicianProcedure`.

export const CLINICIAN_HEADER = "x-clinician-id"

export type Context = {
  clinician: Clinician | null
}

export const createContext = async ({
  req,
}: CreateHTTPContextOptions): Promise<Context> => {
  const header = req.headers[CLINICIAN_HEADER]
  const clinicianId = Array.isArray(header) ? header[0] : header
  if (!clinicianId) {
    return { clinician: null }
  }
  return { clinician: await cliniciansRepository.getById(clinicianId) }
}
