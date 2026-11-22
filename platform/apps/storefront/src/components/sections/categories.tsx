'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getCategories, queryKeys } from '@/lib/api-queries'
import { categoryIcon } from '@/lib/category-icons'

export function CategoriesSection() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
  })

  return (
    <section className="border-y border-white/10 bg-surface/40 py-16">
      <div className="container-page">
        <SectionHeader
          eyebrow="Kategoriyalar"
          title="O'zingizga keraklisini toping"
          description="Turli sohalarga oid raqamli mahsulotlar katalogi."
          href="/categories"
        />
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState title="Kategoriyalar hali qo'shilmagan" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((category) => {
              const Icon = categoryIcon(category.icon)
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-5 transition hover:border-emerald/50 hover:shadow-glow"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald/5 blur-2xl transition group-hover:bg-emerald/15" />
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald/10 text-emerald transition group-hover:bg-emerald group-hover:text-black">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold leading-snug transition group-hover:text-emerald">
                    {category.nameUz || category.name}
                  </h3>
                  {typeof category.productCount === 'number' ? (
                    <p className="mt-1 text-xs text-muted">{category.productCount} mahsulot</p>
                  ) : null}
                  <ArrowUpRight className="absolute bottom-5 right-5 h-4 w-4 text-muted transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-emerald" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
