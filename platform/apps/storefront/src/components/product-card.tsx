'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { formatMoney, type Product } from '@maxseller/shared'
import { Heart, Star, ShoppingBag, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth, useCart } from '@/components/providers'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const { addItem } = useCart()
  const { isFavorite, toggleFavorite } = useAuth()
  const { toast } = useToast()
  const [favoritePending, setFavoritePending] = React.useState(false)
  const favorite = isFavorite(product.id)
  const image = product.images?.[0]?.url ?? null
  const discount =
    product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0

  async function handleFavorite() {
    if (favoritePending) return
    setFavoritePending(true)
    await toggleFavorite(product.id)
    setFavoritePending(false)
  }

  function handleAddToCart() {
    addItem(product, 1)
    toast({
      title: "Mahsulot savatga qo'shildi",
      description: product.title,
      variant: 'success',
    })
  }

  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-card transition-colors hover:border-emerald/40',
        className,
      )}
    >
      <Link href={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-bg">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.images?.[0]?.alt || product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-grid-glow">
            <ShoppingBag className="h-10 w-10 text-emerald/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent opacity-60" />
        {discount > 0 ? (
          <span className="absolute left-3 top-3 rounded-lg bg-emerald px-2 py-1 text-[11px] font-extrabold text-black">
            -{discount}%
          </span>
        ) : null}
        {product.bestSeller ? (
          <span className="absolute bottom-3 left-3">
            <Badge variant="warning">Top sotuvchi</Badge>
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={handleFavorite}
        disabled={favoritePending}
        aria-label={favorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
        className={cn(
          'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/50 backdrop-blur transition hover:scale-105 disabled:opacity-60',
          favorite ? 'border-emerald/60 text-emerald' : 'text-white/80 hover:text-emerald',
        )}
      >
        <Heart className={cn('h-[18px] w-[18px]', favorite && 'fill-current')} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-emerald">
            {product.category?.nameUz || product.category?.name || 'Raqamli mahsulot'}
          </span>
          {typeof product.rating === 'number' ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              {product.rating.toFixed(1)}
              {typeof product.reviewsCount === 'number' ? (
                <span className="text-muted">({product.reviewsCount})</span>
              ) : null}
            </span>
          ) : null}
        </div>

        <Link href={`/product/${product.slug}`} className="group/title">
          <h3 className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug transition group-hover/title:text-emerald">
            {product.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
          {product.shortDescription || 'Batafsil ma\'lumot uchun mahsulot sahifasiga o\'ting.'}
        </p>

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="font-display text-base font-extrabold text-emerald">
              {formatMoney(product.price, product.currency || "so'm")}
            </span>
            {product.oldPrice > product.price ? (
              <span className="text-xs text-muted line-through">
                {formatMoney(product.oldPrice, product.currency || "so'm")}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/product/${product.slug}`}>
                Batafsil <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button size="sm" onClick={handleAddToCart}>
              <ShoppingBag className="h-3.5 w-3.5" /> Savatga
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
