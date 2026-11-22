'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { createPaymentMethodSchema } from '@maxseller/shared'
import type { PaymentMethod } from '@maxseller/shared'
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import { useAdminPaymentMethods, useCreatePaymentMethod, useDeletePaymentMethod, useUpdatePaymentMethod } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

interface PaymentMethodFormValues {
  name: string
  code: string
  instructions: string
  recipientDetails: string
  qrUrl: string
  linkUrl: string
  isActive: boolean
  sortOrder: number
}

const emptyValues: PaymentMethodFormValues = {
  name: '', code: '', instructions: '', recipientDetails: '', qrUrl: '', linkUrl: '', isActive: true, sortOrder: 0,
}

export default function PaymentMethodsPage() {
  const { toast } = useToast()
  const methods = useAdminPaymentMethods()
  const createMethod = useCreatePaymentMethod()
  const updateMethod = useUpdatePaymentMethod()
  const deleteMethod = useDeletePaymentMethod()

  const [editing, setEditing] = useState<PaymentMethod | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<PaymentMethod | null>(null)
  const resolver = zodResolver(createPaymentMethodSchema) as unknown as Resolver<PaymentMethodFormValues>
  const form = useForm<PaymentMethodFormValues>({ resolver, defaultValues: emptyValues })

  useEffect(() => {
    if (!dialogOpen) return
    form.reset(editing ? {
      name: editing.name,
      code: editing.code,
      instructions: editing.instructions,
      recipientDetails: editing.recipientDetails,
      qrUrl: editing.qrUrl ?? '',
      linkUrl: editing.linkUrl ?? '',
      isActive: editing.isActive,
      sortOrder: editing.sortOrder,
    } : emptyValues)
  }, [dialogOpen, editing, form])

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = { ...values, qrUrl: values.qrUrl || null, linkUrl: values.linkUrl || null }
    try {
      if (editing) {
        await updateMethod.mutateAsync({ id: editing.id, body: payload })
        toast({ title: 'To\'lov usuli yangilandi', variant: 'success' })
      } else {
        await createMethod.mutateAsync(payload)
        toast({ title: 'To\'lov usuli yaratildi', variant: 'success' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  async function toggleActive(method: PaymentMethod) {
    try {
      await updateMethod.mutateAsync({ id: method.id, body: { isActive: !method.isActive } })
      toast({ title: method.isActive ? 'Usul o\'chirildi' : 'Usul faollashtirildi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteMethod.mutateAsync(toDelete.id)
      toast({ title: 'To\'lov usuli o\'chirildi', variant: 'success' })
      setToDelete(null)
    } catch (error) {
      toast({ title: 'O\'chirib bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const saving = createMethod.isPending || updateMethod.isPending
  const isActive = form.watch('isActive')

  const columns: DataTableColumn<PaymentMethod>[] = [
    {
      key: 'name',
      header: 'Nomi',
      sortValue: (method) => method.name,
      cell: (method) => (
        <div>
          <p className="text-sm font-semibold text-white">{method.name}</p>
          <p className="font-mono text-[11px] text-[#7f998b]">{method.code}</p>
        </div>
      ),
    },
    {
      key: 'instructions',
      header: 'Ko\'rsatmalar',
      cell: (method) => <p className="max-w-xs truncate text-xs text-[#8ba397]">{method.instructions}</p>,
    },
    {
      key: 'media',
      header: 'QR / Havola',
      cell: (method) => (
        <div className="flex gap-1.5">
          {method.qrUrl && <Badge variant="secondary">QR bor</Badge>}
          {method.linkUrl && <Badge variant="secondary">Havola bor</Badge>}
          {!method.qrUrl && !method.linkUrl && <span className="text-xs text-[#5f796b]">—</span>}
        </div>
      ),
    },
    {
      key: 'sortOrder',
      header: 'Tartib',
      sortValue: (method) => method.sortOrder,
      cell: (method) => <span className="text-sm text-white">{method.sortOrder}</span>,
    },
    {
      key: 'active',
      header: 'Holat',
      cell: (method) => <Badge variant={method.isActive ? 'success' : 'secondary'}>{method.isActive ? 'Faol' : 'Nofaol'}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="To'lov usullari"
        description="Mijozlarga ko'rsatiladigan to'lov usullari va ularning ko'rsatmalari."
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> Yangi usul
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={methods.data ?? []}
        rowKey={(method) => method.id}
        loading={methods.isLoading}
        error={methods.isError ? methods.error : undefined}
        onRetry={() => void methods.refetch()}
        emptyTitle="To'lov usuli yo'q"
        emptyDescription="Mijozlarga ko'rsatish uchun yangi usul qo'shing."
        actions={(method) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Tahrirlash" onClick={() => { setEditing(method); setDialogOpen(true) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Holatni o'zgartirish" disabled={updateMethod.isPending} onClick={() => void toggleActive(method)}>
              {updateMethod.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className={method.isActive ? 'h-4 w-4 text-brand-400' : 'h-4 w-4 text-[#7f998b]'} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="O'chirish" onClick={() => setToDelete(method)}>
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'To\'lov usulini tahrirlash' : 'Yangi to\'lov usuli'}</DialogTitle>
            <DialogDescription>Nomi, kod va mijoz ko'radigan ko'rsatmalarni to'ldiring.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pm-name">Nomi *</Label>
                <Input id="pm-name" {...form.register('name')} />
                {form.formState.errors.name && <p className="mt-1 text-xs text-red-300">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="pm-code">Kod *</Label>
                <Input id="pm-code" {...form.register('code')} placeholder="card, payme" />
                {form.formState.errors.code && <p className="mt-1 text-xs text-red-300">{form.formState.errors.code.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="pm-instructions">Ko'rsatmalar *</Label>
              <Textarea id="pm-instructions" rows={4} {...form.register('instructions')} />
              {form.formState.errors.instructions && <p className="mt-1 text-xs text-red-300">{form.formState.errors.instructions.message}</p>}
            </div>
            <div>
              <Label htmlFor="pm-recipient">Qabul qiluvchi ma'lumotlari *</Label>
              <Textarea id="pm-recipient" rows={3} {...form.register('recipientDetails')} />
              {form.formState.errors.recipientDetails && <p className="mt-1 text-xs text-red-300">{form.formState.errors.recipientDetails.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pm-qr">QR rasm URL</Label>
                <Input id="pm-qr" {...form.register('qrUrl')} />
              </div>
              <div>
                <Label htmlFor="pm-link">To'lov havolasi</Label>
                <Input id="pm-link" {...form.register('linkUrl')} />
              </div>
            </div>
            <div>
              <Label htmlFor="pm-order">Tartib raqami</Label>
              <Input id="pm-order" type="number" min={0} {...form.register('sortOrder', { valueAsNumber: true })} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <Switch checked={Boolean(isActive)} onCheckedChange={(checked) => form.setValue('isActive', checked)} label="Faol" />
              <span className="text-sm text-white">Usul faol</span>
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
            <DialogTitle>To'lov usulini o'chirish?</DialogTitle>
            <DialogDescription>«{toDelete?.name}» usuli do'konda ko'rsatilmay qoladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteMethod.isPending} onClick={() => void confirmDelete()}>
              {deleteMethod.isPending && <Loader2 className="h-4 w-4 animate-spin" />} O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
