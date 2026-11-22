import Link from 'next/link'
import { ArrowLeft, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[65vh] flex-col items-center justify-center text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/10 blur-[100px]" />
      <div className="relative">
        <Compass className="mx-auto mb-6 h-14 w-14 text-emerald" />
        <p className="font-display text-7xl font-extrabold text-gradient sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Sahifa topilmadi</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Siz qidirayotgan sahifa o'chirilgan yoki mavjud emas. Bosh sahifaga qaytib, mahsulotlarni
          ko'rib chiqing.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Bosh sahifaga
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/products">Mahsulotlar katalogi</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
