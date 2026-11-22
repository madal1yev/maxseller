'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers'

/** Token yo'q bo'lsa login sahifasiga next parametri bilan yo'naltiradi. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`)
    }
  }, [isAuthenticated, isLoading, pathname, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="container-page flex min-h-[55vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-emerald" />
          <p className="text-sm">
            {isLoading ? 'Tekshirilmoqda...' : 'Login sahifasiga yo\'naltirilmoqda...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
