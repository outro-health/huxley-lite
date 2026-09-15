import type { ReactNode } from "react"

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) => (
  <div className="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-muted-foreground">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>
)

export const Spinner = () => (
  <div className="py-8 text-center text-muted-foreground">Loading…</div>
)
