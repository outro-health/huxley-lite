import { type AppResultAsync, appError, errAsync, okAsync } from "../lib/result"
import { integrationsConfig } from "./config"
import { vendorFetch } from "./http"

// The EHR (Elation in production). Docs: docs/integrations/ehr.md.

export type EhrPatientInput = {
  // Same key + same body = same chart. Callers choose something stable.
  idempotencyKey: string
  firstName: string
  lastName: string
  dateOfBirth: string
  email: string
}

export type EhrChart = { ehrPatientId: string; created: boolean }

export type EhrNoteInput = {
  ehrPatientId: string
  text: string
  authorName: string
}

export type EhrClient = {
  createPatient: (input: EhrPatientInput) => AppResultAsync<EhrChart>
  addNote: (input: EhrNoteInput) => AppResultAsync<{ noteId: string }>
}

// --- remote --------------------------------------------------------------

const remoteEhr = (): EhrClient => ({
  createPatient: ({ idempotencyKey, ...body }) =>
    vendorFetch<{ id: string; createdAt: string }>({
      method: "POST",
      path: "/ehr/v1/patients",
      body,
      headers: { "idempotency-key": idempotencyKey },
    }).map((patient) => ({
      ehrPatientId: patient.id,
      // The API answers 201 for new, 200 for replayed; we don't see the
      // status here, so treat "very recent" as created.
      created: Date.now() - new Date(patient.createdAt).getTime() < 5_000,
    })),

  addNote: ({ ehrPatientId, text, authorName }) =>
    vendorFetch<{ id: string }>({
      method: "POST",
      path: `/ehr/v1/patients/${ehrPatientId}/notes`,
      body: { text, authorName },
    }).map((note) => ({ noteId: note.id })),
})

// --- local fake ----------------------------------------------------------

const charts = new Map<string, string>()
const notes = new Map<string, string[]>()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const localEhr = (): EhrClient => ({
  createPatient: (input) => {
    const existing = charts.get(input.idempotencyKey)
    if (existing) {
      return okAsync({ ehrPatientId: existing, created: false })
    }
    const ehrPatientId = `pt_${Math.random().toString(36).slice(2, 10)}`
    return okAsync(sleep(150)).map(() => {
      charts.set(input.idempotencyKey, ehrPatientId)
      console.log(`[ehr:local] created chart ${ehrPatientId}`)
      return { ehrPatientId, created: true }
    })
  },
  addNote: ({ ehrPatientId, text }) => {
    if (![...charts.values()].includes(ehrPatientId)) {
      return errAsync(
        appError("INTEGRATION_FAILED", "404 not_found: No such patient"),
      )
    }
    const list = notes.get(ehrPatientId) ?? []
    list.push(text)
    notes.set(ehrPatientId, list)
    return okAsync({ noteId: `note_${list.length}` })
  },
})

export const ehr: EhrClient =
  integrationsConfig.mode === "remote" ? remoteEhr() : localEhr()

/** Test helper for the local fake. */
export const _resetLocalEhr = () => {
  charts.clear()
  notes.clear()
}
