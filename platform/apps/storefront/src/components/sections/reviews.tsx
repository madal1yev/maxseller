'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '@maxseller/shared'
import { Quote, Star } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeaturedProducts, getReviews, queryKeys } from '@/lib/api-queries'

export function ReviewsSection() {
  const productsQuery = useQuery({
    queryKey: queryKeys.featured,
    queryFn: getFeaturedProducts,
  })
  const product = productsQuery.data?.[0]
  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews(product?.id ?? 'none'),
    queryFn: () => getReviews(product!.id),
    enabled: Boolean(product),
  })

  return (
    <section className="container-page py-16">
      <SectionHeader
        eyebrow="Mijozlar fikri"
        title="Biz haqimizda sharhlar"
        description="Tasdiqlangan xaridorlarning haqiqiy fikrlari."
      />
      {productsQuery.isLoading || reviewsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : productsQuery.isError || reviewsQuery.isError ? (
        <ErrorState onRetry={() => void (productsQuery.isError ? productsQuery.refetch() : reviewsQuery.refetch())} />
      ) : !reviewsQuery.data || reviewsQuery.data.length === 0 ? (
        <EmptyState
          title="Hali sharhlar yo'q"
          description="Birinchi bo'lib sharh qoldiring — mahsulot sahifasida xarid qilgach, fikringizni yozishingiz mumkin."
          action={
            product ? (
              <Link href={`/product/${product.slug}`} className="text-sm font-bold text-emerald hover:underline">
                Mahsulotga o'tish →
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviewsQuery.data.slice(0, 6).map((review) => (
              <div key={review.id} className="rounded-2xl border border-white/10 bg-card/70 p-6">
                <Quote className="mb-4 h-6 w-6 text-emerald/50" />
                <div className="mb-3 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${index < review.rating ? 'fill-amber-300 text-amber-300' : 'text-white/20'}`}
                    />
                  ))}
                </div>
                <p className="line-clamp-4 text-sm leading-relaxed text-foreground/85">{review.comment}</p>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                  <p className="text-sm font-bold">{review.userName}</p>
                  <p className="text-xs text-muted">{formatDate(review.createdAt).split(',')[0]}</p>
                </div>
              </div>
            ))}
          </div>
          {product ? (
            <p className="mt-5 text-center text-xs text-muted">
              Sharhlar «{product.title}» mahsulotiga tegishli.{' '}
              <Link href={`/product/${product.slug}`} className="font-semibold text-emerald hover:underline">
                Batafsil
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
