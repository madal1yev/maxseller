import * as React from 'react'
import { PackageOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  title = "Hozircha ma'lumot yo'q",
  description,
  action,
  className,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
