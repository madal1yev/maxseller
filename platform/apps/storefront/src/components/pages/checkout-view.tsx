'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { formatMoney } from '@maxseller/shared'
import { ArrowLeft, CreditCard, Info, Loader2, LockKeyhole, ShoppingBag, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { useCart, useAuth } from '@/components/providers'
import { useToast } from '@/components/ui/toast'
import { createOrder, getPaymentMethods, queryKeys } from '@/lib/api-queries'

export function CheckoutView() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { items, subtotal, count, clearCart, isReady } = useCart()
  const [coupon, setCoupon] = React.useState('')
  const [note, setNote] = React.useState('')

  const methodsQuery = useQuery({
    queryKey: queryKeys.paymentMethods,
    queryFn: getPaymentMethods,
  })

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      clearCart()
      toast({
        title: 'Buyurtma yaratildi',
        description: `Buyurtma raqami: ${order.orderNumber}`,
        variant: 'success',
      })
      router.push(`/orders/${order.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Buyurtma yaratilmadi',
        description: error.message,
        variant: 'error',
      })
    },
  })

  if (!isReady) {
    return <div className="container-page py-16 text-sm text-muted">Savat yuklanmoqda...</div>
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-10">
        <EmptyState
          title="Savatingiz bo'sh"
          description="Buyurtma berish uchun avval savatga mahsulot qo'shing."
          action={<Button asChild><Link href="/products">Mahsulotlarni ko'rish</Link></Button>}
        />
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-emerald">Savat</Link>
        <span>/</span>
        <span className="text-foreground">Buyurtma berish</span>
      </nav>

      <h1 className="text-3xl font-extrabold sm:text-4xl">Buyurtma berish</h1>
      <p className="mt-2 text-sm text-muted">
        Buyurtmani tasdiqlagach, to'lov ko'rsatmalari bilan tanishib, chekingizni yuklang.
      </p>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <ShoppingBag className="h-5 w-5 text-emerald" /> Buyurtmadagi mahsulotlar
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-bg/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{item.title}</p>
                    <p className="mt-1 text-xs text-muted">{item.quantity} × {formatMoney(item.price)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald">
                    {formatMoney(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <Ticket className="h-5 w-5 text-emerald" /> Kupon va izoh
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="coupon" className="mb-2 block">Kupon kodi (agar mavjud bo'lsa)</Label>
                <Input
                  id="coupon"
                  value={coupon}
                  onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                  placeholder="MASALAN: SALE10"
                  maxLength={40}
                />
              </div>
              <div>
                <Label htmlFor="note" className="mb-2 block">Mijoz izohi</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 1000))}
                  placeholder="Buyurtmaga qo'shimcha izoh..."
                />
              </div>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald" />
              Kupon kodi buyurtma yaratishda tekshiriladi. Noto'g'ri kod bo'lsa, buyurtma xatolik bilan qaytariladi.
            </p>
          </section>

          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <CreditCard className="h-5 w-5 text-emerald" /> To'lov usullari
            </h2>
            {methodsQuery.isLoading ? (
              <p className="text-sm text-muted">Yuklanmoqda...</p>
            ) : methodsQuery.isError ? (
              <ErrorState
                message="To'lov usullarini yuklab bo'lmadi. Buyurtmani yaratishda davom etishingiz mumkin."
                onRetry={() => void methodsQuery.refetch()}
              />
            ) : !methodsQuery.data || methodsQuery.data.length === 0 ? (
              <p className="text-sm text-muted">
                To'lov usullari hali sozlanmagan. Buyurtma yaratgandan keyin ma'muriyat bilan bog'laning.
              </p>
            ) : (
              <div className="space-y-3">
                {methodsQuery.data.map((method) => (
                  <div key={method.id} className="rounded-xl border border-white/10 bg-bg/40 p-4">
                    <p className="text-sm font-bold text-emerald">{method.name}</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">
                      {method.instructions}
                    </p>
                    {method.recipientDetails ? (
                      <p className="mt-2 whitespace-pre-line rounded-lg bg-white/[0.04] p-2 text-xs text-foreground/80">
                        {method.recipientDetails}
                      </p>
                    ) : null}
                    {method.linkUrl ? (
                      <a
                        href={method.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-bold text-emerald hover:underline"
                      >
                        To'lov havolasiga o'tish →
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="panel h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold">Buyurtma xulosasi</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Mahsulotlar ({count})</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Chegirma</span>
              <span>—</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Mijoz</span>
              <span className="max-w-[160px] truncate">{user?.name ?? 'Mijoz'}</span>
            </div>
          </div>
          <div className="my-5 h-px bg-white/10" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">Jami to'lov</span>
            <span className="font-display text-2xl font-extrabold text-emerald">
              {formatMoney(subtotal)}
            </span>
          </div>
          <Button
            size="lg"
            className="mt-6 w-full"
            disabled={orderMutation.isPending}
            onClick={() =>
              orderMutation.mutate({
                items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
                couponCode: coupon || undefined,
                customerNote: note || undefined,
              })
            }
          >
            {orderMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Yaratilmoqda...</>
            ) : (
              <>Buyurtmani tasdiqlash</>
            )}
          </Button>
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link href="/cart"><ArrowLeft className="h-4 w-4" /> Savatga qaytish</Link>
          </Button>
          <p className="mt-5 flex items-center gap-2 text-[11px] leading-relaxed text-muted">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald" />
            Buyurtma yaratilgach, status «To'lov kutilmoqda» bo'ladi.
          </p>
        </aside>
      </div>
    </div>
  )
}
