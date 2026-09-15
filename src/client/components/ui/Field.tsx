import { type ComponentPropsWithoutRef, forwardRef } from "react"

import { cx, focusRing } from "@/lib/utils"

const controlStyles =
  "w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-base placeholder:text-subtle-foreground"

export const Label = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"label">) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor
  <label
    className={cx("mb-1 block text-sm font-medium", className)}
    {...props}
  />
)

export const Input = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cx(controlStyles, focusRing, className)}
    {...props}
  />
))
Input.displayName = "Input"

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cx(
      controlStyles,
      focusRing,
      "min-h-24 leading-relaxed",
      className,
    )}
    {...props}
  />
))
Textarea.displayName = "Textarea"

export const Select = forwardRef<
  HTMLSelectElement,
  ComponentPropsWithoutRef<"select">
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cx(controlStyles, focusRing, className)}
    {...props}
  />
))
Select.displayName = "Select"
