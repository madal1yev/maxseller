import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'MaxSeller — Raqamli mahsulotlar bir joyda!',
    template: '%s | MaxSeller',
  },
  description:
    'MaxSeller — raqamli mahsulotlar marketplacelari. Veb-saytlar, dizayn shablonlari, logotiplar, o\'quv materiallari va dasturlash resurslarini xavfsiz xarid qiling.',
  keywords: [
    'MaxSeller',
    'raqamli mahsulotlar',
    'veb-sayt shablonlari',
    'dizayn shablonlari',
    'video kurslar',
    'logotip',
    'digital products Uzbekistan',
  ],
  authors: [{ name: 'MaxSeller' }],
  creator: 'MaxSeller',
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: '/',
    siteName: 'MaxSeller',
    title: 'MaxSeller — Raqamli mahsulotlar bir joyda!',
    description:
      'Raqamli mahsulotlarni tanlang, xavfsiz to\'lang va darhol yuklab oling. Veb, dizayn, ta\'lim va dasturlash mahsulotlari.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MaxSeller — Raqamli mahsulotlar bir joyda!',
    description: 'Premium raqamli mahsulotlar marketplacelari.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <Header />
          <main className="min-h-[50vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
