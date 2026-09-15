import { createContext, type ReactNode, useContext, useState } from "react"

// The acting clinician. There is no login: the choice lives in localStorage
// and is sent as a header on every API call (see api.ts).

const STORAGE_KEY = "huxley-lite.clinicianId"
export const DEFAULT_CLINICIAN_ID = "00000000-0000-4000-8000-000000000001"

let currentClinicianId = readStored()

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CLINICIAN_ID
  } catch {
    return DEFAULT_CLINICIAN_ID
  }
}

/** Read outside React (the tRPC link uses this). */
export const getClinicianId = () => currentClinicianId

type ClinicianContextValue = {
  clinicianId: string
  setClinicianId: (id: string) => void
}

const ClinicianContext = createContext<ClinicianContextValue | null>(null)

export function ClinicianProvider({ children }: { children: ReactNode }) {
  const [clinicianId, setState] = useState(currentClinicianId)
  const setClinicianId = (id: string) => {
    currentClinicianId = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // ignore
    }
    setState(id)
  }
  return (
    <ClinicianContext.Provider value={{ clinicianId, setClinicianId }}>
      {children}
    </ClinicianContext.Provider>
  )
}

export function useClinician() {
  const value = useContext(ClinicianContext)
  if (!value) {
    throw new Error("useClinician must be used inside ClinicianProvider")
  }
  return value
}
