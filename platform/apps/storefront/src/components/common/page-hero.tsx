import * as React from 'react'

export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-surface/40 py-14">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow bg-[size:100%_100%,52px_52px,52px_52px] opacity-50" />
      <div className="container-page relative">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-emerald">{eyebrow}</p>
        ) : null}
        <h1 className="max-w-3xl text-3xl font-extrabold sm:text-4xl lg:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
