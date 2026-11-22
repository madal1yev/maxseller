'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ProductForm } from '@/components/product-form'
import { Button } from '@/components/ui/button'

export default function NewProductPage() {
  return (
    <div>
      <PageHeader
        title="Yangi mahsulot"
        description="Katalogga yangi raqamli mahsulot qo'shing."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/products"><ArrowLeft className="h-4 w-4" /> Orqaga</Link>
          </Button>
        }
      />
      <ProductForm />
    </div>
  )
}
