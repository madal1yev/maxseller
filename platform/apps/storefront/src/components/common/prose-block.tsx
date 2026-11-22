import * as React from 'react'

export function ProseBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl space-y-8 text-sm leading-relaxed text-foreground/85 sm:text-base">
        {children}
      </div>
    </div>
  )
}

export function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-extrabold sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-muted [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-bold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  )
}
