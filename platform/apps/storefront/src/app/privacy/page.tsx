import type { Metadata } from 'next'
import { PageHero } from '@/components/common/page-hero'
import { ProseBlock, ProseSection } from '@/components/common/prose-block'

export const metadata: Metadata = {
  title: 'Maxfiylik siyosati',
  description: 'MaxSeller foydalanuvchi ma\'lumotlarini qanday yig\'adi, saqlaydi va himoya qiladi.',
}

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Huquqiy" title="Maxfiylik siyosati" description="Ma'lumotlaringiz biz uchun muhim." />
      <ProseBlock>
        <p className="text-xs text-muted">Oxirgi yangilanish: 2026-yil</p>
        <ProseSection title="1. Umumiy qoidalar">
          <p>
            MaxSeller saytidan foydalanish orqali siz ushbu maxfiylik siyosati bilan tanishib,
            uni qabul qilgan hisoblanasiz. Biz faqat xizmat ko'rsatish uchun zarur bo'lgan
            ma'lumotlarni yig'amiz va ularni uchinchi shaxslarga sotmaymiz.
          </p>
        </ProseSection>
        <ProseSection title="2. Yig'iladigan ma'lumotlar">
          <ul>
            <li>Ro'yxatdan o'tishda: ism, email, telefon raqami (ixtiyoriy) va parol (shifrlangan holatda saqlanadi).</li>
            <li>Buyurtma berishda: tanlangan mahsulotlar, to'lov cheki va siz qoldirgan izoh.</li>
            <li>Texnik ma'lumotlar: sahifa ko'rishlar, brauzer turi va qurilma ma'lumotlari (statistika uchun).</li>
          </ul>
        </ProseSection>
        <ProseSection title="3. Ma'lumotlardan foydalanish">
          <p>
            Ma'lumotlar buyurtmalarni qayta ishlash, to'lovlarni tasdiqlash, sotib olingan
            fayllarga kirishni ta'minlash va mijozlarga yordam ko'rsatish uchun ishlatiladi.
          </p>
        </ProseSection>
        <ProseSection title="4. Saqlash va himoya">
          <p>
            Ma'lumotlar himoyalangan serverlarda saqlanadi. Parollar hech qachon ochiq ko'rinishda
            saqlanmaydi. To'lov cheklari faqat ma'muriyat tomonidan ko'rib chiqiladi va sizning
            buyurtmangiz bilan bog'lanadi. Fayllarning ichki saqlash yo'llari mijozga ko'rsatilmaydi.
          </p>
        </ProseSection>
        <ProseSection title="5. Foydalanuvchi huquqlari">
          <ul>
            <li>Profil ma'lumotlarini istalgan vaqtda ko'rish va tahrirlash.</li>
            <li>Buyurtmalar tarixi va yuklamalarga kirish.</li>
            <li>Ma'lumotlarni o'chirish yoki tuzatish talabi bilan bizga murojaat qilish.</li>
          </ul>
        </ProseSection>
        <ProseSection title="6. Bog'lanish">
          <p>
            Maxfiylik bo'yicha savollaringiz bo'lsa, <strong>Kontakt</strong> sahifasi orqali
            yozing yoki Telegram kanalimizga murojaat qiling.
          </p>
        </ProseSection>
      </ProseBlock>
    </>
  )
}
