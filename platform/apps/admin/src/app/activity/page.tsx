'use client'

import { useState } from 'react'
import { formatDate } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminActivity } from '@/lib/api-queries'
import { initials } from '@/lib/utils'
import type { ActivityLog } from '@maxseller/shared'

export default function ActivityPage() {
  const [page, setPage] = useState(1)
  const activity = useAdminActivity(page)

  const columns: DataTableColumn<ActivityLog>[] = [
    {
      key: 'admin',
      header: 'Xodim',
      cell: (log) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-300">
            {initials(log.adminName ?? 'Tizim')}
          </span>
          <span className="text-sm text-white">{log.adminName ?? 'Tizim'}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Harakat',
      sortValue: (log) => log.action,
      cell: (log) => <Badge variant="secondary">{log.action}</Badge>,
    },
    {
      key: 'entity',
      header: 'Ob\'yekt',
      cell: (log) => (
        <span className="text-xs text-[#a8c0b2]">
          {log.entity}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Tafsilotlar',
      cell: (log) => <p className="max-w-md truncate text-xs text-[#8ba397]">{log.details ?? '—'}</p>,
    },
    {
      key: 'date',
      header: 'Vaqt',
      sortValue: (log) => log.createdAt,
      cell: (log) => <span className="whitespace-nowrap text-xs text-[#7f998b]">{formatDate(log.createdAt)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Faoliyat"
        description="Administratorlar tomonidan amalga oshirilgan harakatlar jurnali."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void activity.refetch()}>
            Yangilash
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={activity.data?.items ?? []}
        rowKey={(log) => log.id}
        loading={activity.isLoading}
        error={activity.isError ? activity.error : undefined}
        onRetry={() => void activity.refetch()}
        page={activity.data?.page ?? page}
        pageCount={activity.data?.pages}
        total={activity.data?.total}
        onPageChange={setPage}
        emptyTitle="Faoliyat topilmadi"
        emptyDescription="Hozircha hech qanday harakat qayd etilmagan."
      />
    </div>
  )
}
