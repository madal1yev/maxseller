import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-brand-500/25 bg-brand-500/10">
          <Compass className="h-5 w-5 text-brand-400" />
        </div>
        <h2 className="font-display text-lg font-semibold text-white">Sahifa topilmadi</h2>
        <p className="mt-2 text-sm text-[#8ba397]">
          Siz izlayotgan sahifa mavjud emas yoki o\'chirilgan bo\'lishi mumkin.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Bosh sahifaga qaytish</Link>
        </Button>
      </div>
    </div>
  )
}
