import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginView } from '@/components/pages/login-view'

export const metadata: Metadata = {
  title: 'Kirish',
  description: 'MaxSeller akkauntiga kirish.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-center text-muted">Yuklanmoqda...</div>}>
      <LoginView />
    </Suspense>
  )
}
