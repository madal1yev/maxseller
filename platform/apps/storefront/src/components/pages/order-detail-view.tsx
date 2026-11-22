'use client'

import * as React from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  allowedReceiptMimes,
  formatDate,
  formatMoney,
  ORDER_STATUS_MSG,
} from '@maxseller/shared'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Package,
  QrCode,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusBadge } from '@/components/common/order-status-badge'
import { ErrorState } from '@/components/common/error-state'
import { useToast } from '@/components/ui/toast'
import {
  cancelOrder,
  downloadFile,
  getDownloads,
  getMyOrder,
  getPaymentMethods,
  queryKeys,
  uploadReceipt,
} from '@/lib/api-queries'
import { saveBlob } from '@/lib/download'
import { cn, formatBytes } from '@/lib/utils'

const MAX_RECEIPT = 5 * 1024 * 1024

export function OrderDetailView({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  const orderQuery = useQuery({ queryKey: queryKeys.order(id), queryFn: () => getMyOrder(id) })
  const methodsQuery = useQuery({ queryKey: queryKeys.paymentMethods, queryFn: getPaymentMethods })
  const downloadsQuery = useQuery({ queryKey: queryKeys.downloads, queryFn: getDownloads })
  const order = orderQuery.data

  const invalidateAll = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders }),
      queryClient.invalidateQueries({ queryKey: queryKeys.downloads }),
    ])
  }, [id, queryClient])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadReceipt(id, file),
    onSuccess: async () => {
      setReceiptFile(null)
      toast({
        title: ORDER_STATUS_MSG.PAYMENT_REVIEW,
        description: 'Chekingiz muvaffaqiyatli yuborildi.',
        variant: 'success',
      })
      await invalidateAll()
    },
    onError: (error: Error) => {
      toast({ title: 'Chek yuklanmadi', description: error.message, variant: 'error' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: async (updated) => {
      toast({ title: 'Buyurtma bekor qilindi', description: updated.orderNumber, variant: 'info' })
      await invalidateAll()
    },
    onError: (error: Error) => {
      toast({ title: 'Bekor qilib bo\'lmadi', description: error.message, variant: 'error' })
    },
  })

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (!((allowedReceiptMimes as readonly string[]).includes(file.type))) {
      toast({
        title: 'Noto\'g\'ri fayl turi',
        description: 'Faqat JPG, PNG yoki PDF fayl yuklang.',
        variant: 'error',
      })
      event.target.value = ''
      return
    }
    if (file.size > MAX_RECEIPT) {
      toast({
        title: 'Fayl juda katta',
        description: 'Chek hajmi 5 MB dan oshmasligi kerak.',
        variant: 'error',
      })
      event.target.value = ''
      return
    }
    setReceiptFile(file)
  }

  async function handleDownload(downloadId: string, fileName: string) {
    setDownloadingId(downloadId)
    try {
      const blob = await downloadFile(downloadId)
      saveBlob(blob, fileName)
      toast({ title: 'Yuklash boshlandi', description: fileName, variant: 'success' })
    } catch (error) {
      toast({
        title: 'Yuklab bo\'lmadi',
        description: error instanceof Error ? error.message : 'Qaytadan urinib ko\'ring.',
        variant: 'error',
      })
    } finally {
      setDownloadingId(null)
    }
  }

  if (orderQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="mb-6 h-5 w-48" />
        <Skeleton className="mb-6 h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  if (orderQuery.isError || !order) {
    return (
      <div className="container-page py-10">
        <ErrorState
          message={
            orderQuery.error instanceof Error
              ? orderQuery.error.message
              : "Buyurtmani yuklab bo'lmadi."
          }
          onRetry={() => void orderQuery.refetch()}
        />
      </div>
    )
  }

  const canDownload =
    order.paymentStatus === 'PAID' || (order.paymentStatus as string) === 'COMPLETED'
  const orderDownloads = (downloadsQuery.data ?? []).filter((item) => item.orderId === order.id)
  const cancellable = ['PENDING_PAYMENT', 'RECEIPT_SUBMITTED', 'PAYMENT_REVIEW'].includes(order.status)

  const stages = [
    { label: 'Buyurtma yaratildi', done: true },
    {
      label: 'Chek yuborildi',
      done: ['RECEIPT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'COMPLETED'].includes(order.status),
    },
    {
      label: "To'lov tekshirilmoqda",
      done: ['PAYMENT_REVIEW', 'PAID', 'COMPLETED'].includes(order.status),
    },
    { label: "To'lov tasdiqlandi", done: ['PAID', 'COMPLETED'].includes(order.status) },
    { label: 'Faylni yuklash', done: canDownload },
  ]

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/orders" className="hover:text-emerald">Mening xaridlarim</Link>
        <span>/</span>
        <span className="text-foreground">#{order.orderNumber}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Buyurtma #{order.orderNumber}</h1>
          <p className="mt-2 text-xs text-muted">Yaratilgan: {formatDate(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mb-8 rounded-2xl border border-emerald/20 bg-emerald/[0.06] p-5">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed">
          {order.status === 'REJECTED' || order.status === 'CANCELLED' ? (
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          ) : (
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
          )}
          <span>{ORDER_STATUS_MSG[order.status] ?? order.status}</span>
        </p>
        {order.adminNote ? (
          <p className="mt-3 border-t border-emerald/20 pt-3 text-xs text-muted">
            Ma'mur izohi: {order.adminNote}
          </p>
        ) : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Items */}
          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <Package className="h-5 w-5 text-emerald" /> Buyurtma tarkibi
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-bg/40 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.04]">
                      {item.productImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.productImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-emerald/40" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="block truncate text-sm font-bold transition hover:text-emerald"
                      >
                        {item.productTitle}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        {item.quantity} × {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-emerald">
                    {formatMoney(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between text-muted"><span>Oraliq jami</span><span>{formatMoney(order.subtotal)}</span></div>
              <div className="flex justify-between text-muted"><span>Chegirma</span><span>-{formatMoney(order.discount)}</span></div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <span>Jami</span><span className="font-display text-emerald">{formatMoney(order.total)}</span>
              </div>
            </div>
            {order.customerNote ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-bg/40 p-3">
                <p className="text-xs font-bold text-muted">Sizning izohingiz</p>
                <p className="mt-1 text-sm">{order.customerNote}</p>
              </div>
            ) : null}
          </section>

          {/* Payment instructions */}
          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <CreditCard className="h-5 w-5 text-emerald" /> To'lov ko'rsatmalari
            </h2>
            {methodsQuery.isLoading ? (
              <p className="text-sm text-muted">Yuklanmoqda...</p>
            ) : methodsQuery.isError ? (
              <ErrorState onRetry={() => void methodsQuery.refetch()} />
            ) : !methodsQuery.data || methodsQuery.data.length === 0 ? (
              <p className="text-sm text-muted">
                To'lov usullari hali sozlanmagan. Ma'muriyat bilan bog'laning.
              </p>
            ) : (
              <div className="space-y-4">
                {methodsQuery.data.map((method) => (
                  <div key={method.id} className="rounded-xl border border-white/10 bg-bg/40 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-emerald">{method.name}</p>
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted">
                          {method.instructions}
                        </p>
                      </div>
                      {method.qrUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={method.qrUrl} alt="QR kod" className="h-20 w-20 rounded-lg bg-white p-1" />
                      ) : null}
                    </div>
                    {method.recipientDetails ? (
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/[0.04] p-3 font-sans text-xs leading-relaxed text-foreground/85">
                        {method.recipientDetails}
                      </pre>
                    ) : null}
                    {method.linkUrl ? (
                      <a
                        href={method.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald hover:underline"
                      >
                        <QrCode className="h-3.5 w-3.5" /> To'lov sahifasiga o'tish
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Downloads */}
          {canDownload ? (
            <section className="panel p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
                <Download className="h-5 w-5 text-emerald" /> Fayllarni yuklab olish
              </h2>
              {downloadsQuery.isLoading ? (
                <p className="text-sm text-muted">Yuklamalar tekshirilmoqda...</p>
              ) : downloadsQuery.isError ? (
                <ErrorState onRetry={() => void downloadsQuery.refetch()} />
              ) : orderDownloads.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted">
                  To'lov tasdiqlandi, ammo yuklamalar hali tayyor emas. Biroz kutib, sahifani yangilang.
                </p>
              ) : (
                <div className="space-y-2">
                  {orderDownloads.map((download) => (
                    <div
                      key={download.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald/20 bg-emerald/[0.04] p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <FileCheck2 className="h-5 w-5 shrink-0 text-emerald" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{download.fileName}</p>
                          <p className="text-xs text-muted">{formatBytes(download.size)}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={downloadingId === download.id}
                        onClick={() => void handleDownload(download.id, download.fileName)}
                      >
                        {downloadingId === download.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Download className="h-4 w-4" /> Yuklab olish</>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <section className="panel p-6">
            <h2 className="mb-5 text-lg font-bold">Buyurtma holati</h2>
            <ol className="space-y-4">
              {stages.map((stage, index) => (
                <li key={stage.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                        stage.done
                          ? 'border-emerald bg-emerald text-black'
                          : 'border-white/20 bg-white/[0.04] text-muted',
                      )}
                    >
                      {stage.done ? <Check className="h-4 w-4" /> : index + 1}
                    </span>
                    {index < stages.length - 1 ? (
                      <span className={cn('mt-1 h-7 w-px', stage.done ? 'bg-emerald/50' : 'bg-white/10')} />
                    ) : null}
                  </div>
                  <p className={cn('pt-1 text-sm', stage.done ? 'font-semibold text-foreground' : 'text-muted')}>
                    {stage.label}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-bold">
              <UploadCloud className="h-5 w-5 text-emerald" /> Chek yuklash
            </h2>
            {order.receipt ? (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald/20 bg-emerald/[0.05] p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{order.receipt.fileName}</p>
                  <p className="text-[11px] text-muted">
                    Yuklangan: {formatDate(order.receipt.createdAt)} · {formatBytes(order.receipt.size)}
                  </p>
                </div>
              </div>
            ) : null}

            {order.status === 'PENDING_PAYMENT' || order.status === 'RECEIPT_SUBMITTED' || order.status === 'PAYMENT_REVIEW' ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (receiptFile) uploadMutation.mutate(receiptFile)
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="receipt" className="mb-2 block">To'lov cheki</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer p-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-emerald file:px-3 file:py-2 file:text-black"
                  />
                  <p className="mt-2 text-[11px] text-muted">
                    JPG, PNG yoki PDF · maksimal 5 MB
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={!receiptFile || uploadMutation.isPending}>
                  {uploadMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    <>Chekni yuborish</>
                  )}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted">
                  Chek yuklash to'lovni avtomatik tasdiqlamaydi. Admin tekshirib tasdiqlagach,
                  fayllar yuklamalar bo'limida paydo bo'ladi.
                </p>
              </form>
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                Bu buyurtma bo'yicha chek yuklash yakunlangan.
              </p>
            )}
          </section>

          {cancellable ? (
            <Button
              variant="outline"
              className="w-full border-red-400/40 text-red-400 hover:bg-red-400/10"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate(id)}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><XCircle className="h-4 w-4" /> Buyurtmani bekor qilish</>
              )}
            </Button>
          ) : null}

          <Button variant="ghost" className="w-full" asChild>
            <Link href="/orders"><ArrowLeft className="h-4 w-4" /> Xaridlarimga qaytish</Link>
          </Button>
        </aside>
      </div>
    </div>
  )
}
