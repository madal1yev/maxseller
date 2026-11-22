import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProductsView } from '@/components/pages/products-view'
import { ProductCardSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Mahsulotlar',
  description: 'MaxSeller katalogidagi barcha raqamli mahsulotlar, filtrlar va saralash imkoniyati bilan.',
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-page py-10"><ProductCardSkeleton /></div>}>
      <ProductsView />
    </Suspense>
  )
}
