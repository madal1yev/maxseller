export * from '@maxseller/types'
export * from '@maxseller/validation'

export const CATEGORY_SEED = [
  { name: 'Websites & Landing Pages', nameUz: 'Veb-saytlar va Landing Page', slug: 'veb-saytlar', icon: 'globe', sortOrder: 1 },
  { name: 'Design Templates', nameUz: 'Dizayn shablonlari', slug: 'dizayn', icon: 'palette', sortOrder: 2 },
  { name: 'Logos & Branding', nameUz: 'Logotip va brending', slug: 'logotip', icon: 'badge', sortOrder: 3 },
  { name: 'Educational Materials', nameUz: 'O\'quv materiallari', slug: 'ouv-materiallari', icon: 'book', sortOrder: 4 },
  { name: 'Scientific Works & Documents', nameUz: 'Ilmiy ishlar va hujjatlar', slug: 'ilmiy-ishlar', icon: 'file', sortOrder: 5 },
  { name: 'Video Courses & Tutorials', nameUz: 'Video kurslar va darsliklar', slug: 'video-kurslar', icon: 'video', sortOrder: 6 },
  { name: 'Programming Resources', nameUz: 'Dasturlash resurslari', slug: 'dasturlash', icon: 'code', sortOrder: 7 },
  { name: 'Other Digital Products', nameUz: 'Boshqa raqamli mahsulotlar', slug: 'boshqa', icon: 'box', sortOrder: 8 },
] as const

export function formatMoney(value: number, currency = 'so\'m'): string {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${currency}`
}

export function formatDate(value: string | Date, locale = 'uz-UZ'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export const ORDER_STATUS_MSG: Record<string, string> = {
  PENDING_PAYMENT: 'To\'lov kutilmoqda.',
  RECEIPT_SUBMITTED: 'Chekingiz yuborildi, tekshirishga topshirildi.',
  PAYMENT_REVIEW: 'To\'lovingiz tekshirilmoqda. Iltimos, admin tasdiqlashini kuting.',
  PAID: 'To\'lov tasdiqlandi. Loyihangizni yuklab olishingiz mumkin.',
  COMPLETED: 'Buyurtma bajarildi. Faylni yuklab olishingiz mumkin.',
  REJECTED: 'To\'lov tasdiqlanmadi.',
  CANCELLED: 'Buyurtma bekor qilindi.',
  REFUNDED: 'To\'lov qaytarildi.',
}
