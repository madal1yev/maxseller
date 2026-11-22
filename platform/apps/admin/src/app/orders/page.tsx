'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { Order, OrderStatus } from '@maxseller/shared'
import { formatDate, formatMoney, orderStatusLabels } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { useAdminOrders } from '@/lib/api-queries'

const statuses: (OrderStatus | '')[] = [
  '', 'PENDING_PAYMENT', 'RECEIPT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'COMPLETED', 'REJECTED', 'CANCELLED', 'REFUNDED',
]

export default function OrdersPage() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)

  const orders = useAdminOrders({ q: query, status, page, limit: 12 })

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setQuery(searchInput.trim())
    setPage(1)
  }

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'number',
      header: 'Buyurtma',
      sortValue: (order) => order.orderNumber,
      cell: (order) => (
        <Link href={`/orders/${order.id}`} className="font-display text-xs font-semibold text-white hover:text-brand-400" onClick={(event) => event.stopPropagation()}>
          #{order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Mijoz',
      cell: (order) => (
        <div>
          <p className="text-sm font-medium text-white">{order.user?.name ?? 'Noma\'lum mijoz'}</p>
          <p className="text-[11px] text-brand-300">{order.user?.phone ?? 'Telefon yo\'q'}</p>
          <p className="text-[11px] text-[#7f998b]">{order.user?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Mahsulotlar',
      cell: (order) => <span className="text-xs text-[#a8c0b2]">{order.items?.length ?? 0} ta</span>,
    },
    {
      key: 'total',
      header: 'Summa',
      sortValue: (order) => order.total,
      cell: (order) => <span className="whitespace-nowrap text-sm font-semibold text-brand-300">{formatMoney(order.total)}</span>,
    },
    {
      key: 'status',
      header: 'Buyurtma holati',
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'payment',
      header: 'To\'lov',
      cell: (order) => <PaymentStatusBadge status={order.paymentStatus} />,
    },
    {
      key: 'date',
      header: 'Sana',
      sortValue: (order) => order.createdAt,
      cell: (order) => <span className="whitespace-nowrap text-xs text-[#7f998b]">{formatDate(order.createdAt)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Buyurtmalar"
        description="Barcha buyurtmalar va ularning to'lov holatlari."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/payments">Tekshiruv navbati</Link>
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <form onSubmit={handleSearch} className="flex min-w-[220px] flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buyurtma #, ism, telefon yoki email"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Qidirish</Button>
        </form>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | '')
            setPage(1)
          }}
          className="w-full sm:w-60"
          aria-label="Buyurtma holati"
        >
          {statuses.map((value) => (
            <SelectItem key={value || 'all'} value={value}>
              {value ? orderStatusLabels[value] : 'Barcha holatlar'}
            </SelectItem>
          ))}
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={orders.data?.items ?? []}
        rowKey={(order) => order.id}
        onRowClick={(order) => router.push(`/orders/${order.id}`)}
        loading={orders.isLoading}
        error={orders.isError ? orders.error : undefined}
        onRetry={() => void orders.refetch()}
        page={orders.data?.page ?? page}
        pageCount={orders.data?.pages}
        total={orders.data?.total}
        onPageChange={setPage}
        emptyTitle="Buyurtma topilmadi"
        emptyDescription="Qidiruv yoki filtrni o'zgartirib ko'ring."
      />
    </div>
  )
}
