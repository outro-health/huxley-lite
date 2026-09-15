import { RiLoader4Line } from "@remixicon/react"
import { type ComponentPropsWithoutRef, forwardRef } from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusRing } from "@/lib/utils"

const buttonVariants = tv({
  base: [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border font-medium text-sm transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  variants: {
    variant: {
      primary:
        "border-transparent bg-primary text-primary-foreground hover:bg-primary/85",
      secondary: "border-border bg-card text-foreground hover:bg-muted",
      ghost:
        "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      danger:
        "border-transparent bg-danger text-danger-foreground hover:bg-danger/85",
    },
    size: {
      sm: "h-7 px-2.5",
      md: "h-8 px-3",
    },
  },
  defaultVariants: { variant: "secondary", size: "md" },
})

type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cx(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <RiLoader4Line className="size-3.5 animate-spin" />}
      {children}
    </button>
  ),
)
Button.displayName = "Button"
