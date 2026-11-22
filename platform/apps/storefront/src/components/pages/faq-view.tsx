'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { getFaq, queryKeys } from '@/lib/api-queries'
import { cn } from '@/lib/utils'

const fallbackFaq = [
  {
    id: 'static-1',
    question: 'Mahsulotni qanday xarid qilaman?',
    answer:
      'Mahsulot sahifasida "Savatga qo\'shish" tugmasini bosing, so\'ng savatdan "Buyurtma berish" orqali buyurtma yaratng. Buyurtma yaratilgach, to\'lov ko\'rsatmalari ko\'rsatiladi.',
  },
  {
    id: 'static-2',
    question: 'Qanday to\'lov usullari mavjud?',
    answer:
      'Buyurtma sahifasida faol to\'lov usullari ko\'rsatiladi. Odatda karta yoki bank o\'tkazmasi orqali to\'lab, chek (receipt) yuklashingiz kerak.',
  },
  {
    id: 'static-3',
    question: 'Chek yuklagach, faylni darhol olamanmi?',
    answer:
      'Yo\'q. Chek yuklash to\'lovni avtomatik tasdiqlamaydi. Ma\'mur to\'lovni tekshirib tasdiqlagach, fayl "Yuklamalarim" bo\'limida paydo bo\'ladi.',
  },
  {
    id: 'static-4',
    question: 'Faylni qayerdan yuklab olishim mumkin?',
    answer:
      'To\'lov tasdiqlangach, "Yuklamalarim" bo\'limiga yoki buyurtma tafsilotlari sahifasiga kiring va "Yuklab olish" tugmasini bosing.',
  },
  {
    id: 'static-5',
    question: 'To\'lov rad etilsa nima qilishim kerak?',
    answer:
      'Buyurtma holatida rad etish sababi ko\'rsatiladi. Yangi chek yuborish yoki yordam olish uchun Telegram kanalimiz orqali ma\'murga murojaat qiling.',
  },
  {
    id: 'static-6',
    question: 'Sevimlilar ro\'yxatiga qanday qo\'shish mumkin?',
    answer:
      'Mahsulot kartasidagi yurak belgisini bosing. Bu uchun tizimga kirgan bo\'lishingiz kerak. Saqlangan mahsulotlar "Sevimlilarim" sahifasida ko\'rinadi.',
  },
]

export function FaqView() {
  const { data } = useQuery({ queryKey: queryKeys.faq, queryFn: getFaq })
  const [openId, setOpenId] = React.useState<string | null>(fallbackFaq[0].id)
  const items = data && data.length > 0 ? data : fallbackFaq

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl space-y-3">
        {items.map((item) => {
          const expanded = openId === item.id
          return (
            <div
              key={item.id}
              className={cn(
                'overflow-hidden rounded-2xl border border-white/10 bg-card/70 transition',
                expanded && 'border-emerald/40 shadow-glow',
              )}
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : item.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
              >
                <span className="text-sm font-bold sm:text-base">{item.question}</span>
                <ChevronDown className={cn('h-5 w-5 shrink-0 text-emerald transition-transform', expanded && 'rotate-180')} />
              </button>
              {expanded ? (
                <div className="border-t border-white/10 px-5 py-5 text-sm leading-relaxed text-muted">
                  {item.answer}
                </div>
              ) : null}
            </div>
          )
        })}
        <p className="pt-4 text-center text-sm text-muted">
          Savolingizga javob topmadinizmi?{' '}
          <Link href="/contact" className="font-bold text-emerald hover:underline">Bizga yozing</Link>
        </p>
      </div>
    </div>
  )
}
