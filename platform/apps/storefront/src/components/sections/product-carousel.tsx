'use client'

import * as React from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '@maxseller/shared'
import { ProductCard } from '@/components/product-card'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { ProductCardSkeleton } from '@/components/ui/skeleton'

export function ProductCarousel({
  eyebrow,
  title,
  description,
  href,
  queryKey,
  queryFn,
}: {
  eyebrow: string
  title: string
  description?: string
  href: string
  queryKey: QueryKey
  queryFn: () => Promise<Product[]>
}) {
  const scroller = React.useRef<HTMLDivElement>(null)
  const { data, isLoading, isError, refetch } = useQuery({ queryKey, queryFn })

  function scroll(direction: 'left' | 'right') {
    const node = scroller.current
    if (!node) return
    node.scrollBy({ left: direction === 'right' ? node.clientWidth * 0.8 : -node.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          href={href}
          className="mb-0 flex-1"
        />
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Oldingi mahsulotlar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-emerald/50 hover:text-emerald"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Keyingi mahsulotlar"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-emerald/50 hover:text-emerald"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="no-scrollbar mt-8 flex gap-5 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="w-[280px] shrink-0 sm:w-[300px]">
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-8">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState className="mt-8" title="Hozircha mahsulot yo'q" description="Tez orada yangi mahsulotlar qo'shiladi." />
      ) : (
        <div ref={scroller} className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
          {data.map((product) => (
            <div key={product.id} className="w-[280px] shrink-0 snap-start sm:w-[300px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
