import type { Metadata } from 'next'
import { PageHero } from '@/components/common/page-hero'
import { ProseBlock, ProseSection } from '@/components/common/prose-block'

export const metadata: Metadata = {
  title: 'Pulni qaytarish',
  description: "MaxSeller buyurtmalari bo'yicha pul qaytarish siyosati va tartibi.",
}

export default function RefundPage() {
  return (
    <>
      <PageHero
        eyebrow="Yordam"
        title="Pulni qaytarish siyosati"
        description="Raqamli mahsulotlar xaridi bo'yicha qaytarish shartlari va tartibi."
      />
      <ProseBlock>
        <ProseSection title="1. Umumiy qoida">
          <p>
            Raqamli mahsulotlar o'ziga xos xususiyatga ega: fayl bir marta yuklab olinsa, uni
            qaytarib olish imkoni yo'q. Shuning uchun qaytarish arizasi faqat texnik muammo,
            noto'g'ri mahsulot yoki ikki barobar to'lov holatlarida ko'rib chiqiladi.
          </p>
        </ProseSection>
        <ProseSection title="2. Qaytarish talab qilish shartlari">
          <ul>
            <li>Mahsulot sotib olingan, ammo fayl yuklab olinmagan va texnik xatolik mavjud.</li>
            <li>Buyurtmaga noto'g'ri mahsulot qo'shilganligi ma'mur tomonidan tasdiqlangan.</li>
            <li>Bir xarid uchun ikki marta to'lov amalga oshirilganligi aniqlangan.</li>
            <li>Ariza to'lov tasdiqlangan kundan boshlab 7 kun ichida yuborilgan.</li>
          </ul>
        </ProseSection>
        <ProseSection title="3. Ariza berish tartibi">
          <ul>
            <li>"Mening xaridlarim" bo'limidan tegishli buyurtmani tanlang.</li>
            <li>Buyurtma raqamini ko'rsatib, <strong>Kontakt</strong> sahifasi yoki Telegram kanal orqali ma'murga yozing.</li>
            <li>Sababni va, agar mavjud bo'lsa, ekran tasvirini ilova qiling.</li>
            <li>Ma'mur arizani ko'rib chiqadi va qarorini xabar qiladi.</li>
          </ul>
        </ProseSection>
        <ProseSection title="4. Qaytarish usuli va muddati">
          <p>
            Tasdiqlangan arizalar bo'yicha pul to'lov amalga oshirilgan karta yoki hisobga
            qaytariladi. Odatda qaytarish 3—10 ish kuni ichida amalga oshiriladi. O'zaro kelishuv
            asosida boshqa mahsulotga almashtirish ham mumkin.
          </p>
        </ProseSection>
        <ProseSection title="5. Rad etish holatlari">
          <ul>
            <li>Fayl allaqachon yuklab olingan va mahsulot tavsifga mos keladi.</li>
            <li>Mijoz shaxsiy xohishi bilan fikrini o'zgartirgan.</li>
            <li>Noto'g'ri chek yuborilganligi sababli buyurtma rad etilgan.</li>
          </ul>
        </ProseSection>
      </ProseBlock>
    </>
  )
}
