'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import type { Order, VerificationAction } from '@maxseller/shared'
import { formatDate, formatMoney } from '@maxseller/shared'
import { PageHeader } from '@/components/page-header'
import { OrderStatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import { useAdminOrders, useVerifyAnyOrder } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

export default function PaymentsPage() {
  const { toast } = useToast()
  const review = useAdminOrders({ status: 'PAYMENT_REVIEW', page: 1, limit: 50 })
  const submitted = useAdminOrders({ status: 'RECEIPT_SUBMITTED', page: 1, limit: 50 })
  const verify = useVerifyAnyOrder()

  const [rejecting, setRejecting] = useState<Order | null>(null)
  const [reason, setReason] = useState('')

  const queue = [
    ...(submitted.data?.items ?? []),
    ...(review.data?.items ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const loading = review.isLoading || submitted.isLoading
  const error = review.isError ? review.error : submitted.isError ? submitted.error : undefined

  async function handleVerify(order: Order, action: VerificationAction, verifyReason?: string) {
    try {
      await verify.mutateAsync({ id: order.id, action, reason: verifyReason ?? '' })
      toast({
        title: action === 'APPROVE' ? `Buyurtma #${order.orderNumber} tasdiqlandi` : action === 'REJECT' ? 'To\'lov rad etildi' : 'Yangi chek so\'raldi',
        variant: action === 'REJECT' ? 'warning' : 'success',
      })
      setRejecting(null)
      setReason('')
    } catch (err) {
      toast({ title: 'Amal bajarilmadi', description: errorMessage(err), variant: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="To'lovlarni tekshirish"
        description="Cheki yuborilgan va tekshiruvda bo'lgan buyurtmalar navbati."
        actions={
          <Badge variant="warning" className="text-xs">
            <Clock3 className="h-3 w-3" /> {queue.length} buyurtma navbatda
          </Badge>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-200">Pul kelganligini mustaqil tekshiring</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
            Chek yuborilishi yoki uning ko'rinishi to'lov amalga oshganligini isbotlamaydi. Bank yoki to'lov tizimida
            summaning hisobingizga tushganini tasdiqlamaguningizcha «Tasdiqlash» tugmasini bosmang.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-52 rounded-2xl" />)}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-300">Navbat yuklanmadi: {errorMessage(error)}</p>
          <Button variant="secondary" className="mt-4" onClick={() => { void review.refetch(); void submitted.refetch() }}>
            Qayta urinish
          </Button>
        </Card>
      ) : queue.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-brand-400" />
          <p className="font-display text-sm font-semibold text-white">Navbat bo'sh</p>
          <p className="mt-1 text-sm text-[#8ba397]">Tekshirishni kutayotgan to'lovlar yo'q.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {queue.map((order) => (
            <Card key={order.id} className="panel-hover">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    <Link href={`/orders/${order.id}`} className="hover:text-brand-400">#{order.orderNumber}</Link>
                  </CardTitle>
                  <p className="mt-1 text-xs text-[#8ba397]">
                    {order.user?.name ?? 'Mijoz'} · {order.user?.email ?? '—'}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-baseline justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <span className="text-xs text-[#8ba397]">Buyurtma summesi</span>
                  <span className="font-display text-base font-semibold text-brand-300">{formatMoney(order.total)}</span>
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-[#8ba397]">
                  <span>{formatDate(order.createdAt)}</span>
                  <span>·</span>
                  <span className={order.receipt ? 'inline-flex items-center gap-1 text-brand-300' : 'inline-flex items-center gap-1 text-amber-300'}>
                    <FileText className="h-3 w-3" /> {order.receipt ? 'Chek bor' : 'Chek yo\'q'}
                  </span>
                  <span>·</span>
                  <span>{order.items?.length ?? 0} ta mahsulot</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={verify.isPending || !order.receipt}
                    onClick={() => void handleVerify(order, 'APPROVE')}
                  >
                    {verify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Tasdiqlash
                  </Button>
                  <Button size="sm" variant="destructive" disabled={verify.isPending} onClick={() => { setRejecting(order); setReason('') }}>
                    <XCircle className="h-3.5 w-3.5" /> Rad etish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={verify.isPending || !order.receipt}
                    onClick={() => void handleVerify(order, 'REQUEST_RECEIPT')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Yangi chek
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/orders/${order.id}`}>Batafsil</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <p className="mt-5 flex items-center gap-2 text-xs text-[#7f998b]">
          <AlertTriangle className="h-3.5 w-3.5" /> Barcha tasdiqlash amallari idempotent va tekshirish tarixiga yoziladi.
        </p>
      )}

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buyurtma #{rejecting?.orderNumber} ni rad etish</DialogTitle>
            <DialogDescription>Sabab majburiy va tekshirish tarixida saqlanadi.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="pay-reject-reason">Rad etish sababi *</Label>
            <Textarea id="pay-reject-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || verify.isPending}
              onClick={() => rejecting && void handleVerify(rejecting, 'REJECT', reason.trim())}
            >
              {verify.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
