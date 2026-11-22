'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BadgeCheck, Layers3, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getProducts, getPublicSettings, queryKeys } from '@/lib/api-queries'

export function Hero() {
  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: getPublicSettings,
  })
  const { data: products } = useQuery({
    queryKey: queryKeys.products({ limit: 1 }),
    queryFn: () => getProducts({ limit: 1 }),
  })

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow bg-[size:100%_100%,56px_56px,56px_56px] opacity-80" />
      <div className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald/10 blur-[100px] animate-pulse-glow" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-emerald-dark/10 blur-[110px] animate-pulse-glow" />

      <div className="container-page relative grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
        <div className="animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/10 px-4 py-1.5 text-xs font-bold text-emerald">
            <Sparkles className="h-3.5 w-3.5" />
            Raqamli mahsulotlar bozori
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
            {settings?.slogan || 'Raqamli mahsulotlar bir joyda!'}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Veb-saytlar, dizayn shablonlari, logotiplar, o'quv materiallari va dasturlash
            resurslari — barchasi bitta platformada. Tanlang, to'lang va darhol yuklab oling.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/products">
                Mahsulotlarni ko'rish <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/categories">Kategoriyalarni ko'rish</Link>
            </Button>
          </div>

          <div className="mt-12 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-7">
            <div>
              <p className="font-display text-2xl font-extrabold text-emerald">
                {products ? products.total : <Skeleton className="inline-block h-7 w-12 align-middle" />}
              </p>
              <p className="mt-1 text-xs text-muted">mahsulot</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-emerald">24/7</p>
              <p className="mt-1 text-xs text-muted">onlayn xarid</p>
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-emerald">100%</p>
              <p className="mt-1 text-xs text-muted">raqamli yetkazish</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]">
          <div className="absolute inset-0 rotate-3 rounded-[2.5rem] border border-emerald/20 bg-emerald/[0.04]" />
          <div className="relative rounded-[2.5rem] border border-white/10 bg-card/80 p-6 shadow-glow-lg backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald text-black">
                  <Zap className="h-5 w-5 fill-black" />
                </span>
                <div>
                  <p className="font-display text-sm font-extrabold">MaxSeller</p>
                  <p className="text-[10px] text-muted">Premium marketplace</p>
                </div>
              </div>
              <BadgeCheck className="h-5 w-5 text-emerald" />
            </div>

            <div className="space-y-3">
              {[
                { icon: Layers3, title: 'Keng katalog', text: '8+ kategoriya, yuzlab mahsulot' },
                { icon: ShieldCheck, title: 'Xavfsiz to\'lov', text: 'To\'lov admin tomonidan tasdiqlanadi' },
                { icon: Zap, title: 'Darhol yuklash', text: 'Tasdiqlangandan keyin fayl tayyor' },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald">
                    <feature.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{feature.title}</p>
                    <p className="text-xs text-muted">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald/20 bg-emerald/[0.06] p-4">
              <p className="text-xs font-semibold text-emerald">MaxSeller — ishonchli tanlov</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Har bir xarid individual yondashuv va kafolatlangan yuklash bilan ta'minlanadi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
