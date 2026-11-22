'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Ban, CheckCircle2, Loader2, Mail, Phone, ShoppingCart, User } from 'lucide-react'
import { formatDate, formatMoney } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { OrderStatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/providers'
import { useAdminCustomer, useUpdateCustomer } from '@/lib/api-queries'
import { errorMessage, initials } from '@/lib/utils'
import type { Order } from '@maxseller/shared'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const { toast } = useToast()
  const customer = useAdminCustomer(params.id)
  const updateCustomer = useUpdateCustomer()
  const data = customer.data

  async function toggleAccess(active: boolean) {
    if (!data) return
    try {
      await updateCustomer.mutateAsync({ id: data.id, isActive: active })
      toast({ title: active ? 'Mijoz kirishi yoqildi' : 'Mijoz kirishi o\'chirildi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const orderColumns: DataTableColumn<Order>[] = [
    {
      key: 'number',
      header: 'Buyurtma',
      cell: (order) => (
        <Link href={`/orders/${order.id}`} className="font-semibold text-white hover:text-brand-400">#{order.orderNumber}</Link>
      ),
    },
    { key: 'date', header: 'Sana', cell: (order) => <span className="text-xs text-[#7f998b]">{formatDate(order.createdAt)}</span> },
    { key: 'items', header: 'Mahsulotlar', cell: (order) => <span className="text-xs text-[#a8c0b2]">{order.items?.length ?? 0} ta</span> },
    { key: 'total', header: 'Summa', cell: (order) => <span className="text-sm font-semibold text-brand-300">{formatMoney(order.total)}</span> },
    { key: 'status', header: 'Holat', cell: (order) => <OrderStatusBadge status={order.status} /> },
  ]

  if (customer.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    )
  }

  if (customer.isError || !data) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-red-300">Mijoz yuklanmadi yoki topilmadi.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/customers"><ArrowLeft className="h-4 w-4" /> Mijozlarga qaytish</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={data.name}
        description={`Ro'yxatdan o'tgan: ${formatDate(data.createdAt)}`}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/customers"><ArrowLeft className="h-4 w-4" /> Orqaga</Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/80 to-brand-700 font-display text-base font-bold text-ink-950">
                {initials(data.name)}
              </span>
              <div>
                <CardTitle className="text-base">{data.name}</CardTitle>
                <Badge variant={data.role === 'CUSTOMER' ? 'secondary' : 'info'} className="mt-1">{data.role}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[#a8c0b2]"><Mail className="h-4 w-4 text-[#7f998b]" /> {data.email}</div>
            <div className="flex items-center gap-2 text-[#a8c0b2]"><Phone className="h-4 w-4 text-[#7f998b]" /> {data.phone ?? 'Telefon ko\'rsatilmagan'}</div>
            <div className="flex items-center gap-2 text-[#a8c0b2]"><User className="h-4 w-4 text-[#7f998b]" /> ID: {data.id.slice(0, 12)}</div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[11px] text-[#7f998b]">Buyurtmalar</p>
                <p className="mt-1 font-display text-lg font-semibold text-white">{data.orderCount}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[11px] text-[#7f998b]">Jami sarf</p>
                <p className="mt-1 font-display text-sm font-semibold text-brand-300">{formatMoney(data.totalSpent)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-semibold text-white">Kirish huquqi</p>
              <Button
                variant={data.isActive === false ? 'outline' : 'destructive'}
                size="sm"
                className="w-full"
                disabled={updateCustomer.isPending}
                onClick={() => void toggleAccess(data.isActive === false)}
              >
                {updateCustomer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : data.isActive === false ? (
                  <><CheckCircle2 className="h-4 w-4" /> Kirishni yoqish</>
                ) : (
                  <><Ban className="h-4 w-4" /> Kirishni o'chirish</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-400" /> Buyurtma tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={orderColumns}
              data={data.orders ?? []}
              rowKey={(order) => order.id}
              emptyTitle="Buyurtma yo'q"
              emptyDescription="Bu mijoz hali buyurtma bermagan."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
