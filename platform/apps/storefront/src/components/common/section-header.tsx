import * as React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Barchasini ko'rish",
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  href?: string
  linkLabel?: string
  className?: string
}) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:gap-2.5"
        >
          {linkLabel}
          <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  )
}
