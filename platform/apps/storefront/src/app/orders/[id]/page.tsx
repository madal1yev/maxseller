import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { OrderDetailView } from '@/components/pages/order-detail-view'

export const metadata: Metadata = {
  title: 'Buyurtma tafsilotlari',
  description: 'Buyurtma holati, to\'lov ko\'rsatmalari va chek yuklash.',
  robots: { index: false, follow: false },
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <ProtectedRoute>
      <OrderDetailView id={id} />
    </ProtectedRoute>
  )
}
