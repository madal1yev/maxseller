import type { Metadata } from 'next'
import { CategoryDetailView } from '@/components/pages/category-detail-view'

export const metadata: Metadata = {
  title: 'Kategoriya mahsulotlari',
  description: 'Tanlangan kategoriyadagi raqamli mahsulotlar.',
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { slug } = await params
  const { page } = await searchParams
  return <CategoryDetailView slug={slug} page={Math.max(1, Number(page) || 1)} />
}
