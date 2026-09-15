import type { ComponentPropsWithoutRef } from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx } from "@/lib/utils"

const badgeVariants = tv({
  base: "inline-flex items-center whitespace-nowrap rounded-sm px-1.5 py-px text-xs font-medium",
  variants: {
    variant: {
      neutral: "bg-muted text-foreground",
      success: "bg-success-muted text-success",
      warning: "bg-warning-muted text-warning",
      info: "bg-info-muted text-info",
      danger: "bg-danger-muted text-danger",
    },
  },
  defaultVariants: { variant: "neutral" },
})

export type BadgeProps = ComponentPropsWithoutRef<"span"> &
  VariantProps<typeof badgeVariants>

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cx(badgeVariants({ variant }), className)} {...props} />
)
