import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cx = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
