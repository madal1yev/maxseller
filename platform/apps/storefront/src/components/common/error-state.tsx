'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ErrorState({
  message = "Ma'lumotlarni yuklab bo'lmadi. Iltimos, qaytadan urinib ko'ring.",
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.04] px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-red-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <p className="max-w-md text-sm leading-relaxed text-foreground/80">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" /> Qaytadan urinib ko'rish
        </Button>
      ) : null}
    </div>
  )
}
