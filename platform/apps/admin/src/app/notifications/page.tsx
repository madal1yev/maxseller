'use client'

import { useState } from 'react'
import { Bell, BellRing, Check, CheckCheck, Loader2 } from 'lucide-react'
import { formatDate } from '@maxseller/shared'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/providers'
import { useAdminNotifications, useMarkNotificationRead } from '@/lib/api-queries'
import { errorMessage } from '@/lib/utils'

export default function NotificationsPage() {
  const { toast } = useToast()
  const notifications = useAdminNotifications()
  const markRead = useMarkNotificationRead()
  const [busy, setBusy] = useState(false)

  const items = [...(notifications.data ?? [])].sort(
    (a, b) => Number(a.isRead) - Number(b.isRead) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  const unread = items.filter((item) => !item.isRead).length

  async function handleRead(id: string) {
    try {
      await markRead.mutateAsync(id)
      toast({ title: 'O\'qilgan deb belgilandi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Belgilash muvaffaqiyatsiz', description: errorMessage(error), variant: 'error' })
    }
  }

  async function handleReadAll() {
    setBusy(true)
    try {
      for (const item of items.filter((entry) => !entry.isRead)) {
        await markRead.mutateAsync(item.id)
      }
      toast({ title: 'Barchasi o\'qilgan deb belgilandi', variant: 'success' })
    } catch (error) {
      toast({ title: 'Xatolik', description: errorMessage(error), variant: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Bildirishnomalar"
        description="Tizimdagi yangiliklar va muhim xabarlar."
        actions={
          <>
            <Badge variant={unread ? 'warning' : 'secondary'}>{unread} ta o'qilmagan</Badge>
            <Button variant="secondary" size="sm" disabled={!unread || busy} onClick={() => void handleReadAll()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Barchasini o'qish
            </Button>
          </>
        }
      />

      {notifications.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-2xl" />)}
        </div>
      ) : notifications.isError ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-red-300">Bildirishnomalar yuklanmadi: {errorMessage(notifications.error)}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void notifications.refetch()}>Qayta urinish</Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-[#5f796b]" />
          <p className="font-display text-sm font-semibold text-white">Bildirishnoma yo'q</p>
          <p className="mt-1 text-sm text-[#8ba397]">Yangi xabarlar bu yerda paydo bo'ladi.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={`flex flex-wrap items-start gap-4 p-5 ${item.isRead ? 'opacity-70' : 'border-brand-500/20 bg-brand-500/[0.035]'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.isRead ? 'bg-white/[0.05] text-[#7f998b]' : 'bg-brand-500/15 text-brand-400'}`}>
                {item.isRead ? <Bell className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <Badge variant="outline">{item.type}</Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-[#a8c0b2]">{item.body}</p>
                <p className="mt-2 text-[11px] text-[#5f796b]">{formatDate(item.createdAt)}</p>
              </div>
              {!item.isRead && (
                <Button variant="outline" size="sm" disabled={markRead.isPending || busy} onClick={() => void handleRead(item.id)}>
                  <Check className="h-3.5 w-3.5" /> O'qildi
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
