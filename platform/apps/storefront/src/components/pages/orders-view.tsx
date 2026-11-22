'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDate, formatMoney, ORDER_STATUS_MSG } from '@maxseller/shared'
import { ArrowRight, Package, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusBadge } from '@/components/common/order-status-badge'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { getMyOrders, queryKeys } from '@/lib/api-queries'

export function OrdersView() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.orders,
    queryFn: getMyOrders,
  })

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Mening xaridlarim</span>
      </nav>

      <div className="mb-9">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Mening xaridlarim</h1>
        <p className="mt-2 text-sm text-muted">
          Barcha buyurtmalaringiz holati va to'lov ma'lumotlari shu yerda.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Hali xaridlaringiz yo'q"
          description="Birinchi buyurtmangizni berish uchun mahsulotlar katalogiga o'ting."
          action={<Button asChild><Link href="/products">Mahsulotlarni ko'rish</Link></Button>}
        />
      ) : (
        <div className="space-y-4">
          {data.map((order) => (
            <div key={order.id} className="panel p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-extrabold">#{order.orderNumber}</h2>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Jami</p>
                  <p className="font-display text-xl font-extrabold text-emerald">
                    {formatMoney(order.total)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald" /> {order.items.length} ta mahsulot
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-emerald" /> To'lov: {order.paymentStatus}
                </span>
              </div>

              <p className="mt-4 rounded-xl border border-emerald/15 bg-emerald/[0.05] px-4 py-3 text-sm leading-relaxed text-foreground/85">
                {ORDER_STATUS_MSG[order.status] ?? order.status}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button size="sm" asChild>
                  <Link href={`/orders/${order.id}`}>
                    Batafsil va to'lov <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
