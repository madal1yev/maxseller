'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { getFavorites, queryKeys } from '@/lib/api-queries'

export function FavoritesView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: getFavorites,
  })

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Sevimlilarim</span>
      </nav>

      <div className="mb-9">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold sm:text-4xl">
          <Heart className="h-8 w-8 fill-emerald text-emerald" /> Sevimlilarim
        </h1>
        <p className="mt-2 text-sm text-muted">
          Keyinroq xarid qilish uchun saqlagan mahsulotlaringiz.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-80" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Sevimlilar ro'yxati bo'sh"
          description="Mahsulot kartasidagi yurak belgisini bosib, mahsulotlarni bu yerga qo'shing."
          action={<Button asChild><Link href="/products">Mahsulotlarni ko'rish</Link></Button>}
        />
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">{data.length} ta saqlangan mahsulot</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
