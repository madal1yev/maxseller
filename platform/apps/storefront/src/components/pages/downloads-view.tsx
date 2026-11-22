'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '@maxseller/shared'
import { Download, FileArchive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/common/error-state'
import { EmptyState } from '@/components/common/empty-state'
import { useToast } from '@/components/ui/toast'
import { downloadFile, getDownloads, queryKeys } from '@/lib/api-queries'
import { saveBlob } from '@/lib/download'
import { cn, formatBytes } from '@/lib/utils'

export function DownloadsView() {
  const { toast } = useToast()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.downloads,
    queryFn: getDownloads,
  })

  async function handleDownload(id: string, fileName: string) {
    setActiveId(id)
    try {
      const blob = await downloadFile(id)
      saveBlob(blob, fileName)
      toast({ title: 'Yuklash boshlandi', description: fileName, variant: 'success' })
    } catch (error) {
      toast({
        title: 'Yuklab bo\'lmadi',
        description: error instanceof Error ? error.message : 'Qaytadan urinib ko\'ring.',
        variant: 'error',
      })
    } finally {
      setActiveId(null)
    }
  }

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-emerald">Bosh sahifa</Link>
        <span>/</span>
        <span className="text-foreground">Yuklamalarim</span>
      </nav>

      <h1 className="text-3xl font-extrabold sm:text-4xl">Yuklamalarim</h1>
      <p className="mt-2 mb-9 text-sm text-muted">
        To'lovi tasdiqlangan mahsulotlar fayllari shu yerda saqlanadi.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Hali yuklamalar yo'q"
          description="To'lovi tasdiqlangan buyurtmalaringiz fayllari bu yerda paydo bo'ladi."
          action={<Button asChild><Link href="/orders">Xaridlarimga o'tish</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {data.map((download) => (
            <div
              key={download.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-card/70 p-5"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                  <FileArchive className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{download.productTitle}</p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {download.fileName} · {formatBytes(download.size)} · {formatDate(download.createdAt)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={activeId === download.id}
                onClick={() => void handleDownload(download.id, download.fileName)}
              >
                {activeId === download.id ? (
                  <Loader2 className={cn('h-4 w-4 animate-spin')} />
                ) : (
                  <><Download className="h-4 w-4" /> Yuklab olish</>
                )}
              </Button>
            </div>
          ))}
          <p className="pt-4 text-center text-xs text-muted">
            Yangi fayllar paydo bo'lishi uchun sahifani vaqti-vaqti bilan yangilang.
          </p>
          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Yangilash
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
