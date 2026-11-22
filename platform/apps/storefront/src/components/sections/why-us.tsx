import { BadgeCheck, Download, Headphones, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { SectionHeader } from '@/components/common/section-header'

const reasons = [
  {
    icon: Sparkles,
    title: 'Keng tanlov',
    text: 'Veb, dizayn, ta\'lim, dasturlash va boshqa sohalarga oid yuzlab raqamli mahsulotlar.',
  },
  {
    icon: ShieldCheck,
    title: 'Xavfsiz xarid',
    text: 'Har bir to\'lov admin tomonidan tekshiriladi. Hech qanday shubhali o\'tkazmalar yo\'q.',
  },
  {
    icon: Download,
    title: 'Tez yuklash',
    text: 'To\'lov tasdiqlangach, fayllaringiz shaxsiy kabinetingizda darhol paydo bo\'ladi.',
  },
  {
    icon: Wallet,
    title: 'Qulay to\'lov',
    text: 'Karta yoki bank o\'tkazmasi orqali to\'lab, chekni yuklang — tayyor.',
  },
  {
    icon: Headphones,
    title: 'Yordam doim yonida',
    text: 'Savollaringizga Telegram kanalimiz va kontakt sahifamiz orqali javob beramiz.',
  },
  {
    icon: BadgeCheck,
    title: 'Sifat kafolati',
    text: 'Barcha mahsulotlar oldindan ko\'rib chiqiladi va faqat haqiqiy fayllar taqdim etiladi.',
  },
]

export function WhyUs() {
  return (
    <section className="border-y border-white/10 bg-surface/40 py-16">
      <div className="container-page">
        <SectionHeader
          eyebrow="Nega biz?"
          title="MaxSeller tanlashning sababi"
          description="Biz raqamli mahsulot xaridini oddiy, xavfsiz va tez qilish uchun yaratilganmiz."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason, index) => (
            <div
              key={reason.title}
              className="group rounded-2xl border border-white/10 bg-card/70 p-6 transition hover:border-emerald/40 hover:shadow-glow"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald/10 text-emerald transition group-hover:bg-emerald group-hover:text-black">
                  <reason.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-2xl font-extrabold text-white/10 transition group-hover:text-emerald/25">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-base font-bold">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{reason.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
