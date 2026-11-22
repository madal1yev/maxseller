import type { Metadata } from 'next'
import { ProductDetailView } from '@/components/pages/product-detail-view'

export const metadata: Metadata = {
  title: 'Mahsulot',
  description: 'Mahsulot tafsilotlari, narxi, xususiyatlari va sharhlari.',
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <ProductDetailView slug={slug} />
}
