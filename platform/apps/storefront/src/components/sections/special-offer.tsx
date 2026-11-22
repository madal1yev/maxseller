'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@maxseller/shared'
import { ArrowRight, Percent, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getFeaturedProducts, queryKeys } from '@/lib/api-queries'

export function SpecialOffer() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.featured,
    queryFn: getFeaturedProducts,
  })

  const product = data?.find((item) => item.oldPrice > item.price) ?? data?.[0]
  const discount =
    product && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0

  return (
    <section className="container-page py-14">
      <div className="relative overflow-hidden rounded-3xl border border-emerald/25 bg-gradient-to-br from-surface via-card to-surface p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald/15 blur-[90px]" />
        <div className="pointer-events-none absolute inset-0 bg-grid-glow bg-[size:100%_100%,48px_48px,48px_48px] opacity-40" />
        <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-1.5 text-xs font-bold text-emerald">
              <Percent className="h-3.5 w-3.5" /> Maxsus taklif
            </div>
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              Sifatli mahsulotlarni <span className="text-gradient">arzonroq</span> oling
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
              Tanlangan mahsulotlarga chegirmalar mavjud. O'zingizga kerak bo'lgan raqamli
              mahsulotni hoziroq tanlang va xarid qiling.
            </p>
            {isLoading ? (
              <Skeleton className="mt-6 h-12 w-64" />
            ) : isError ? (
              <p className="mt-6 text-sm text-red-400">
                Taklif ma'lumotlarini yuklab bo'lmadi. Keyinroq qaytadan urinib ko'ring.
              </p>
            ) : product ? (
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link href={`/product/${product.slug}`}>
                    Taklifni ko'rish <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-extrabold text-emerald">
                    {formatMoney(product.price, product.currency || "so'm")}
                  </span>
                  {discount > 0 ? (
                    <span className="text-sm text-muted line-through">
                      {formatMoney(product.oldPrice, product.currency || "so'm")}
                    </span>
                  ) : null}
                  {discount > 0 ? (
                    <span className="rounded-lg bg-emerald/15 px-2 py-1 text-xs font-bold text-emerald">
                      -{discount}%
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <Button size="lg" asChild className="mt-7">
                <Link href="/products">Katalogga o'tish</Link>
              </Button>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-bg/40 p-5 backdrop-blur">
            <Timer className="h-10 w-10 text-emerald" />
            <div>
              <p className="text-sm font-bold">Chegirmalar cheklangan</p>
              <p className="text-xs text-muted">Mahsulotlar tugagunicha amal qiladi</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
