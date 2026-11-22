'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { getProducts, queryKeys } from '@/lib/api-queries'
import { ProductCard } from '@/components/product-card'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProductCardSkeleton } from '@/components/ui/skeleton'

export function SearchView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [input, setInput] = React.useState(query)

  React.useEffect(() => setInput(query), [query])

  const searchQuery = useQuery({
    queryKey: queryKeys.products({ q: query, limit: 24 }),
    queryFn: () => getProducts({ q: query, limit: 24 }),
    enabled: query.trim().length > 0,
  })

  const results = searchQuery.data?.items ?? []

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Qidiruv</span>
      </nav>

      <h1 className="text-3xl font-extrabold sm:text-4xl">Qidiruv natijalari</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const value = input.trim()
          router.push(value ? `/search?q=${encodeURIComponent(value)}` : '/search')
        }}
        className="relative mt-6 max-w-2xl"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald" />
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Mahsulot, kategoriya yoki kalit so'z..."
          className="h-12 pl-12"
          aria-label="Qidiruv so'rovi"
        />
        <Button type="submit" className="absolute right-1.5 top-1.5 h-9">
          Qidirish
        </Button>
      </form>

      {!query ? (
        <div className="mt-10">
          <EmptyState
            title="Qidiruv so'rovini kiriting"
            description="Mahsulot nomi yoki tavsifidagi kalit so'z bilan qidirishingiz mumkin."
          />
        </div>
      ) : searchQuery.isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : searchQuery.isError ? (
        <ErrorState
          className="mt-10"
          message={searchQuery.error instanceof Error ? searchQuery.error.message : undefined}
          onRetry={() => void searchQuery.refetch()}
        />
      ) : results.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title={`«${query}» bo'yicha hech narsa topilmadi`}
            description="Boshqa kalit so'z bilan qidirib ko'ring yoki barcha mahsulotlarni ko'rib chiqing."
            action={
              <Button asChild variant="outline">
                <Link href="/products">Barcha mahsulotlar</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted">
            «<span className="font-semibold text-foreground">{query}</span>» bo'yicha{' '}
            <span className="font-semibold text-emerald">{searchQuery.data?.total ?? results.length}</span> ta natija
          </p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
