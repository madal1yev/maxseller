import type { Metadata } from 'next'
import { ProtectedRoute } from '@/components/common/protected-route'
import { ProfileView } from '@/components/pages/profile-view'

export const metadata: Metadata = {
  title: 'Profil',
  description: 'Shaxsiy kabinetingiz.',
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileView />
    </ProtectedRoute>
  )
}
