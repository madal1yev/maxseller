'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/utils'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-red-400/25 bg-red-400/10">
          <AlertTriangle className="h-5 w-5 text-red-300" />
        </div>
        <h2 className="text-lg font-semibold text-white">Nimadir noto\'g\'ri ketdi</h2>
        <p className="mt-2 text-sm text-[#8ba397]">{errorMessage(error)}</p>
        <Button onClick={reset} className="mt-6">
          <RotateCcw className="h-4 w-4" /> Qayta urinish
        </Button>
      </div>
    </div>
  )
}
