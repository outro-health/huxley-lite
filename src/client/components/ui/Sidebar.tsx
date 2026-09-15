import {
  RiCalendarLine,
  RiInboxLine,
  RiPulseLine,
  RiUserHeartLine,
} from "@remixicon/react"
import { Link } from "@tanstack/react-router"

import { api, queryClient } from "@/lib/api"
import { useClinician } from "@/lib/clinician"
import { cx } from "@/lib/utils"
import { Select } from "./Field"

const nav = [
  { to: "/tasks", label: "Tasks", icon: RiInboxLine },
  { to: "/patients", label: "Patients", icon: RiUserHeartLine },
  { to: "/schedule", label: "Schedule", icon: RiCalendarLine },
  { to: "/events", label: "Events", icon: RiPulseLine },
] as const

export function Sidebar() {
  const { clinicianId, setClinicianId } = useClinician()
  const clinicians = api.clinicians.list.useQuery()
  const openTasks = api.tasks.list.useQuery({ status: "open" })

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-hairline bg-sunken px-3 py-4">
      <div className="mb-6 px-2 text-lg font-semibold tracking-tight">
        Huxley
      </div>
      <nav className="flex flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cx(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
            )}
            activeProps={{ className: "bg-foreground/5 text-foreground" }}
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {to === "/tasks" && openTasks.data && openTasks.data.length > 0 && (
              <span className="rounded-sm bg-foreground/10 px-1.5 text-xs">
                {openTasks.data.length}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">
          Acting as
        </div>
        <Select
          value={clinicianId}
          onChange={(e) => {
            setClinicianId(e.target.value)
            queryClient.invalidateQueries()
          }}
        >
          {clinicians.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
    </aside>
  )
}
