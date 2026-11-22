'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, FileText, Loader2 } from 'lucide-react'
import { apiFetchBlob } from '@/lib/api'
import { receiptUrl } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

export function ReceiptPreview({ orderId, receiptId }: { orderId: string; receiptId: string }) {
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setPreview(null)
    setError(null)

    apiFetchBlob(receiptUrl(orderId, receiptId))
      .then(({ blob, mime }) => {
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setPreview({ url: objectUrl, mime })
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason))
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [orderId, receiptId])

  if (error) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-red-400/20 bg-red-400/[0.05] text-center">
        <div>
          <FileText className="mx-auto mb-2 h-6 w-6 text-red-300" />
          <p className="text-sm text-red-300">Chekni yuklab bo\'lmadi</p>
          <p className="mt-1 text-xs text-[#8ba397]">{error}</p>
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm text-[#8ba397]">
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" /> Chek yuklanmoqda...
        </div>
      </div>
    )
  }

  const isPdf = preview.mime.includes('pdf')

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-ink-950/60">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <span className="text-xs font-medium text-[#a8c0b2]">Chek ko'rinishi</span>
        <a
          href={preview.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
        >
          Yangi oynada <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {isPdf ? (
        <iframe src={preview.url} title="To'lov cheki" className="h-[520px] w-full bg-white" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.url} alt="To'lov cheki" className="max-h-[560px] w-full object-contain" />
      )}
    </div>
  )
}
