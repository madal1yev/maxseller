import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { OrdersView } from '@/components/pages/orders-view'

export const metadata: Metadata = {
  title: 'Mening xaridlarim',
  description: 'MaxSeller buyurtmalaringiz va ularning holati.',
  robots: { index: false, follow: false },
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersView />
    </ProtectedRoute>
  )
}
