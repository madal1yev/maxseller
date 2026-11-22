'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { formatDate } from '@maxseller/shared'
import { PageHeader } from '@/components/page-header'
import { ProductForm } from '@/components/product-form'
import { ProductStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminProduct } from '@/lib/api-queries'

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const product = useAdminProduct(params.id)

  if (product.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full rounded-2xl" />
      </div>
    )
  }

  if (product.isError || !product.data) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-red-300">Mahsulot yuklanmadi yoki topilmadi.</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/products"><ArrowLeft className="h-4 w-4" /> Mahsulotlarga qaytish</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={product.data.title}
        description={`Oxirgi yangilanish: ${formatDate(product.data.updatedAt)}`}
        actions={
          <>
            <Badge variant="secondary">{product.data.slug}</Badge>
            <ProductStatusBadge status={product.data.status} />
            <Button asChild variant="secondary" size="sm">
              <Link href="/products"><ArrowLeft className="h-4 w-4" /> Orqaga</Link>
            </Button>
          </>
        }
      />
      <ProductForm product={product.data} />
    </div>
  )
}
