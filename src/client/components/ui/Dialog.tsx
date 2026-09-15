import * as DialogPrimitive from "@radix-ui/react-dialog"
import { RiCloseLine } from "@remixicon/react"
import type { ComponentPropsWithoutRef } from "react"

import { cx } from "@/lib/utils"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = ({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/30" />
    <DialogPrimitive.Content
      className={cx(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-hairline bg-card p-6 shadow-xl",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-muted"
        aria-label="Close"
      >
        <RiCloseLine className="size-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
)

export const DialogTitle = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cx("text-lg font-semibold", className)}
    {...props}
  />
)

export const DialogDescription = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cx("mt-1 text-muted-foreground", className)}
    {...props}
  />
)

export const DialogFooter = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div className={cx("mt-6 flex justify-end gap-2", className)} {...props} />
)
