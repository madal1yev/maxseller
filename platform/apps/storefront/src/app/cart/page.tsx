'use client'

import Link from 'next/link'
import { formatMoney } from '@maxseller/shared'
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/empty-state'
import { useCart } from '@/components/providers'

export default function CartPage() {
  const { items, count, subtotal, isReady, updateQuantity, removeItem, clearCart } = useCart()

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Savat</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Xarid savatimg</h1>
          <p className="mt-2 text-sm text-muted">
            {isReady && count > 0 ? `${count} ta mahsulot tanlangan` : 'Hozircha savatingiz bo\'sh'}
          </p>
        </div>
        {items.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-400">
            <Trash2 className="h-4 w-4" /> Savatni tozalash
          </Button>
        ) : null}
      </div>

      {!isReady ? (
        <div className="text-sm text-muted">Savat yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Savatingiz bo'sh"
          description="Mahsulotlar katalogiga o'ting va o'zingizga yoqqan raqamli mahsulotlarni qo'shing."
          action={
            <Button asChild>
              <Link href="/products">Mahsulotlarni ko'rish</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card/70 p-4 sm:flex-row sm:items-center"
              >
                <Link
                  href={`/product/${item.slug}`}
                  className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-bg sm:h-20 sm:w-24"
                >
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingCart className="h-7 w-7 text-emerald/30" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${item.slug}`} className="text-sm font-bold transition hover:text-emerald">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm font-bold text-emerald">
                    {formatMoney(item.price)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-xl border border-white/10 bg-bg/60">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Miqdorni kamaytirish"
                      className="flex h-9 w-9 items-center justify-center rounded-l-xl transition hover:bg-white/10 disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      aria-label="Miqdorni oshirish"
                      className="flex h-9 w-9 items-center justify-center rounded-r-xl transition hover:bg-white/10 disabled:opacity-30"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    aria-label="Savatdan o'chirish"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-red-400/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside className="panel h-fit p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-extrabold">Buyurtma xulosasi</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Mahsulotlar soni</span>
                <span>{count} ta</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Oraliq jami</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Chegirma</span>
                <span>{formatMoney(0)}</span>
              </div>
            </div>
            <div className="my-5 h-px bg-white/10" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold">Jami</span>
              <span className="font-display text-2xl font-extrabold text-emerald">
                {formatMoney(subtotal)}
              </span>
            </div>
            <Button size="lg" className="mt-6 w-full" asChild>
              <Link href="/checkout">
                Buyurtma berish <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" className="mt-2 w-full" asChild>
              <Link href="/products">Xaridni davom ettirish</Link>
            </Button>
            <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
              To'lov tasdiqlangach, fayllaringiz yuklamalar bo'limida paydo bo'ladi.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
