import "dotenv/config"

// Fire Cal.com booking webhooks at the running API.
//
//   npx tsx scripts/simulate-cal.ts book <patientEmail> [evaluation|follow_up] [daysFromNow]
//   npx tsx scripts/simulate-cal.ts reschedule <bookingUid> [daysFromNow]
//   npx tsx scripts/simulate-cal.ts cancel <bookingUid>
//   npx tsx scripts/simulate-cal.ts storm <patientEmail>   # duplicates + out-of-order
//
// Needs the API running (npm run dev). Uses Dr. Maya Chen as the organizer.

import { addDays, addMinutes, setHours, setMinutes } from "date-fns"

const API = process.env.API_URL ?? "http://localhost:3000"
const ORGANIZER = "maya@outro.example"

const uid = () => `cal_${Math.random().toString(36).slice(2, 10)}`

const booking = (
  patientEmail: string,
  kind: "evaluation" | "follow_up",
  daysFromNow: number,
  overrides: Record<string, unknown> = {},
) => {
  const start = setMinutes(setHours(addDays(new Date(), daysFromNow), 10), 0)
  return {
    uid: uid(),
    rescheduleUid: null,
    startTime: start.toISOString(),
    endTime: addMinutes(start, kind === "evaluation" ? 45 : 30).toISOString(),
    eventType: { slug: kind },
    organizer: { email: ORGANIZER },
    attendees: [{ email: patientEmail }],
    videoCallUrl: "https://meet.example.com/outro",
    ...overrides,
  }
}

const post = async (triggerEvent: string, payload: Record<string, unknown>) => {
  const res = await fetch(`${API}/webhooks/cal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      triggerEvent,
      createdAt: new Date().toISOString(),
      payload,
    }),
  })
  console.log(
    `${triggerEvent} ${payload.uid} → ${res.status} ${await res.text()}`,
  )
}

const [cmd, arg1, arg2, arg3] = process.argv.slice(2)

switch (cmd) {
  case "book": {
    const payload = booking(
      arg1!,
      (arg2 as "evaluation" | "follow_up") ?? "follow_up",
      Number(arg3 ?? 3),
    )
    await post("BOOKING_CREATED", payload)
    break
  }
  case "reschedule": {
    // We don't know the original's details; Cal sends the full new booking.
    const payload = booking(
      arg2 ?? "chloe.carter@example.com",
      "follow_up",
      Number(arg3 ?? 6),
      {
        rescheduleUid: arg1,
      },
    )
    await post("BOOKING_RESCHEDULED", payload)
    break
  }
  case "cancel": {
    const payload = booking("chloe.carter@example.com", "follow_up", 3, {
      uid: arg1,
      cancellationReason: "Patient request",
    })
    await post("BOOKING_CANCELLED", payload)
    break
  }
  case "storm": {
    // What a bad afternoon looks like: create, duplicate create, reschedule,
    // then the *original* create arrives again late, then a cancel of the new one.
    const first = booking(arg1!, "follow_up", 3)
    const second = {
      ...booking(arg1!, "follow_up", 5),
      rescheduleUid: first.uid,
    }
    await post("BOOKING_CREATED", first)
    await post("BOOKING_CREATED", first)
    await post("BOOKING_RESCHEDULED", second)
    await post("BOOKING_CREATED", first)
    await post("BOOKING_CANCELLED", {
      ...second,
      cancellationReason: "Patient request",
    })
    break
  }
  default:
    console.log("usage: book|reschedule|cancel|storm (see file header)")
}
