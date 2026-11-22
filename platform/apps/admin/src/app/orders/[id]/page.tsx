'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react'
import type { OrderStatus, VerificationAction } from '@maxseller/shared'
import { formatDate, formatMoney, orderStatusLabels } from '@maxseller/shared'
import { PageHeader } from '@/components/page-header'
import { ReceiptPreview } from '@/components/receipt-preview'
import { OrderStatusBadge, PaymentStatusBadge, VerificationBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import {
  useAdminOrder,
  useAdminReceipts,
  useUpdateOrderNote,
  useUpdateOrderStatus,
  useVerifyOrder,
} from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

const allStatuses = Object.keys(orderStatusLabels) as OrderStatus[]

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const orderId = params.id
  const { toast } = useToast()

  const order = useAdminOrder(orderId)
  const receipts = useAdminReceipts(orderId)
  const updateStatus = useUpdateOrderStatus(orderId)
  const verify = useVerifyOrder(orderId)
  const updateNote = useUpdateOrderNote(orderId)

  const [note, setNote] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    setNote(order.data?.adminNote ?? '')
  }, [order.data?.adminNote])

  const data = order.data
  const receiptId = receipts.data?.find((item) => item.id === data?.receipt?.id)?.id ?? data?.receipt?.id ?? receipts.data?.[0]?.id
  const history = data?.verifications?.length
    ? data.verifications
    : data?.verification
      ? [data.verification]
      : []
  const terminal = Boolean(data && ['PAID', 'COMPLETED', 'REJECTED', 'CANCELLED', 'REFUNDED'].includes(data.status))
  const busy = verify.isPending || updateStatus.isPending || updateNote.isPending

  async function handleVerify(action: VerificationAction, verifyReason?: string) {
    try {
      await verify.mutateAsync({ action, reason: verifyReason ?? '' })
      toast({
        title: action === 'APPROVE' ? 'To\'lov tasdiqlandi' : action === 'REJECT' ? 'To\'lov rad etildi' : 'Yangi chek so\'raldi',
        variant: action === 'REJECT' ? 'warning' : 'success',
      })
      setRejectOpen(false)
      setReason('')
    } catch (error) {
      toast({ title: 'Amal bajarilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function handleStatusChange(status: OrderStatus) {
    try {
      await updateStatus.mutateAsync(status)
      toast({ title: 'Buyurtma holati yangilandi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function handleSaveNote() {
    try {
      await updateNote.mutateAsync(note)
      toast({ title: 'Admin izohi saqlandi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Izoh saqlanmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  if (order.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  if (order.isError || !data) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-red-300">Buyurtma yuklanmadi yoki topilmadi.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/orders"><ArrowLeft className="h-4 w-4" /> Buyurtmalarga qaytish</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Buyurtma #${data.orderNumber}`}
        description={`Yaratilgan: ${formatDate(data.createdAt)} · Oxirgi yangilanish: ${formatDate(data.updatedAt)}`}
        actions={
          <>
            <OrderStatusBadge status={data.status} />
            <PaymentStatusBadge status={data.paymentStatus} />
            <Button asChild variant="secondary" size="sm">
              <Link href="/orders"><ArrowLeft className="h-4 w-4" /> Orqaga</Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-200">To\'lovni mustaqil tasdiqlang</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
            Chek yuborilishi to\'lovni anglatmaydi. «Tasdiqlash» tugmasini bosishdan oldin pulning haqiqatan sizning
            hisobingizga tushganligini bank yoki to\'lov tizimida mustaqil tekshiring. Tasdiqlangandan keyin mijoz
            fayllarga kirish huquqiga ega bo\'ladi.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buyurtmadagi mahsulotlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-[#7f998b]">
                      <th className="pb-3 font-semibold">Mahsulot</th>
                      <th className="pb-3 text-center font-semibold">Soni</th>
                      <th className="pb-3 text-right font-semibold">Narx</th>
                      <th className="pb-3 text-right font-semibold">Jami</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {(data.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            {item.productImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.productImage} alt="" className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
                            ) : (
                              <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.05] text-xs text-[#5f796b]">—</span>
                            )}
                            <div className="min-w-0">
                              <Link href={`/products/${item.productId}`} className="block truncate font-medium text-white hover:text-brand-400">
                                {item.productTitle}
                              </Link>
                              <span className="text-[10px] text-[#7f998b]">{item.productSlug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center text-[#a8c0b2]">{item.quantity}</td>
                        <td className="py-3 text-right text-[#a8c0b2]">{formatMoney(item.unitPrice)}</td>
                        <td className="py-3 text-right font-semibold text-white">{formatMoney(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 space-y-2 border-t border-white/[0.07] pt-4 text-sm">
                <div className="flex justify-between text-[#a8c0b2]">
                  <span>Oraliq summa</span><span>{formatMoney(data.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#a8c0b2]">
                  <span>Chegirma</span><span>- {formatMoney(data.discount ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.07] pt-3 font-display text-base font-semibold text-brand-300">
                  <span>Jami</span><span>{formatMoney(data.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-brand-400" /> To\'lov cheki
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receiptId ? (
                <>
                  <ReceiptPreview orderId={orderId} receiptId={receiptId} />
                  <p className="mt-2 text-[11px] text-[#7f998b]">
                    Fayl: {data.receipt?.fileName ?? receipts.data?.find((item) => item.id === receiptId)?.fileName ?? receiptId}
                  </p>
                </>
              ) : (
                <div className="grid h-40 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                  <div>
                    <FileText className="mx-auto mb-2 h-6 w-6 text-[#5f796b]" />
                    <p className="text-sm text-[#8ba397]">Mijoz hali chek yubormagan</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tekshirish tarixi</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length ? (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <VerificationBadge action={entry.action} />
                      <span className="text-xs text-[#a8c0b2]">{entry.adminName ?? entry.adminId.slice(0, 8)}</span>
                      {entry.reason && <span className="text-xs text-[#8ba397]">· {entry.reason}</span>}
                      <span className="ml-auto text-[11px] text-[#5f796b]">{formatDate(entry.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-5 text-center text-sm text-[#8ba397]">Hozircha tekshirishlar yo'q</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-4 w-4 text-brand-400" /> Mijoz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Ism</span><span className="text-right font-medium text-white">{data.user?.name ?? '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Email</span><span className="break-all text-right text-white">{data.user?.email ?? '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Telefon</span><span className="text-white">{data.user?.phone ?? '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Ro'yxatdan o'tgan</span><span className="text-xs text-white">{data.user?.createdAt ? formatDate(data.user.createdAt) : '—'}</span></div>
              {data.userId && (
                <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                  <Link href={`/customers/${data.userId}`}>Mijoz profilini ochish</Link>
                </Button>
              )}
              {data.customerNote && (
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#7f998b]">Mijoz izohi</p>
                  <p className="text-xs leading-relaxed text-[#c6d9cd]">{data.customerNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand-400" /> To\'lov ma\'lumotlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Usul</span><span className="text-right text-white">{data.payment?.methodName ?? '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Summa</span><span className="font-semibold text-brand-300">{formatMoney(data.payment?.amount ?? data.total)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Tranzaksiya ID</span><span className="break-all text-right text-xs text-white">{data.payment?.transactionId ?? '—'}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[#8ba397]">Holat</span><PaymentStatusBadge status={data.payment?.status ?? data.paymentStatus} /></div>
              <div className="mt-3">
                <Label htmlFor="order-status">Buyurtma holati</Label>
                <Select
                  id="order-status"
                  value={data.status}
                  disabled={updateStatus.isPending}
                  onChange={(event) => void handleStatusChange(event.target.value as OrderStatus)}
                >
                  {allStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{orderStatusLabels[status]}</SelectItem>
                  ))}
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Admin izohi</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ichki izoh (mijozga ko'rinmaydi)"
                rows={4}
              />
              <Button className="mt-3 w-full" variant="secondary" disabled={busy || note === (data.adminNote ?? '')} onClick={() => void handleSaveNote()}>
                <Save className="h-4 w-4" /> Izohni saqlash
              </Button>
            </CardContent>
          </Card>

          <Card className="border-brand-500/20 shadow-glow">
            <CardHeader>
              <CardTitle>To\'lovni tasdiqlash</CardTitle>
              <p className="text-xs leading-relaxed text-[#8ba397]">
                Har bir amal tekshirish tarixiga yozib qolinadi. Tasdiqlashdan oldin haqiqiy pul o'tishini mustaqil tekshiring.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                disabled={busy || terminal || !receiptId}
                onClick={() => void handleVerify('APPROVE')}
              >
                {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Tasdiqlash
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                disabled={busy || terminal}
                onClick={() => setRejectOpen(true)}
              >
                <XCircle className="h-4 w-4" /> Rad etish
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={busy || terminal || !receiptId}
                onClick={() => void handleVerify('REQUEST_RECEIPT')}
              >
                <RotateCcw className="h-4 w-4" /> Yangi chek so'rash
              </Button>
              {terminal && (
                <p className="pt-1 text-center text-[11px] text-[#7f998b]">
                  Buyurtma yakuniy holatda, tasdiqlash amallari mavjud emas.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To\'lovni rad etish</DialogTitle>
            <DialogDescription>
              Rad etish sababi majburiy va tekshirish tarixida saqlanadi. Mijozga sababni yetkazish uchun aniq yozing.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reject-reason">Rad etish sababi *</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Masalan: chekdagi summa buyurtma summasiga mos kelmadi"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={!reason.trim() || verify.isPending} onClick={() => void handleVerify('REJECT', reason.trim())}>
              {verify.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6 flex items-center gap-2 text-xs text-[#5f796b]">
        <AlertTriangle className="h-3.5 w-3.5" /> Chek yuklash hech qachon to'lovni tasdiqlamaydi.
        <Badge variant="outline">ID: {data.id}</Badge>
      </div>
    </div>
  )
}
