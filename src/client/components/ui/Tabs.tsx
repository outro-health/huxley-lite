import * as TabsPrimitive from "@radix-ui/react-tabs"
import type { ComponentPropsWithoutRef } from "react"

import { cx } from "@/lib/utils"

export const Tabs = TabsPrimitive.Root
export const TabsContent = TabsPrimitive.Content

export const TabsList = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cx("mb-4 flex gap-1 border-b border-hairline pb-2", className)}
    {...props}
  />
)

export const TabsTrigger = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cx(
      "rounded-md px-2.5 py-1 text-sm font-medium text-muted-foreground hover:text-foreground",
      "data-[state=active]:bg-foreground/5 data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
)
