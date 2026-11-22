'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Phone, Send, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getPublicSettings, queryKeys } from '@/lib/api-queries'

export function ContactView() {
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getPublicSettings,
  })
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')

  const telegram = settings?.telegramChannel || 'https://t.me/maxseller'
  const telegramHref = telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace(/^@/, '')}`
  const supportEmail = settings?.email || 'support@maxseller.uz'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = encodeURIComponent(`MaxSeller: ${name || 'Murojaat'}`)
    const body = encodeURIComponent(
      `Ism: ${name}\nEmail: ${email}\n\nXabar:\n${message}`,
    )
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`
  }

  return (
    <div className="container-page py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="panel p-6 sm:p-8">
          <h2 className="text-xl font-extrabold">Bizga yozing</h2>
          <p className="mt-2 text-sm text-muted">
            Formani to'ldiring — sizning pochta dasturingiz ochilib, xabar tayyorlanadi.
          </p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact-name" className="mb-2 block">Ismingiz</Label>
                <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ismingiz" required />
              </div>
              <div>
                <Label htmlFor="contact-email" className="mb-2 block">Email</Label>
                <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
              </div>
            </div>
            <div>
              <Label htmlFor="contact-message" className="mb-2 block">Xabar</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Savolingiz yoki taklifingizni yozing..."
                className="min-h-[180px]"
                required
              />
            </div>
            <Button type="submit" size="lg">
              <Send className="h-4 w-4" /> Xabarni tayyorlash
            </Button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="panel p-6">
            <h3 className="mb-4 text-base font-bold">Aloqa ma'lumotlari</h3>
            <div className="space-y-4 text-sm">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-3 text-muted transition hover:text-emerald">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                  <Mail className="h-4 w-4" />
                </span>
                {supportEmail}
              </a>
              {settings?.phone ? (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-3 text-muted transition hover:text-emerald">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                    <Phone className="h-4 w-4" />
                  </span>
                  {settings.phone}
                </a>
              ) : null}
              <a href={telegramHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted transition hover:text-emerald">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                  <MessageSquare className="h-4 w-4" />
                </span>
                Telegram kanalimiz
              </a>
            </div>
          </div>
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald px-5 py-4 text-sm font-bold text-black shadow-glow transition hover:bg-emerald-dark"
          >
            <Send className="h-4 w-4" /> Telegram orqali yozish
          </a>
          <div className="rounded-2xl border border-white/10 bg-surface/50 p-5 text-xs leading-relaxed text-muted">
            <p className="mb-2 font-bold text-foreground">Javob vaqti</p>
            Oddiy savollarga 24 soat ichida javob beramiz. To'lov bilan bog'liq masalalarda
            buyurtma raqamini ko'rsatib, Telegram kanaliga yozing.
          </div>
        </aside>
      </div>
    </div>
  )
}
