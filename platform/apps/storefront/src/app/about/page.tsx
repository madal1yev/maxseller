import type { Metadata } from 'next'
import { BadgeCheck, HeartHandshake, Rocket, ShieldCheck } from 'lucide-react'
import { PageHero } from '@/components/common/page-hero'
import { ProseBlock, ProseSection } from '@/components/common/prose-block'

export const metadata: Metadata = {
  title: 'Biz haqimizda',
  description: 'MaxSeller — raqamli mahsulotlar bir joyda. Platformamiz missiyasi va qadriyatlari.',
}

const values = [
  {
    icon: ShieldCheck,
    title: 'Ishonchlilik',
    text: 'Har bir mahsulot va to\'lov oldindan tekshiriladi. Mijozlarimiz pullari uchun xavotir olmaydi.',
  },
  {
    icon: Rocket,
    title: 'Tezlik',
    text: 'To\'lov tasdiqlangach, fayllar darhol shaxsiy kabinetingizda paydo bo\'ladi.',
  },
  {
    icon: HeartHandshake,
    title: 'Yordam',
    text: 'Har bir xaridga individual yondashamiz va savollarga tez javob beramiz.',
  },
  {
    icon: BadgeCheck,
    title: 'Sifat',
    text: 'Faqat tayyor, ishlaydigan va foydali raqamli mahsulotlarni katalogga qo\'shamiz.',
  },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Kompaniya"
        title="MaxSeller — raqamli mahsulotlar bir joyda!"
        description="Biz ijodkorlar va xaridorlarni birlashtiradigan zamonaviy raqamli marketplace qurmoqdamiz."
      />
      <ProseBlock>
        <ProseSection title="Biz kimmiz?">
          <p>
            MaxSeller — O'zbekiston bozori uchun yaratilgan raqamli mahsulotlar platformasi. Biz
            veb-sayt va landing page shablonlari, dizayn materiallari, logotiplar, o'quv
            materiallari, ilmiy ishlar, video kurslar va dasturlash resurslarini bitta joyda
            to'pladik.
          </p>
          <p>
            Maqsadimiz oddiy: sifatli raqamli mahsulot topish, xarid qilish va yuklab olish
            jarayonini iloji boricha oson va shaffof qilish. Buning uchun biz to'lovlarni qo'lda
            tekshiramiz, mahsulotlarni oldindan ko'rib chiqamiz va har bir mijozga e'tibor
            qaratamiz.
          </p>
        </ProseSection>

        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-white/10 bg-card/70 p-5">
              <value.icon className="mb-4 h-6 w-6 text-emerald" />
              <h3 className="mb-2 text-base font-bold">{value.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{value.text}</p>
            </div>
          ))}
        </div>

        <ProseSection title="Qanday ishlaymiz?">
          <ul>
            <li>Katalogdan o'zingizga kerakli mahsulotni tanlaysiz.</li>
            <li>Buyurtma berib, ko'rsatilgan to'lov usuli orqali to'laysiz.</li>
            <li>To'lov chekini yuklaysiz — u admin tomonidan tekshiriladi.</li>
            <li>Tasdiqlangach, fayl "Yuklamalarim" bo'limida paydo bo'ladi.</li>
          </ul>
        </ProseSection>

        <ProseSection title="Biz bilan bog'lanish">
          <p>
            Savol, taklif yoki hamkorlik uchun <strong>Kontakt</strong> sahifasidan foydalaning
            yoki Telegram kanalimizga yozing. Jamoamiz sizga yordam berishdan xursand bo'ladi.
          </p>
        </ProseSection>
      </ProseBlock>
    </>
  )
}
