'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { Product, ProductStatus } from '@maxseller/shared'
import { formatDate, formatMoney } from '@maxseller/shared'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { ProductStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectItem } from '@/components/ui/select'
import { useToast } from '@/components/providers'
import {
  useAdminProducts,
  useDeleteProduct,
  usePatchProduct,
} from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

const statuses: { value: ProductStatus | ''; label: string }[] = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'PUBLISHED', label: 'Nashr etilgan' },
  { value: 'HIDDEN', label: 'Yashirilgan' },
  { value: 'ARCHIVED', label: 'Arxivlangan' },
]

export default function ProductsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ProductStatus | ''>('')
  const [page, setPage] = useState(1)
  const [toDelete, setToDelete] = useState<Product | null>(null)

  const products = useAdminProducts({ q: query, status, page, limit: 12 })
  const patchProduct = usePatchProduct()
  const deleteProduct = useDeleteProduct()

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setQuery(searchInput.trim())
    setPage(1)
  }

  async function toggleStatus(product: Product) {
    const nextStatus: ProductStatus = product.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED'
    try {
      await patchProduct.mutateAsync({ id: product.id, body: { status: nextStatus } })
      toast({
        title: nextStatus === 'PUBLISHED' ? 'Mahsulot nashr etildi' : 'Mahsulot yashirildi',
        variant: 'success',
      })
    } catch (error) {
      toast({ title: 'Holat o\'zgartirilmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteProduct.mutateAsync(toDelete.id)
      toast({ title: 'Mahsulot arxivlandi', variant: 'success' })
      setToDelete(null)
    } catch (error) {
      toast({ title: 'O\'chirib bo\'lmadi', description: errorMessage(error), variant: 'error' })
    }
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'title',
      header: 'Mahsulot',
      sortValue: (product) => product.title,
      cell: (product) => (
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.04]">
            {product.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-[#5f796b]">—</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{product.title}</p>
            <p className="truncate text-[11px] text-[#7f998b]">{product.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategoriya',
      cell: (product) => (
        <span className="text-xs text-[#a8c0b2]">{product.category?.nameUz ?? product.category?.name ?? '—'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Narx',
      sortValue: (product) => product.price,
      cell: (product) => <span className="whitespace-nowrap text-sm font-semibold text-brand-300">{formatMoney(product.price)}</span>,
    },
    {
      key: 'status',
      header: 'Holat',
      cell: (product) => <ProductStatusBadge status={product.status} />,
    },
    {
      key: 'sales',
      header: 'Sotuv',
      sortValue: (product) => product.sales,
      cell: (product) => (
        <span className="text-xs text-[#a8c0b2]">{product.sales} dona · {product.views} ko'rish</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Yaratilgan',
      sortValue: (product) => product.createdAt,
      cell: (product) => <span className="whitespace-nowrap text-xs text-[#7f998b]">{formatDate(product.createdAt)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Mahsulotlar"
        description="Katalogdagi barcha raqamli mahsulotlaringizni boshqaring."
        actions={
          <Button asChild>
            <Link href="/products/new"><Plus className="h-4 w-4" /> Yangi mahsulot</Link>
          </Button>
        }
      />

      <Card className="mb-5 flex flex-wrap items-center gap-3 p-4">
        <form onSubmit={handleSearch} className="flex min-w-[220px] flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f998b]" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nomi yoki slug bo'yicha qidirish"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Qidirish</Button>
        </form>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | '')
            setPage(1)
          }}
          className="w-full sm:w-52"
          aria-label="Holat bo'yicha filtr"
        >
          {statuses.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
      </Card>

      <DataTable
        columns={columns}
        data={products.data?.items ?? []}
        rowKey={(product) => product.id}
        onRowClick={(product) => router.push(`/products/${product.id}`)}
        loading={products.isLoading}
        error={products.isError ? products.error : undefined}
        onRetry={() => void products.refetch()}
        page={products.data?.page ?? page}
        pageCount={products.data?.pages}
        total={products.data?.total}
        onPageChange={setPage}
        emptyTitle="Mahsulot topilmadi"
        emptyDescription="Qidiruv yoki filtrni o'zgartirib ko'ring."
        actions={(product) => (
          <>
            <Button asChild variant="ghost" size="icon" aria-label="Tahrirlash">
              <Link href={`/products/${product.id}`}><Pencil className="h-4 w-4" /></Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={product.status === 'PUBLISHED' ? 'Yashirish' : 'Nashr etish'}
              disabled={patchProduct.isPending}
              onClick={() => void toggleStatus(product)}
            >
              {patchProduct.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : product.status === 'PUBLISHED' ? (
                <EyeOff className="h-4 w-4 text-amber-300" />
              ) : (
                <Eye className="h-4 w-4 text-brand-400" />
              )}
            </Button>
            <Button variant="ghost" size="icon" aria-label="O'chirish" onClick={() => setToDelete(product)}>
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </>
        )}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mahsulotni o'chirish?</DialogTitle>
            <DialogDescription>
              «{toDelete?.title}» arxivlanadi va katalogda ko'rinmay qoladi. Bu amalni qaytarish mumkin emas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>Bekor qilish</Button>
            <Button variant="destructive" disabled={deleteProduct.isPending} onClick={() => void confirmDelete()}>
              {deleteProduct.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
