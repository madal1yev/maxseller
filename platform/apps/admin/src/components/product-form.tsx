'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { createProductSchema, formatMoney, slugify } from '@maxseller/shared'
import type { Product, ProductStatus } from '@maxseller/shared'
import {
  ImagePlus,
  Loader2,
  Package,
  Paperclip,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectItem } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/providers'
import {
  useAdminCategories,
  useCreateProduct,
  useUpdateProduct,
  useUploadImage,
  useUploadProductFile,
} from '@/lib/api-queries'
import { cn, errorMessage, formatFileSize } from '@/lib/utils'

interface ProductFormValues {
  title: string
  slug: string
  shortDescription: string
  description: string
  price: number
  oldPrice: number
  categoryId: string
  status: ProductStatus
  featured: boolean
  bestSeller: boolean
  features: string[]
  requirements: string
  compatibility: string
  imageIds: string[]
  fileIds: string[]
}

const statusOptions: { value: ProductStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'PUBLISHED', label: 'Nashr etilgan' },
  { value: 'HIDDEN', label: 'Yashirilgan' },
  { value: 'ARCHIVED', label: 'Arxivlangan' },
]

const defaultValues: ProductFormValues = {
  title: '',
  slug: '',
  shortDescription: '',
  description: '',
  price: 0,
  oldPrice: 0,
  categoryId: '',
  status: 'DRAFT',
  featured: false,
  bestSeller: false,
  features: [],
  requirements: '',
  compatibility: '',
  imageIds: [],
  fileIds: [],
}

interface ImagePreview {
  id: string
  url: string
  name: string
}

interface FilePreview {
  id: string
  name: string
  size?: number
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter()
  const { toast } = useToast()
  const categories = useAdminCategories()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(product?.id ?? '')
  const uploadImageMutation = useUploadImage()
  const uploadFileMutation = useUploadProductFile()

  const [slugTouched, setSlugTouched] = useState(Boolean(product))
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([])
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([])

  const resolver = zodResolver(createProductSchema) as unknown as Resolver<ProductFormValues>
  const form = useForm<ProductFormValues>({ resolver, defaultValues })
  const { register, handleSubmit, watch, setValue, reset, formState } = form

  const features = watch('features') ?? []

  function updateFeature(index: number, value: string) {
    const next = [...features]
    next[index] = value
    setValue('features', next)
  }

  function addFeature() {
    setValue('features', [...features, ''])
  }

  function removeFeature(index: number) {
    setValue('features', features.filter((_, itemIndex) => itemIndex !== index))
  }

  const title = watch('title')
  const slug = watch('slug')
  const price = watch('price')
  const oldPrice = watch('oldPrice')
  const shortDescription = watch('shortDescription')
  const featured = watch('featured')
  const bestSeller = watch('bestSeller')
  const status = watch('status')
  const imageIds = watch('imageIds') ?? []
  const fileIds = watch('fileIds') ?? []

  useEffect(() => {
    if (product) {
      reset({
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription ?? '',
        description: product.description ?? '',
        price: Number(product.price),
        oldPrice: Number(product.oldPrice ?? 0),
        categoryId: product.categoryId,
        status: product.status,
        featured: product.featured,
        bestSeller: product.bestSeller,
        features: product.features ?? [],
        requirements: product.requirements ?? '',
        compatibility: product.compatibility ?? '',
        imageIds: (product.images ?? []).map((image) => image.id),
        fileIds: (product.files ?? []).map((file) => file.id),
      })
      setImagePreviews(
        (product.images ?? []).map((image) => ({ id: image.id, url: image.url, name: image.alt || image.id })),
      )
      setFilePreviews(
        (product.files ?? []).map((file) => ({ id: file.id, name: file.fileName, size: file.size })),
      )
    }
  }, [product, reset])

  useEffect(() => {
    if (!slugTouched && title) setValue('slug', slugify(title))
  }, [slugTouched, title, setValue])

  const saving = createProduct.isPending || updateProduct.isPending

  async function handleImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    for (const file of files) {
      try {
        const uploaded = await uploadImageMutation.mutateAsync(file)
        setImagePreviews((current) => [...current, { id: uploaded.id, url: uploaded.url, name: uploaded.name }])
        setValue('imageIds', [...(watch('imageIds') ?? []), uploaded.id])
      } catch (error) {
        toast({ title: 'Rasm yuklanmadi', description: errorMessage(error), variant: 'error' })
      }
    }
    event.target.value = ''
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    for (const file of files) {
      try {
        const uploaded = await uploadFileMutation.mutateAsync(file)
        setFilePreviews((current) => [...current, { id: uploaded.id, name: uploaded.name, size: uploaded.size }])
        setValue('fileIds', [...(watch('fileIds') ?? []), uploaded.id])
      } catch (error) {
        toast({ title: 'Fayl yuklanmadi', description: errorMessage(error), variant: 'error' })
      }
    }
    event.target.value = ''
  }

  function removeImage(id: string) {
    setValue('imageIds', imageIds.filter((item) => item !== id))
    setImagePreviews((current) => current.filter((item) => item.id !== id))
  }

  function removeFile(id: string) {
    setValue('fileIds', fileIds.filter((item) => item !== id))
    setFilePreviews((current) => current.filter((item) => item.id !== id))
  }

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      ...values,
      slug: values.slug || slugify(values.title),
      features: values.features.filter((feature) => feature.trim().length > 0),
    }
    try {
      if (product) {
        await updateProduct.mutateAsync(payload)
        toast({ title: 'Mahsulot yangilandi', variant: 'success' })
      } else {
        const created = await createProduct.mutateAsync(payload)
        toast({ title: 'Mahsulot yaratildi', variant: 'success' })
        router.push(`/products/${created.id}`)
      }
    } catch (error) {
      toast({ title: 'Saqlab bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  })

  const uploading = uploadImageMutation.isPending || uploadFileMutation.isPending

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Asosiy ma\'lumotlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Mahsulot nomi *</Label>
                <Input id="title" placeholder=" masalan, Premium Landing Page" {...register('title')} />
                {formState.errors.title && (
                  <p className="mt-1 text-xs text-red-300">{formState.errors.title.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="premium-landing-page"
                  {...register('slug', { onChange: () => setSlugTouched(true) })}
                />
                {formState.errors.slug && (
                  <p className="mt-1 text-xs text-red-300">{formState.errors.slug.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="categoryId">Kategoriya *</Label>
                <Select id="categoryId" {...register('categoryId')}>
                  <SelectItem value="">Tanlang</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nameUz || category.name}
                    </SelectItem>
                  ))}
                </Select>
                {formState.errors.categoryId && (
                  <p className="mt-1 text-xs text-red-300">{formState.errors.categoryId.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="shortDescription">Qisqa tavsif</Label>
              <Input
                id="shortDescription"
                placeholder="Katalogda ko'rsatiladigan qisqa matn"
                {...register('shortDescription')}
              />
              {formState.errors.shortDescription && (
                <p className="mt-1 text-xs text-red-300">{formState.errors.shortDescription.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">To\'liq tavsif</Label>
              <Textarea id="description" rows={8} placeholder="Mahsulot haqida batafsil..." {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Narx va holat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price">Narx (so'm) *</Label>
                <Input id="price" type="number" min={0} step="1000" {...register('price', { valueAsNumber: true })} />
                {formState.errors.price && (
                  <p className="mt-1 text-xs text-red-300">{formState.errors.price.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="oldPrice">Eski narx (chegirma uchun)</Label>
                <Input id="oldPrice" type="number" min={0} step="1000" {...register('oldPrice', { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="status">Holat</Label>
                <Select id="status" {...register('status')}>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <Switch
                  checked={Boolean(featured)}
                  onCheckedChange={(checked) => setValue('featured', checked)}
                  label="Tanlangan mahsulot"
                />
                <span className="text-sm text-white">Tanlanganlarda ko'rsatish</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <Switch
                  checked={Boolean(bestSeller)}
                  onCheckedChange={(checked) => setValue('bestSeller', checked)}
                  label="Eng yaxshi sotuvchi"
                />
                <span className="text-sm text-white">Eng yaxshi sotuvchi</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Xususiyatlar va talablar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Xususiyatlar ro'yxati</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                >
                  <Plus className="h-3.5 w-3.5" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-2">
                {features.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-[#7f998b]">
                    Hozircha xususiyat yo'q
                  </p>
                )}
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Xususiyat ${index + 1}`}
                      value={feature}
                      onChange={(event) => updateFeature(index, event.target.value)}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFeature(index)} aria-label="O'chirish">
                      <Trash2 className="h-4 w-4 text-red-300" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="requirements">Talablar</Label>
              <Textarea id="requirements" rows={3} {...register('requirements')} />
            </div>
            <div>
              <Label htmlFor="compatibility">Moslik</Label>
              <Textarea id="compatibility" rows={3} {...register('compatibility')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media va fayllar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="images">Rasmlar</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-brand-500/40 hover:bg-brand-500/[0.04]">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-brand-400" /> : <ImagePlus className="h-5 w-5 text-brand-400" />}
                <span className="text-sm font-medium text-white">Rasm yuklash</span>
                <span className="text-xs text-[#7f998b]">JPG, PNG, WEBP</span>
                <input id="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImages} />
              </label>
              {imagePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {imagePreviews.map((image) => (
                    <div key={image.id} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-ink-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        aria-label="Rasmni o'chirish"
                        className="absolute right-1 top-1 rounded-lg bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="product-files">Mahsulot fayllari</Label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-brand-500/40 hover:bg-brand-500/[0.04]">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin text-brand-400" /> : <UploadCloud className="h-5 w-5 text-brand-400" />}
                <span className="text-sm font-medium text-white">Fayl yuklash</span>
                <span className="text-xs text-[#7f998b]">ZIP, PDF va boshqalar</span>
                <input id="product-files" type="file" accept=".zip,.pdf,.7z" multiple className="hidden" onChange={handleFiles} />
              </label>
              {filePreviews.length > 0 && (
                <div className="mt-3 space-y-2">
                  {filePreviews.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                      <Paperclip className="h-4 w-4 shrink-0 text-brand-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{file.name}</p>
                        {file.size !== undefined && (
                          <p className="text-[10px] text-[#7f998b]">{formatFileSize(file.size)}</p>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(file.id)} aria-label="Faylni o'chirish">
                        <Trash2 className="h-3.5 w-3.5 text-red-300" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={saving || uploading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {product ? 'O\'zgarishlarni saqlash' : 'Mahsulotni yaratish'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.push('/products')}>
            Bekor qilish
          </Button>
        </div>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <Card className="overflow-hidden">
          <div className="relative aspect-[4/3] bg-gradient-to-br from-brand-500/10 to-transparent">
            {imagePreviews[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreviews[0].url} alt={title || 'Mahsulot'} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center">
                <Package className="h-10 w-10 text-brand-500/30" />
              </div>
            )}
          </div>
          <CardContent className="pt-4">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {featured && <Badge variant="info">Tanlangan</Badge>}
              {bestSeller && <Badge variant="warning">Best-seller</Badge>}
              <Badge variant="secondary">{statusOptions.find((item) => item.value === status)?.label ?? status}</Badge>
            </div>
            <p className="font-display text-sm font-semibold text-white">{title || 'Mahsulot nomi'}</p>
            <p className="mt-1 text-xs text-[#8ba397]">{shortDescription || 'Qisqa tavsif bu yerda ko\'rinadi'}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold text-brand-400">{formatMoney(Number(price) || 0)}</span>
              {Number(oldPrice) > 0 && (
                <span className="text-xs text-[#7f998b] line-through">{formatMoney(Number(oldPrice))}</span>
              )}
            </div>
            <div className="mt-4 border-t border-white/[0.06] pt-4 text-[11px] text-[#7f998b]">
              Slug: <span className={cn('font-mono', slug ? 'text-brand-300' : '')}>{slug || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
