import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { CheckoutView } from '@/components/pages/checkout-view'

export const metadata: Metadata = {
  title: 'Buyurtma berish',
  description: 'MaxSeller buyurtmasini tasdiqlash va to\'lov ko\'rsatmalari.',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutView />
    </ProtectedRoute>
  )
}
