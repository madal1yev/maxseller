'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import type { ProductListParams } from '@/lib/api-queries'
import { getCategories, getProducts, queryKeys } from '@/lib/api-queries'
import { ProductCard } from '@/components/product-card'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ProductCardSkeleton } from '@/components/ui/skeleton'

const sortOptions = [
  { value: 'new', label: 'Eng yangilari' },
  { value: 'popular', label: 'Eng ommaboplari' },
  { value: 'price_asc', label: 'Narx: past → yuqori' },
  { value: 'price_desc', label: 'Narx: yuqori → past' },
]

export function ProductsView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sort = (searchParams.get('sort') ?? 'new') as NonNullable<ProductListParams['sort']>
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [searchInput, setSearchInput] = React.useState(q)
  React.useEffect(() => setSearchInput(q), [q])

  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: getCategories })
  const productsQuery = useQuery({
    queryKey: queryKeys.products({ q, category, sort, page, limit: 12 }),
    queryFn: () => getProducts({ q, category, sort, page, limit: 12 }),
  })

  function updateParams(next: { q?: string; category?: string; sort?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString())
    const values = {
      q: next.q ?? q,
      category: next.category ?? category,
      sort: next.sort ?? sort,
      page: next.page ?? 1,
    }
    Object.entries(values).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'new')) params.set(key, String(value))
      else params.delete(key)
    })
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ''}`)
  }

  const total = productsQuery.data?.total ?? 0
  const pages = productsQuery.data?.pages ?? 1

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Mahsulotlar</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Barcha mahsulotlar</h1>
        <p className="mt-2 text-sm text-muted">
          MaxSeller katalogidagi barcha raqamli mahsulotlar. O'zingizga keraklisini toping.
        </p>
      </div>

      <div className="panel mb-8 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_220px]">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              updateParams({ q: searchInput.trim() })
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Mahsulot nomi bilan qidirish..."
              className="pl-9"
              aria-label="Qidirish"
            />
          </form>
          <Select
            value={category}
            onChange={(event) => updateParams({ category: event.target.value })}
            aria-label="Kategoriya bo'yicha filtr"
            options={(categoriesQuery.data ?? []).map((item) => ({
              value: item.slug,
              label: item.nameUz || item.name,
            }))}
            placeholder="Barcha kategoriyalar"
          />
          <Select
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
            aria-label="Saralash"
            options={sortOptions}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald" />
            {productsQuery.isLoading ? 'Qidirilmoqda...' : `Jami ${total} ta mahsulot topildi`}
          </span>
          {category || q ? (
            <button
              type="button"
              onClick={() => router.replace('/products')}
              className="font-semibold text-emerald hover:underline"
            >
              Filtrlarni tozalash
            </button>
          ) : null}
        </div>
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
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
          title="Mahsulot topilmadi"
          description="Qidiruv so'rovingiz yoki filtrlaringizni o'zgartirib qaytadan urinib ko'ring."
          action={
            <Button variant="outline" onClick={() => router.replace('/products')}>
              Filtrlarni tozalash
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productsQuery.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {pages > 1 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: page - 1 })}
              >
                <ChevronLeft className="h-4 w-4" /> Oldingi
              </Button>
              {Array.from({ length: pages }).slice(0, 7).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <Button
                    key={pageNumber}
                    size="sm"
                    variant={pageNumber === page ? 'default' : 'secondary'}
                    onClick={() => updateParams({ page: pageNumber })}
                  >
                    {pageNumber}
                  </Button>
                )
              })}
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => updateParams({ page: page + 1 })}
              >
                Keyingi <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
