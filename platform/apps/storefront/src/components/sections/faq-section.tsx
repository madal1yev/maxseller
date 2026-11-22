'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, MessageCircleQuestion } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getFaq, queryKeys } from '@/lib/api-queries'
import { cn } from '@/lib/utils'

export function FaqSection() {
  const [open, setOpen] = React.useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.faq,
    queryFn: getFaq,
  })

  return (
    <section className="border-t border-white/10 bg-surface/40 py-16">
      <div className="container-page">
        <SectionHeader
          eyebrow="FAQ"
          title="Ko'p so'raladigan savollar"
          description="Xarid jarayoni, to'lov va yuklash haqidagi eng ko'p beriladigan savollar."
          href="/faq"
          linkLabel="Barcha javoblar"
        />
        {isLoading ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Savollar hali qo'shilmagan" />
        ) : (
          <div className="mx-auto max-w-3xl space-y-3">
            {data.map((item) => {
              const expanded = open === item.id
              return (
                <div
                  key={item.id}
                  className={cn(
                    'overflow-hidden rounded-2xl border border-white/10 bg-card/70 transition',
                    expanded && 'border-emerald/40 shadow-glow',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : item.id)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="flex items-center gap-3 text-sm font-bold sm:text-base">
                      <MessageCircleQuestion className="h-5 w-5 shrink-0 text-emerald" />
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-emerald transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {expanded ? (
                    <div className="border-t border-white/10 px-5 py-4 pl-12 text-sm leading-relaxed text-muted">
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              )
            })}
            <p className="pt-3 text-center text-sm text-muted">
              Savolingizga javob topmadinizmi?{' '}
              <Link href="/contact" className="font-bold text-emerald hover:underline">
                Bizga yozing
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
