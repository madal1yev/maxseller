import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { DownloadsView } from '@/components/pages/downloads-view'

export const metadata: Metadata = {
  title: 'Yuklamalarim',
  description: 'Sotib olingan raqamli mahsulotlar fayllari.',
  robots: { index: false, follow: false },
}

export default function DownloadsPage() {
  return (
    <ProtectedRoute>
      <DownloadsView />
    </ProtectedRoute>
  )
}
