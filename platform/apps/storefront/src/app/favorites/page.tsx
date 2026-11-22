import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { FavoritesView } from '@/components/pages/favorites-view'

export const metadata: Metadata = {
  title: 'Sevimlilarim',
  description: 'Saqlangan mahsulotlar ro\'yxati.',
  robots: { index: false, follow: false },
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesView />
    </ProtectedRoute>
  )
}
