'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { faqSchema } from '@maxseller/shared'
import type { FAQ } from '@maxseller/shared'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import { useAdminFaq, useCreateFaq, useDeleteFaq, useUpdateFaq } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

type FaqFormValues = { question: string; answer: string; sortOrder: number }
const emptyValues: FaqFormValues = { question: '', answer: '', sortOrder: 0 }

export default function FaqPage() {
  const { toast } = useToast()
  const faq = useAdminFaq()
  const createFaq = useCreateFaq()
  const updateFaq = useUpdateFaq()
  const deleteFaq = useDeleteFaq()
  const [editing, setEditing] = useState<FAQ | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<FAQ | null>(null)
  const resolver = zodResolver(faqSchema) as unknown as Resolver<FaqFormValues>
  const form = useForm<FaqFormValues>({ resolver, defaultValues: emptyValues })

  useEffect(() => {
    if (!dialogOpen) return
    form.reset(editing
      ? { question: editing.question, answer: editing.answer, sortOrder: editing.sortOrder }
      : emptyValues)
  }, [dialogOpen, editing, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateFaq.mutateAsync({ id: editing.id, body: values })
        toast({ title: 'FAQ yangilandi', variant: 'success' })
      } else {
        await createFaq.mutateAsync(values)
        toast({ title: 'FAQ yaratildi', variant: 'success' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteFaq.mutateAsync(toDelete.id)
      toast({ title: 'FAQ o\'chirildi', variant: 'success' })
      setToDelete(null)
    } catch (error) {
      toast({ title: 'O\'chirib bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const saving = createFaq.isPending || updateFaq.isPending

  const columns: DataTableColumn<FAQ>[] = [
    {
      key: 'question',
      header: 'Savol',
      sortValue: (item) => item.question,
      cell: (item) => <p className="max-w-md truncate text-sm font-semibold text-white">{item.question}</p>,
    },
    {
      key: 'answer',
      header: 'Javob',
      cell: (item) => <p className="max-w-lg truncate text-xs text-[#8ba397]">{item.answer}</p>,
    },
    {
      key: 'sortOrder',
      header: 'Tartib',
      sortValue: (item) => item.sortOrder,
      cell: (item) => <span className="text-sm text-white">{item.sortOrder}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="FAQ"
        description="Ko'p so'raladigan savollar va javoblar."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true) }}><Plus className="h-4 w-4" /> Yangi savol</Button>}
      />

      <DataTable
        columns={columns}
        data={faq.data ?? []}
        rowKey={(item) => item.id}
        loading={faq.isLoading}
        error={faq.isError ? faq.error : undefined}
        onRetry={() => void faq.refetch()}
        emptyTitle="FAQ yo'q"
        emptyDescription="Birinchi savol-javobni qo'shing."
        actions={(item) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Tahrirlash" onClick={() => { setEditing(item); setDialogOpen(true) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="O'chirish" onClick={() => setToDelete(item)}>
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Savolni tahrirlash' : 'Yangi savol'}</DialogTitle>
            <DialogDescription>Savol va javobni o'zbek tilida yozing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="faq-question">Savol *</Label>
              <Input id="faq-question" {...form.register('question')} />
              {form.formState.errors.question && <p className="mt-1 text-xs text-red-300">{form.formState.errors.question.message}</p>}
            </div>
            <div>
              <Label htmlFor="faq-answer">Javob *</Label>
              <Textarea id="faq-answer" rows={7} {...form.register('answer')} />
              {form.formState.errors.answer && <p className="mt-1 text-xs text-red-300">{form.formState.errors.answer.message}</p>}
            </div>
            <div>
              <Label htmlFor="faq-order">Tartib raqami</Label>
              <Input id="faq-order" type="number" min={0} {...form.register('sortOrder', { valueAsNumber: true })} />
            </div>
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
            <DialogTitle>Savolni o'chirish?</DialogTitle>
            <DialogDescription>«{toDelete?.question}» do'kon saytida ko'rinmay qoladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteFaq.isPending} onClick={() => void confirmDelete()}>
              {deleteFaq.isPending && <Loader2 className="h-4 w-4 animate-spin" />} O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
