'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, LayoutGrid } from 'lucide-react'
import { getCategories, queryKeys } from '@/lib/api-queries'
import { categoryIcon } from '@/lib/category-icons'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

export function CategoriesView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: getCategories,
  })

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Kategoriyalar</span>
      </nav>

      <div className="mb-9">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Kategoriyalar</h1>
        <p className="mt-2 text-sm text-muted">
          Raqamli mahsulotlarni toifasi bo'yicha toping. Har bir kategoriya ichida kerakli mahsulotni tanlang.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Kategoriyalar hali qo'shilmagan" description="Tez orada yangi kategoriyalar paydo bo'ladi." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((category) => {
            const Icon = categoryIcon(category.icon)
            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group relative flex min-h-[190px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/70 p-6 transition hover:-translate-y-1 hover:border-emerald/50 hover:shadow-glow"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald/5 blur-2xl transition group-hover:bg-emerald/20" />
                <span className="mb-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10 text-emerald transition group-hover:bg-emerald group-hover:text-black">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={category.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </span>
                <h2 className="mt-6 text-base font-bold leading-snug transition group-hover:text-emerald">
                  {category.nameUz || category.name}
                </h2>
                {category.description ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{category.description}</p>
                ) : null}
                <span className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {typeof category.productCount === 'number' ? `${category.productCount} mahsulot` : 'Mahsulotlarni ko\'rish'}
                  <ArrowUpRight className="ml-auto h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
