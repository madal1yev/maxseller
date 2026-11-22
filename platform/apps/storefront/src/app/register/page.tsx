import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegisterView } from '@/components/pages/register-view'

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish",
  description: 'MaxSeller akkauntini yaratish.',
  robots: { index: false, follow: false },
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="container-page py-16 text-center text-muted">Yuklanmoqda...</div>}>
      <RegisterView />
    </Suspense>
  )
}
