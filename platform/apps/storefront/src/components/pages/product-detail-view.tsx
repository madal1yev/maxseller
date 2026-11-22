'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate, formatMoney, reviewSchema } from '@maxseller/shared'
import type { z } from 'zod'
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  FileArchive,
  Heart,
  Loader2,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductCard } from '@/components/product-card'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { useAuth, useCart } from '@/components/providers'
import { useToast } from '@/components/ui/toast'
import {
  createReview,
  getProductBySlug,
  getProducts,
  getReviews,
  queryKeys,
} from '@/lib/api-queries'
import { formatBytes } from '@/lib/utils'
import { cn } from '@/lib/utils'

type ReviewFormValues = z.infer<typeof reviewSchema>

export function ProductDetailView({ slug }: { slug: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { addItem } = useCart()
  const { isAuthenticated, isFavorite, toggleFavorite } = useAuth()
  const { toast } = useToast()
  const [activeImage, setActiveImage] = React.useState(0)
  const [hoverRating, setHoverRating] = React.useState(0)

  const productQuery = useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: () => getProductBySlug(slug),
  })
  const product = productQuery.data

  const reviewsQuery = useQuery({
    queryKey: queryKeys.reviews(product?.id ?? 'none'),
    queryFn: () => getReviews(product!.id),
    enabled: Boolean(product),
  })

  const relatedQuery = useQuery({
    queryKey: queryKeys.products({ category: product?.categoryId ?? '', limit: 5 }),
    queryFn: () => getProducts({ category: product!.categoryId, limit: 5 }),
    enabled: Boolean(product),
  })

  const reviewForm = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { productId: '', rating: 5, comment: '' },
  })

  React.useEffect(() => {
    if (product) {
      reviewForm.setValue('productId', product.id)
      setActiveImage(0)
    }
  }, [product, reviewForm])

  const reviewMutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      toast({
        title: 'Sharhingiz yuborildi',
        description: 'Admin tasdiqlagach, sharh sahifada ko\'rinadi.',
        variant: 'success',
      })
      reviewForm.reset({ productId: product?.id ?? '', rating: 5, comment: '' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(product?.id ?? '') })
    },
    onError: (error: Error) => {
      toast({ title: 'Xatolik', description: error.message, variant: 'error' })
    },
  })

  if (productQuery.isLoading) {
    return (
      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (productQuery.isError || !product) {
    return (
      <div className="container-page py-10">
        <ErrorState
          message={
            productQuery.error instanceof Error
              ? productQuery.error.message
              : "Mahsulotni yuklab bo'lmadi. URL manzilini tekshiring."
          }
          onRetry={() => void productQuery.refetch()}
        />
      </div>
    )
  }

  const images = product.images ?? []
  const mainImage = images[activeImage]?.url ?? null
  const favorite = isFavorite(product.id)
  const discount =
    product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0
  const related = (relatedQuery.data?.items ?? []).filter((item) => item.id !== product.id).slice(0, 4)

  function handleAddToCart() {
    addItem(product!, 1)
    toast({ title: "Mahsulot savatga qo'shildi", description: product!.title, variant: 'success' })
  }

  function handleBuyNow() {
    addItem(product!, 1)
    router.push('/checkout')
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-emerald">Kategoriyalar</Link>
        <span>/</span>
        {product.category ? (
          <>
            <Link href={`/categories/${product.category.slug}`} className="hover:text-emerald">
              {product.category.nameUz || product.category.name}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="max-w-[200px] truncate text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-bg">
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-grid-glow">
                <ShoppingBag className="h-20 w-20 text-emerald/20" />
              </div>
            )}
            {discount > 0 ? (
              <span className="absolute left-4 top-4 rounded-xl bg-emerald px-3 py-1.5 text-sm font-extrabold text-black">
                -{discount}%
              </span>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`${index + 1}-rasm`}
                  className={cn(
                    'h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition',
                    activeImage === index ? 'border-emerald shadow-glow' : 'border-white/10 hover:border-emerald/50',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          {product.files?.length ? (
            <div className="panel mt-5 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <FileArchive className="h-4 w-4 text-emerald" /> Fayl tarkibi
              </h3>
              <div className="space-y-2">
                {product.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-bg/50 px-3 py-2.5 text-xs"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileArchive className="h-4 w-4 shrink-0 text-emerald" />
                      <span className="truncate">{file.fileName}</span>
                    </span>
                    <span className="shrink-0 text-muted">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Fayl nomlari va hajmi ko'rsatilgan. To'lov tasdiqlangach, fayllar yuklamalar bo'limida mavjud bo'ladi.
              </p>
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {product.category ? (
              <Badge>
                <Link href={`/categories/${product.category.slug}`}>
                  {product.category.nameUz || product.category.name}
                </Link>
              </Badge>
            ) : null}
            {product.featured ? <Badge variant="info">Tanlangan</Badge> : null}
            {product.bestSeller ? <Badge variant="warning">Top sotuvchi</Badge> : null}
          </div>

          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{product.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-muted">
            {typeof product.rating === 'number' ? (
              <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Star className="h-4 w-4 fill-current" /> {product.rating.toFixed(1)}
                <span className="text-muted">/ 5</span>
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-emerald" /> {product.views} ko'rish
            </span>
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-emerald" /> {product.sales} sotuv
            </span>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-muted">{product.shortDescription}</p>

          <div className="panel mt-7 p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="mb-1 text-xs text-muted">Mahsulot narxi</p>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-3xl font-extrabold text-emerald">
                    {formatMoney(product.price, product.currency || "so'm")}
                  </span>
                  {product.oldPrice > product.price ? (
                    <span className="text-base text-muted line-through">
                      {formatMoney(product.oldPrice, product.currency || "so'm")}
                    </span>
                  ) : null}
                </div>
              </div>
              {discount > 0 ? <Badge className="text-sm">-{discount}% chegirma</Badge> : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button size="lg" onClick={handleAddToCart}>
                <ShoppingBag className="h-5 w-5" /> Savatga qo'shish
              </Button>
              <Button size="lg" variant="secondary" onClick={handleBuyNow}>
                Hozir sotib olish <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => void toggleFavorite(product.id)}
            >
              <Heart className={cn('h-4 w-4', favorite && 'fill-current')} />
              {favorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}
            </Button>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald/20 bg-emerald/[0.05] p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
              <p className="text-xs leading-relaxed text-muted">
                Xavfsiz xarid: to'lov admin tomonidan tasdiqlangach, fayllar shaxsiy kabinetingizga
                yuklanadi. Chek yuklash to'lovni avtomatik tasdiqlamaydi.
              </p>
            </div>
          </div>

          <div className="mt-7">
            <Tabs defaultValue="description">
              <TabsList>
                <TabsTrigger value="description">Tavsif</TabsTrigger>
                <TabsTrigger value="features">Xususiyatlar</TabsTrigger>
                <TabsTrigger value="requirements">Talablar</TabsTrigger>
                <TabsTrigger value="compatibility">Muvofiqlik</TabsTrigger>
              </TabsList>
              <TabsContent value="description">
                <div className="prose-invert max-w-none text-sm leading-relaxed text-foreground/80">
                  {product.description ? (
                    product.description.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-3">{paragraph}</p>
                    ))
                  ) : (
                    <p className="text-muted">Bu mahsulot uchun tavsif hali qo'shilmagan.</p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="features">
                {product.features?.length ? (
                  <ul className="space-y-2">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /> {feature}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Xususiyatlar hali qo'shilmagan.</p>
                )}
              </TabsContent>
              <TabsContent value="requirements">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {product.requirements || 'Maxsus talablar ko\'rsatilmagan.'}
                </p>
              </TabsContent>
              <TabsContent value="compatibility">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {product.compatibility || 'Muvofiqlik ma\'lumoti ko\'rsatilmagan.'}
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 border-t border-white/10 pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Sharhlar</h2>
            <p className="mt-2 text-sm text-muted">Faqat tasdiqlangan sharhlar ko'rsatiladi.</p>
          </div>
          {typeof product.reviewsCount === 'number' ? (
            <Badge variant="secondary">{product.reviewsCount} sharh</Badge>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            {reviewsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-28" />
                ))}
              </div>
            ) : reviewsQuery.isError ? (
              <ErrorState onRetry={() => void reviewsQuery.refetch()} />
            ) : !reviewsQuery.data || reviewsQuery.data.length === 0 ? (
              <EmptyState title="Hali sharh yo'q" description="Birinchi bo'lib sharh qoldiring." />
            ) : (
              <div className="space-y-3">
                {reviewsQuery.data.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-white/10 bg-card/70 p-5">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold">{review.userName}</p>
                      <p className="text-xs text-muted">{formatDate(review.createdAt)}</p>
                    </div>
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={cn(
                            'h-4 w-4',
                            index < review.rating ? 'fill-amber-300 text-amber-300' : 'text-white/20',
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel h-fit p-5">
            <h3 className="text-base font-bold">Sharh yozish</h3>
            {isAuthenticated ? (
              <form
                onSubmit={reviewForm.handleSubmit((values) => reviewMutation.mutate(values))}
                className="mt-5 space-y-4"
              >
                <input type="hidden" {...reviewForm.register('productId')} />
                <div>
                  <Label className="mb-2 block">Reyting</Label>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1
                      const active = value <= (hoverRating || reviewForm.watch('rating'))
                      return (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => reviewForm.setValue('rating', value)}
                          aria-label={`${value} yulduz`}
                        >
                          <Star className={cn('h-7 w-7 transition', active ? 'fill-amber-300 text-amber-300' : 'text-white/25')} />
                        </button>
                      )
                    })}
                  </div>
                  {reviewForm.formState.errors.rating ? (
                    <p className="mt-1 text-xs text-red-400">Reyting tanlang.</p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="review-comment" className="mb-2 block">Fikringiz</Label>
                  <Textarea
                    id="review-comment"
                    placeholder="Mahsulot haqida fikringizni yozing..."
                    {...reviewForm.register('comment')}
                  />
                  {reviewForm.formState.errors.comment ? (
                    <p className="mt-1 text-xs text-red-400">
                      {reviewForm.formState.errors.comment.message}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full" disabled={reviewMutation.isPending}>
                  {reviewMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...</>
                  ) : (
                    'Sharhni yuborish'
                  )}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted">
                  Sharh admin tomonidan tasdiqlangach e'lon qilinadi.
                </p>
              </form>
            ) : (
              <div className="mt-5">
                <p className="text-sm leading-relaxed text-muted">
                  Sharh qoldirish uchun tizimga kiring.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button size="sm" asChild><Link href="/login">Kirish</Link></Button>
                  <Button size="sm" variant="secondary" asChild><Link href="/register">Ro'yxat</Link></Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 ? (
        <section className="mt-16 border-t border-white/10 pt-12">
          <h2 className="mb-7 text-2xl font-extrabold sm:text-3xl">O'xshash mahsulotlar</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-14 flex flex-wrap items-center justify-center gap-6 border-t border-white/10 pt-8 text-xs text-muted">
        <span className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-emerald" /> Sifat kafolati</span>
        <span className="flex items-center gap-2"><Download className="h-4 w-4 text-emerald" /> Tez yuklash</span>
        <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-emerald" /> Adolatli narxlar</span>
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald" /> Xavfsiz to'lov</span>
      </div>
    </div>
  )
}
