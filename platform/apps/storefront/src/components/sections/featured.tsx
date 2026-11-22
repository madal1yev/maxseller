'use client'

import { useQuery } from '@tanstack/react-query'
import { ProductCard } from '@/components/product-card'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { ProductCardSkeleton } from '@/components/ui/skeleton'
import { getFeaturedProducts, queryKeys } from '@/lib/api-queries'

export function FeaturedProducts() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.featured,
    queryFn: getFeaturedProducts,
  })

  return (
    <section className="container-page py-16">
      <SectionHeader
        eyebrow="Tanlanganlar"
        title="Eng so'nggi va eng yaxshi mahsulotlar"
        description="MaxSeller jamoasi tanlagan, eng ko'p talab qilinadigan raqamli mahsulotlar."
        href="/products"
      />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Tavsiya etilgan mahsulotlar hali yo'q" description="Tez orada bu yerda yangi mahsulotlar paydo bo'ladi." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
