import type { Metadata } from 'next'
import { PageHero } from '@/components/common/page-hero'
import { ProseBlock, ProseSection } from '@/components/common/prose-block'

export const metadata: Metadata = {
  title: 'Foydalanish shartlari',
  description: 'MaxSeller platformasidan foydalanish qoidalari va shartlari.',
}

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Huquqiy" title="Foydalanish shartlari" description="Platformadan foydalanishdan oldin o'qing." />
      <ProseBlock>
        <p className="text-xs text-muted">Oxirgi yangilanish: 2026-yil</p>
        <ProseSection title="1. Umumiy">
          <p>
            MaxSeller veb-saytiga kirish va undan foydalanish orqali siz ushbu shartlarga rozi
            bo'lasiz. Agar shartlarga rozi bo'lmasangiz, platformadan foydalanishni to'xtating.
          </p>
        </ProseSection>
        <ProseSection title="2. Akkaunt">
          <ul>
            <li>Ro'yxatdan o'tishda to'g'ri ma'lumotlarni kiritishingiz shart.</li>
            <li>Parolingizni uchinchi shaxslarga bermang; akkauntingiz xavfsizligi sizning javobgarligingiz.</li>
            <li>Bir foydalanuvchi faqat bitta akkaunt ro'yxatdan o'tkazishi tavsiya etiladi.</li>
          </ul>
        </ProseSection>
        <ProseSection title="3. Mahsulotlar va buyurtmalar">
          <p>
            Katalogdagi mahsulotlar tavsifi, narxi va mavjudligi o'zgarishi mumkin. Buyurtma
            yaratish orqali siz tanlangan mahsulot va narx bilan tanishib chiqqan hisoblanasiz.
            Mahsulotlar faqat shaxsiy foydalanish uchun mo'ljallangan; ularni qayta sotish yoki
            tarqatish taqiqlanadi.
          </p>
        </ProseSection>
        <ProseSection title="4. To'lov va fayllarga kirish">
          <ul>
            <li>To'lov chekini yuklash buyurtmani to'langan deb hisoblamaydi.</li>
            <li>Faqat ma'mur tomonidan tasdiqlangach, fayllarga kirish ochiladi.</li>
            <li>Noto'g'ri yoki soxta chek yuborish buyurtmaning rad etilishiga va akkauntning bloklanishiga olib kelishi mumkin.</li>
          </ul>
        </ProseSection>
        <ProseSection title="5. Intellektual mulk">
          <p>
            Mahsulotlardagi materiallarga bo'lgan huquqlar mualliflarga tegishli. Sotib olingan
            fayllardan faqat shaxsiy maqsadlarda foydalanishga ruxsat beriladi. MaxSeller brendi
            va dizayni himoyalangan.
          </p>
        </ProseSection>
        <ProseSection title="6. Javobgarlik">
          <p>
            MaxSeller xizmat ko'rsatishni vaqtincha to'xtatish, narxlarni o'zgartirish yoki
            shartlarni yangilash huquqiga ega. O'zgarishlar ushbu sahifada e'lon qilinadi.
          </p>
        </ProseSection>
        <ProseSection title="7. Bog'lanish">
          <p>
            Shartlar bo'yicha savollar uchun <strong>Kontakt</strong> sahifasidan foydalaning.
          </p>
        </ProseSection>
      </ProseBlock>
    </>
  )
}
