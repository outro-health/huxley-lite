import type { ComponentPropsWithoutRef } from "react"

import { cx } from "@/lib/utils"

export const Table = ({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) => (
  <div className="overflow-x-auto">
    <table className={cx("w-full text-left text-base", className)} {...props} />
  </div>
)

export const Th = ({ className, ...props }: ComponentPropsWithoutRef<"th">) => (
  <th
    className={cx(
      "border-b border-hairline pb-2 pr-4 text-xs font-medium text-muted-foreground",
      className,
    )}
    {...props}
  />
)

export const Td = ({ className, ...props }: ComponentPropsWithoutRef<"td">) => (
  <td
    className={cx("border-b border-hairline py-2 pr-4 align-middle", className)}
    {...props}
  />
)

export const EmptyRow = ({
  colSpan,
  children,
}: {
  colSpan: number
  children: string
}) => (
  <tr>
    <td colSpan={colSpan} className="py-8 text-center text-muted-foreground">
      {children}
    </td>
  </tr>
)
