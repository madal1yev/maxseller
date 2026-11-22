'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCategories, getProducts, queryKeys } from '@/lib/api-queries'
import { categoryIcon } from '@/lib/category-icons'
import { ProductCard } from '@/components/product-card'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton'

export function CategoryDetailView({ slug, page }: { slug: string; page: number }) {
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: getCategories })
  const category = categoriesQuery.data?.find((item) => item.slug === slug)

  const productsQuery = useQuery({
    queryKey: queryKeys.products({ category: slug, page, limit: 12 }),
    queryFn: () => getProducts({ category: slug, page, limit: 12 }),
  })

  const Icon = categoryIcon(category?.icon)
  const pages = productsQuery.data?.pages ?? 1

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-emerald">Kategoriyalar</Link>
        <span>/</span>
        <span className="text-foreground">{category?.nameUz || category?.name || slug}</span>
      </nav>

      <div className="panel relative mb-9 overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald/10 blur-[80px]" />
        <div className="relative flex items-center gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald/10 text-emerald">
            <Icon className="h-6 w-6" />
          </span>
          <div>
            {categoriesQuery.isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {category?.nameUz || category?.name || 'Kategoriya'}
              </h1>
            )}
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {category?.description || 'Bu kategoriyadagi barcha raqamli mahsulotlar bilan tanishing.'}
            </p>
          </div>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : productsQuery.isError ? (
        <ErrorState
          message={productsQuery.error instanceof Error ? productsQuery.error.message : undefined}
          onRetry={() => void productsQuery.refetch()}
        />
      ) : !productsQuery.data || productsQuery.data.items.length === 0 ? (
        <EmptyState
          title="Bu kategoriyada mahsulot yo'q"
          description="Boshqa kategoriyalarni ko'rib chiqing yoki keyinroq qaytadan urinib ko'ring."
          action={<Button asChild variant="outline"><Link href="/categories">Boshqa kategoriyalar</Link></Button>}
        />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">
            Jami <span className="font-bold text-emerald">{productsQuery.data.total}</span> ta mahsulot
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productsQuery.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {pages > 1 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? (
                  <Link href={`/categories/${slug}?page=${page - 1}`}>
                    <ChevronLeft className="h-4 w-4" /> Oldingi
                  </Link>
                ) : (
                  <span><ChevronLeft className="h-4 w-4" /> Oldingi</span>
                )}
              </Button>
              <span className="text-sm text-muted">{page} / {pages}</span>
              <Button variant="secondary" size="sm" asChild={page < pages} disabled={page >= pages}>
                {page < pages ? (
                  <Link href={`/categories/${slug}?page=${page + 1}`}>
                    Keyingi <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span>Keyingi <ChevronRight className="h-4 w-4" /></span>
                )}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
