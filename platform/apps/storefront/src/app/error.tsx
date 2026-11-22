'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Nimadir xato ketdi</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Sahifani yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring yoki bosh sahifaga
        qayting.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" /> Qaytadan urinib ko'rish
        </Button>
        <Button variant="secondary" asChild>
          <a href="/">Bosh sahifa</a>
        </Button>
      </div>
    </div>
  )
}
