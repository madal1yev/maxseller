import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: {
    default: 'MaxSeller Admin',
    template: '%s | MaxSeller Admin',
  },
  description: 'MaxSeller raqamli mahsulotlar do\'koni boshqaruv paneli',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
