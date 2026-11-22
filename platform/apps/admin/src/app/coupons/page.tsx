'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { couponSchema } from '@maxseller/shared'
import type { Coupon } from '@maxseller/shared'
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/providers'
import { useAdminCoupons, useCreateCoupon, useDeleteCoupon, useUpdateCoupon } from '@/lib/api-queries'
import { errorMessage, fromLocalDateTimeInput, toLocalDateTimeInput } from '@/lib/utils'
import { formatDate, formatMoney } from '@maxseller/shared'

interface CouponFormValues {
  code: string
  type: 'PERCENT' | 'FIXED'
  value: number
  minOrder: number
  isActive: boolean
  expiresAt: string | null
  usageLimit: number | null
}

const emptyValues: CouponFormValues = {
  code: '', type: 'PERCENT', value: 0, minOrder: 0, isActive: true, expiresAt: null, usageLimit: null,
}

export default function CouponsPage() {
  const { toast } = useToast()
  const coupons = useAdminCoupons()
  const createCoupon = useCreateCoupon()
  const updateCoupon = useUpdateCoupon()
  const deleteCoupon = useDeleteCoupon()

  const [editing, setEditing] = useState<Coupon | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Coupon | null>(null)
  const resolver = zodResolver(couponSchema) as unknown as Resolver<CouponFormValues>
  const form = useForm<CouponFormValues>({ resolver, defaultValues: emptyValues })

  useEffect(() => {
    if (!dialogOpen) return
    form.reset(editing ? {
      code: editing.code,
      type: editing.type,
      value: editing.value,
      minOrder: editing.minOrder,
      isActive: editing.isActive,
      expiresAt: toLocalDateTimeInput(editing.expiresAt) || null,
      usageLimit: editing.usageLimit,
    } : emptyValues)
  }, [dialogOpen, editing, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      value: Number(values.value),
      minOrder: Number(values.minOrder),
      expiresAt: fromLocalDateTimeInput(values.expiresAt ?? ''),
      usageLimit: values.usageLimit === null || values.usageLimit === undefined ? null : Number(values.usageLimit),
    }
    try {
      if (editing) {
        await updateCoupon.mutateAsync({ id: editing.id, body: payload })
        toast({ title: 'Kupon yangilandi', variant: 'success' })
      } else {
        await createCoupon.mutateAsync(payload)
        toast({ title: 'Kupon yaratildi', variant: 'success' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  async function toggleActive(coupon: Coupon) {
    try {
      await updateCoupon.mutateAsync({ id: coupon.id, body: { isActive: !coupon.isActive } })
      toast({ title: coupon.isActive ? 'Kupon o\'chirildi' : 'Kupon faollashtirildi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteCoupon.mutateAsync(toDelete.id)
      toast({ title: 'Kupon o\'chirildi', variant: 'success' })
      setToDelete(null)
    } catch (error) {
      toast({ title: 'O\'chirib bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const saving = createCoupon.isPending || updateCoupon.isPending
  const isActive = form.watch('isActive')
  const couponType = form.watch('type')

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Kod',
      sortValue: (coupon) => coupon.code,
      cell: (coupon) => <span className="font-mono text-sm font-semibold text-brand-300">{coupon.code}</span>,
    },
    {
      key: 'value',
      header: 'Chegirma',
      cell: (coupon) => (
        <span className="text-sm text-white">
          {coupon.type === 'PERCENT' ? `${coupon.value}%` : formatMoney(coupon.value)}
        </span>
      ),
    },
    {
      key: 'minOrder',
      header: 'Min. summa',
      cell: (coupon) => <span className="text-xs text-[#a8c0b2]">{formatMoney(coupon.minOrder)}</span>,
    },
    {
      key: 'usage',
      header: 'Foydalanish',
      cell: (coupon) => (
        <span className="text-xs text-[#a8c0b2]">
          {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
        </span>
      ),
    },
    {
      key: 'expires',
      header: 'Muddati',
      cell: (coupon) => <span className="text-xs text-[#8ba397]">{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Cheksiz'}</span>,
    },
    {
      key: 'active',
      header: 'Holat',
      cell: (coupon) => <Badge variant={coupon.isActive ? 'success' : 'secondary'}>{coupon.isActive ? 'Faol' : 'Nofaol'}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Kuponlar"
        description="Chegirma kodlarini yarating va ularning foydalanilishini kuzating."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4" /> Yangi kupon</Button>}
      />

      <DataTable
        columns={columns}
        data={coupons.data ?? []}
        rowKey={(coupon) => coupon.id}
        loading={coupons.isLoading}
        error={coupons.isError ? coupons.error : undefined}
        onRetry={() => void coupons.refetch()}
        emptyTitle="Kupon yo'q"
        emptyDescription="Birinchi chegirma kodini yarating."
        actions={(coupon) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Tahrirlash" onClick={() => { setEditing(coupon); setDialogOpen(true) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Holatni o'zgartirish" disabled={updateCoupon.isPending} onClick={() => void toggleActive(coupon)}>
              {updateCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className={coupon.isActive ? 'h-4 w-4 text-brand-400' : 'h-4 w-4 text-[#7f998b]'} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="O'chirish" onClick={() => setToDelete(coupon)}>
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Kuponni tahrirlash' : 'Yangi kupon'}</DialogTitle>
            <DialogDescription>Chegirma turi, miqdori va amal qilish muddatini belgilang.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="coupon-code">Kod *</Label>
                <Input id="coupon-code" placeholder="SALE10" {...form.register('code')} />
                {form.formState.errors.code && <p className="mt-1 text-xs text-red-300">{form.formState.errors.code.message}</p>}
              </div>
              <div>
                <Label htmlFor="coupon-type">Turi *</Label>
                <Select id="coupon-type" {...form.register('type')}>
                  <SelectItem value="PERCENT">Foiz (%)</SelectItem>
                  <SelectItem value="FIXED">Qat'iy summa</SelectItem>
                </Select>
              </div>
              <div>
                <Label htmlFor="coupon-value">Qiymat *</Label>
                <Input id="coupon-value" type="number" min={0} {...form.register('value', { valueAsNumber: true })} />
                {form.formState.errors.value && <p className="mt-1 text-xs text-red-300">{form.formState.errors.value.message}</p>}
                <p className="mt-1 text-[11px] text-[#7f998b]">{couponType === 'PERCENT' ? 'Foizda' : 'So\'mda'}</p>
              </div>
              <div>
                <Label htmlFor="coupon-min">Minimal buyurtma</Label>
                <Input id="coupon-min" type="number" min={0} {...form.register('minOrder', { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="coupon-limit">Foydalanish limiti</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={1}
                  {...form.register('usageLimit', {
                    setValueAs: (value) => (value === '' || value === undefined ? null : Number(value)),
                  })}
                />
              </div>
              <div>
                <Label htmlFor="coupon-expires">Amal qilish muddati</Label>
                <Input
                  id="coupon-expires"
                  type="datetime-local"
                  {...form.register('expiresAt', {
                    setValueAs: (value) => (value ? value : null),
                  })}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <Switch checked={Boolean(isActive)} onCheckedChange={(checked) => form.setValue('isActive', checked)} label="Faol" />
              <span className="text-sm text-white">Kupon faol</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kuponni o'chirish?</DialogTitle>
            <DialogDescription>«{toDelete?.code}» kodi butunlay o'chiriladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteCoupon.isPending} onClick={() => void confirmDelete()}>
              {deleteCoupon.isPending && <Loader2 className="h-4 w-4 animate-spin" />} O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="mt-4 text-[11px] text-[#5f796b]">
        Kod faqat katta harf, raqam, chiziqcha va pastki chiziqdan iborat bo'lishi kerak.
      </p>
    </div>
  )
}
