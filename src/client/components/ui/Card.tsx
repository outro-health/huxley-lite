import type { ComponentPropsWithoutRef } from "react"

import { cx } from "@/lib/utils"

export const Card = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) => (
  <div
    className={cx("rounded-lg border border-hairline bg-card p-5", className)}
    {...props}
  />
)

export const CardTitle = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"h3">) => (
  <h3 className={cx("mb-3 text-md font-medium", className)} {...props} />
)
