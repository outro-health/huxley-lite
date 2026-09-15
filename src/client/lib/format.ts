import { format, formatDistanceToNowStrict, isPast, isToday } from "date-fns"

export const fmtDateTime = (date: Date) => format(date, "EEE d MMM, HH:mm")
export const fmtDate = (date: Date) => format(date, "d MMM yyyy")
export const fmtTime = (date: Date) => format(date, "HH:mm")

export const fmtDue = (date: Date | null) => {
  if (!date) {
    return "No due date"
  }
  if (isToday(date)) {
    return "Due today"
  }
  const distance = formatDistanceToNowStrict(date)
  return isPast(date) ? `Overdue by ${distance}` : `Due in ${distance}`
}

export const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`
