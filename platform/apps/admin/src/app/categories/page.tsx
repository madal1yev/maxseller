'use client'

import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import type { z } from 'zod'
import { createCategorySchema, slugify } from '@maxseller/shared'
import type { Category } from '@maxseller/shared'
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/providers'
import { useAdminCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

type CategoryFormValues = z.infer<typeof createCategorySchema> & {
  nameUz: string
  description: string
  icon: string
  imageUrl: string
  sortOrder: number
  isActive: boolean
}

const emptyValues: CategoryFormValues = {
  name: '',
  nameUz: '',
  slug: '',
  description: '',
  icon: '',
  imageUrl: '',
  sortOrder: 0,
  isActive: true,
}

export default function CategoriesPage() {
  const { toast } = useToast()
  const categories = useAdminCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editing, setEditing] = useState<Category | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const resolver = zodResolver(createCategorySchema) as unknown as Resolver<CategoryFormValues>
  const form = useForm<CategoryFormValues>({ resolver, defaultValues: emptyValues })

  useEffect(() => {
    if (dialogOpen) {
      form.reset(
        editing
          ? {
              name: editing.name,
              nameUz: editing.nameUz ?? '',
              slug: editing.slug,
              description: editing.description ?? '',
              icon: editing.icon ?? '',
              imageUrl: editing.imageUrl ?? '',
              sortOrder: editing.sortOrder,
              isActive: editing.isActive,
            }
          : emptyValues,
      )
    }
  }, [dialogOpen, editing, form])

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setDialogOpen(true)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      slug: values.slug || slugify(values.name),
      icon: values.icon || null,
      imageUrl: values.imageUrl || null,
    }
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, body: payload })
        toast({ title: 'Kategoriya yangilandi', variant: 'success' })
      } else {
        await createCategory.mutateAsync(payload)
        toast({ title: 'Kategoriya yaratildi', variant: 'success' })
      }
      setDialogOpen(false)
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  async function toggleActive(category: Category) {
    try {
      await updateCategory.mutateAsync({ id: category.id, body: { isActive: !category.isActive } })
      toast({ title: category.isActive ? 'Kategoriya o\'chirildi' : 'Kategoriya faollashtirildi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteCategory.mutateAsync(toDelete.id)
      toast({ title: 'Kategoriya o\'chirildi', variant: 'success' })
      setToDelete(null)
    } catch (error) {
      toast({ title: 'O\'chirib bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const saving = createCategory.isPending || updateCategory.isPending
  const isActive = form.watch('isActive')

  const columns: DataTableColumn<Category>[] = [
    {
      key: 'name',
      header: 'Nomi',
      sortValue: (category) => category.nameUz,
      cell: (category) => (
        <div className="flex items-center gap-3">
          {category.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={category.imageUrl} alt="" className="h-9 w-9 rounded-lg border border-white/10 object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 font-display text-xs text-brand-400">
              {category.nameUz.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{category.nameUz || category.name}</p>
            <p className="text-[11px] text-[#7f998b]">{category.name}</p>
          </div>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', cell: (category) => <span className="font-mono text-xs text-[#8ba397]">{category.slug}</span> },
    {
      key: 'sortOrder',
      header: 'Tartib',
      sortValue: (category) => category.sortOrder,
      cell: (category) => <span className="text-sm text-white">{category.sortOrder}</span>,
    },
    {
      key: 'products',
      header: 'Mahsulotlar',
      cell: (category) => <span className="text-xs text-[#a8c0b2]">{category.productCount ?? 0} ta</span>,
    },
    {
      key: 'active',
      header: 'Holat',
      cell: (category) => (
        <Badge variant={category.isActive ? 'success' : 'secondary'}>
          {category.isActive ? 'Faol' : 'Nofaol'}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Kategoriyalar"
        description="Mahsulot kategoriyalarini tartiblang va boshqaring."
        actions={
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Yangi kategoriya</Button>
        }
      />

      <DataTable
        columns={columns}
        data={categories.data ?? []}
        rowKey={(category) => category.id}
        loading={categories.isLoading}
        error={categories.isError ? categories.error : undefined}
        onRetry={() => void categories.refetch()}
        emptyTitle="Kategoriya yo'q"
        emptyDescription="Yangi kategoriya yaratish uchun yuqoridagi tugmani bosing."
        actions={(category) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Tahrirlash" onClick={() => openEdit(category)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={category.isActive ? 'Nofaollashtirish' : 'Faollashtirish'}
              disabled={updateCategory.isPending}
              onClick={() => void toggleActive(category)}
            >
              {updateCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className={category.isActive ? 'h-4 w-4 text-brand-400' : 'h-4 w-4 text-[#7f998b]'} />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="O'chirish" onClick={() => setToDelete(category)}>
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</DialogTitle>
            <DialogDescription>Kategoriya nomi, tartib raqami va ko'rinishini sozlang.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cat-name">Nom (inglizcha) *</Label>
                <Input id="cat-name" {...form.register('name')} />
                {form.formState.errors.name && <p className="mt-1 text-xs text-red-300">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="cat-name-uz">Nom (o'zbekcha)</Label>
                <Input id="cat-name-uz" {...form.register('nameUz')} />
              </div>
            </div>
            <div>
              <Label htmlFor="cat-slug">Slug *</Label>
              <Input id="cat-slug" {...form.register('slug')} placeholder="veb-saytlar" />
              {form.formState.errors.slug && <p className="mt-1 text-xs text-red-300">{form.formState.errors.slug.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cat-order">Tartib raqami</Label>
                <Input id="cat-order" type="number" min={0} {...form.register('sortOrder', { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="cat-icon">Ikonka nomi</Label>
                <Input id="cat-icon" {...form.register('icon')} placeholder="globe" />
              </div>
            </div>
            <div>
              <Label htmlFor="cat-image">Rasm URL</Label>
              <Input id="cat-image" {...form.register('imageUrl')} placeholder="https://... yoki /api/media/..." />
            </div>
            <div>
              <Label htmlFor="cat-desc">Tavsif</Label>
              <Textarea id="cat-desc" rows={3} {...form.register('description')} />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <Switch checked={Boolean(isActive)} onCheckedChange={(checked) => form.setValue('isActive', checked)} label="Faol" />
              <span className="text-sm text-white">Kategoriya faol</span>
            </label>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyani o'chirish?</DialogTitle>
            <DialogDescription>«{toDelete?.nameUz}» kategoriyasi o'chiriladi.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteCategory.isPending} onClick={() => void confirmDelete()}>
              {deleteCategory.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mt-5 p-4 text-xs text-[#8ba397]">
        Tartib raqami kichik bo'lsa, kategoriya katalogda yuqoriroq ko'rsatiladi.
      </Card>
    </div>
  )
}
