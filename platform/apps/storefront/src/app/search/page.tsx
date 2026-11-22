import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchView } from '@/components/pages/search-view'

export const metadata: Metadata = {
  title: 'Qidiruv',
  description: 'MaxSeller katalogida mahsulot qidirish.',
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container-page py-10 text-muted">Qidiruv yuklanmoqda...</div>}>
      <SearchView />
    </Suspense>
  )
}
