'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Star, XCircle } from 'lucide-react'
import type { Review } from '@maxseller/shared'
import { formatDate } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { useToast } from '@/components/providers'
import { useAdminReviews, useModerateReview } from '@/lib/api-queries'
import { errorMessage, initials } from '@/lib/utils'

export default function ReviewsPage() {
  const { toast } = useToast()
  const [filter, setFilter] = useState<boolean | ''>('')
  const reviews = useAdminReviews(filter)
  const moderate = useModerateReview()

  async function setApproval(review: Review, isApproved: boolean) {
    try {
      await moderate.mutateAsync({ id: review.id, isApproved })
      toast({ title: isApproved ? 'Sharh tasdiqlandi' : 'Sharh rad etildi', variant: isApproved ? 'success' : 'warning' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const columns: DataTableColumn<Review>[] = [
    {
      key: 'user',
      header: 'Foydalanuvchi',
      sortValue: (review) => review.userName,
      cell: (review) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/15 text-[10px] font-bold text-brand-300">
            {initials(review.userName)}
          </span>
          <span className="text-sm text-white">{review.userName}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Mahsulot',
      cell: (review) => (
        <Link href={`/products/${review.productId}`} className="font-mono text-[11px] text-[#8ba397] hover:text-brand-400">
          {review.productId.slice(0, 12)}
        </Link>
      ),
    },
    {
      key: 'rating',
      header: 'Baho',
      sortValue: (review) => review.rating,
      cell: (review) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={index < review.rating ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400' : 'h-3.5 w-3.5 text-[#3b5145]'}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'comment',
      header: 'Sharh',
      cell: (review) => <p className="max-w-md truncate text-xs text-[#a8c0b2]">{review.comment}</p>,
    },
    {
      key: 'status',
      header: 'Holat',
      cell: (review) => (
        <Badge variant={review.isApproved ? 'success' : 'warning'}>
          {review.isApproved ? 'Tasdiqlangan' : 'Kutmoqda'}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Sana',
      cell: (review) => <span className="text-xs text-[#7f998b]">{formatDate(review.createdAt)}</span>,
    },
  ]

  const table = (
    <DataTable
      columns={columns}
      data={reviews.data ?? []}
      rowKey={(review) => review.id}
      loading={reviews.isLoading}
      error={reviews.isError ? reviews.error : undefined}
      onRetry={() => void reviews.refetch()}
      emptyTitle="Sharh topilmadi"
      emptyDescription="Bu bo'limda sharhlar mavjud emas."
      actions={(review) => (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tasdiqlash"
            disabled={moderate.isPending}
            onClick={() => void setApproval(review, true)}
          >
            {moderate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 text-brand-400" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Rad etish"
            disabled={moderate.isPending}
            onClick={() => void setApproval(review, false)}
          >
            <XCircle className="h-4 w-4 text-red-300" />
          </Button>
        </>
      )}
    />
  )

  return (
    <div>
      <PageHeader title="Sharhlar" description="Mijoz sharhlarini moderatsiya qiling." />
      <Tabs
        value={filter === '' ? 'all' : filter ? 'approved' : 'pending'}
        onValueChange={(value) => setFilter(value === 'all' ? '' : value === 'approved')}
        items={[
          { value: 'all', label: 'Barchasi', content: table },
          { value: 'pending', label: 'Kutayotganlar', content: table },
          { value: 'approved', label: 'Tasdiqlanganlar', content: table },
        ]}
      />
    </div>
  )
}
