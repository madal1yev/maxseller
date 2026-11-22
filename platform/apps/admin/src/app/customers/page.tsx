'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Power, Search } from 'lucide-react'
import type { User } from '@maxseller/shared'
import { formatDate, formatMoney } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/providers'
import { useAdminCustomers, useUpdateCustomer } from '@/lib/api-queries'
import { errorMessage, initials } from '@/lib/utils'

type CustomerRow = User & { orderCount: number; totalSpent: number; isActive?: boolean }

export default function CustomersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const customers = useAdminCustomers({ q: query, page, limit: 12 })
  const updateCustomer = useUpdateCustomer()

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setQuery(searchInput.trim())
    setPage(1)
  }

  async function toggleAccess(customer: CustomerRow) {
    const next = customer.isActive === false
    try {
      await updateCustomer.mutateAsync({ id: customer.id, isActive: next })
      toast({ title: next ? 'Mijoz faollashtirildi' : 'Mijoz kirishi o\'chirildi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: 'name',
      header: 'Mijoz',
      sortValue: (customer) => customer.name,
      cell: (customer) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400/80 to-brand-700 text-[11px] font-bold text-ink-950">
            {initials(customer.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{customer.name}</p>
            <p className="truncate text-[11px] text-[#7f998b]">{customer.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Telefon', cell: (customer) => <span className="text-xs text-[#a8c0b2]">{customer.phone ?? '—'}</span> },
    {
      key: 'orders',
      header: 'Buyurtmalar',
      sortValue: (customer) => customer.orderCount,
      cell: (customer) => <span className="text-sm text-white">{customer.orderCount}</span>,
    },
    {
      key: 'spent',
      header: ' Sarflangan',
      sortValue: (customer) => customer.totalSpent,
      cell: (customer) => <span className="whitespace-nowrap text-sm font-semibold text-brand-300">{formatMoney(customer.totalSpent)}</span>,
    },
    {
      key: 'created',
      header: 'Ro\'yxatdan o\'tgan',
      sortValue: (customer) => customer.createdAt,
      cell: (customer) => <span className="whitespace-nowrap text-xs text-[#7f998b]">{formatDate(customer.createdAt)}</span>,
    },
    {
      key: 'status',
      header: 'Kirish',
      cell: (customer) => (
        <Badge variant={customer.isActive === false ? 'danger' : 'success'}>
          {customer.isActive === false ? 'O\'chirilgan' : 'Faol'}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Mijozlar" description="Ro'yxatdan o'tgan mijozlar va ularning buyurtma tarixi." />

      <Card className="mb-5 flex flex-wrap gap-3 p-4">
        <form onSubmit={handleSearch} className="flex min-w-[220px] flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ism, email yoki telefon"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Qidirish</Button>
        </form>
      </Card>

      <DataTable
        columns={columns}
        data={(customers.data?.items ?? []) as CustomerRow[]}
        rowKey={(customer) => customer.id}
        onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
        loading={customers.isLoading}
        error={customers.isError ? customers.error : undefined}
        onRetry={() => void customers.refetch()}
        page={customers.data?.page ?? page}
        pageCount={customers.data?.pages}
        total={customers.data?.total}
        onPageChange={setPage}
        emptyTitle="Mijoz topilmadi"
        emptyDescription="Qidiruv so'rovini o'zgartirib ko'ring."
        actions={(customer) => (
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/customers/${customer.id}`} onClick={(event) => event.stopPropagation()}>Profil</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Kirishni o'zgartirish"
              disabled={updateCustomer.isPending}
              onClick={() => void toggleAccess(customer)}
            >
              {updateCustomer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className={customer.isActive === false ? 'h-4 w-4 text-brand-400' : 'h-4 w-4 text-red-300'} />}
            </Button>
          </>
        )}
      />
    </div>
  )
}
