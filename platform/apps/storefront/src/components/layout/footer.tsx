'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Github, Mail, MapPin, Phone, Send, Zap } from 'lucide-react'
import { getPublicSettings, queryKeys } from '@/lib/api-queries'

const columns = [
  {
    title: 'Do\'kon',
    links: [
      { href: '/products', label: 'Barcha mahsulotlar' },
      { href: '/categories', label: 'Kategoriyalar' },
      { href: '/search', label: 'Qidiruv' },
      { href: '/favorites', label: 'Sevimlilarim' },
    ],
  },
  {
    title: 'Yordam',
    links: [
      { href: '/faq', label: 'Ko\'p so\'raladigan savollar' },
      { href: '/contact', label: 'Biz bilan bog\'lanish' },
      { href: '/refund', label: 'Pulni qaytarish' },
      { href: '/downloads', label: 'Yuklamalarim' },
    ],
  },
  {
    title: 'Kompaniya',
    links: [
      { href: '/about', label: 'Biz haqimizda' },
      { href: '/privacy', label: 'Maxfiylik siyosati' },
      { href: '/terms', label: 'Foydalanish shartlari' },
      { href: '/orders', label: 'Mening xaridlarim' },
    ],
  },
]

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getPublicSettings,
    staleTime: 5 * 60_000,
  })

  const telegram = settings?.telegramChannel || 'https://t.me/maxseller'
  const telegramHref = telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace(/^@/, '')}`

  return (
    <footer className="mt-20 border-t border-white/10 bg-surface/70">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald text-black shadow-glow">
                <Zap className="h-5 w-5 fill-black" />
              </span>
              <span className="font-display text-lg font-extrabold">
                Max<span className="text-emerald">Seller</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {settings?.slogan || 'Raqamli mahsulotlar bir joyda!'}{' '}
              {settings?.aboutText ||
                'Veb-saytlar, dizayn shablonlari, kurslar va boshqa raqamli mahsulotlarni xavfsiz va qulay tarzda xarid qiling.'}
            </p>
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald/15 px-4 py-2.5 text-sm font-bold text-emerald transition hover:bg-emerald/25"
            >
              <Send className="h-4 w-4" /> Telegram kanalimiz
            </a>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-sm font-bold">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition hover:text-emerald"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {(settings?.email || settings?.phone) && (
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-8 text-sm text-muted">
            {settings?.email ? (
              <a href={`mailto:${settings.email}`} className="flex items-center gap-2 hover:text-emerald">
                <Mail className="h-4 w-4 text-emerald" /> {settings.email}
              </a>
            ) : null}
            {settings?.phone ? (
              <a href={`tel:${settings.phone}`} className="flex items-center gap-2 hover:text-emerald">
                <Phone className="h-4 w-4 text-emerald" /> {settings.phone}
              </a>
            ) : null}
            {settings?.instagram ? (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald" /> Onlayn xizmat · O'zbekiston
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} MaxSeller. {settings?.footerText || 'Barcha huquqlar himoyalangan.'}
          </p>
          <p className="flex items-center gap-1.5">
            <Github className="h-3.5 w-3.5" /> Premium digital marketplace
          </p>
        </div>
      </div>
    </footer>
  )
}
