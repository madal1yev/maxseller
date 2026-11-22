import type { Metadata } from 'next'
import { CategoriesView } from '@/components/pages/categories-view'

export const metadata: Metadata = {
  title: 'Kategoriyalar',
  description: 'MaxSeller raqamli mahsulotlar kategoriyalari: veb, dizayn, ta\'lim, dasturlash va boshqalar.',
}

export default function CategoriesPage() {
  return <CategoriesView />
}
