// Dastlabki ma'lumotlar. server/data/db.json yo'q bo'lsa, shu fayldan yaratiladi.
const now = '2026-01-01T09:00:00.000Z'

const products = [
  ['Biznes landing page', 'web', 'Tayyor HTML/CSS/JS landing. Mobilga moslashgan, tez yuklanadi, matnlarni o\'zgartirish oson.', 150000, 'Hit', 34],
  ['Onlayn do\'kon shabloni', 'web', 'Katalog, savat va saytda buyurtma qabul qilish bilan tayyor do\'kon sayti.', 350000, 'Yangi', 21],
  ['Portfolio sayt', 'web', 'Dasturchi va dizaynerlar uchun shaxsiy portfolio. Qorong\'i va yorug\' rejim.', 120000, '', 12],
  ['Instagram post shablonlari', 'design', '30 ta tahrirlanadigan post va story shabloni. Figma va Canva uchun.', 60000, 'Hit', 48],
  ['Logotip va brend to\'plami', 'design', 'Logotip, ranglar, shriftlar va vizitka maketlari bitta to\'plamda.', 99000, '', 19],
  ['UI Kit: mobil ilova', 'design', '120+ ekran va komponentlar. Figma fayli, tayyor Auto Layout.', 180000, 'Yangi', 15],
  ['Referat va taqdimot to\'plami', 'docs', 'Tayyor tuzilma, andoza va namunalar. O\'zingizning mavzuingizga moslab oling.', 40000, '', 27],
  ['Kurs ishi andozalari', 'docs', 'Titul varaq, mundarija, adabiyotlar ro\'yxati — GOST bo\'yicha formatlangan Word fayllar.', 35000, '', 23],
  ['Ilmiy maqola yozish qo\'llanmasi', 'docs', 'Maqolani boshidan oxirigacha yozish, rasmiylashtirish va jurnalga topshirish bo\'yicha PDF.', 55000, '', 9],
  ['Noldan veb-dasturlash', 'video', 'HTML, CSS va JavaScript bo\'yicha amaliy video darslar, har dars uchun kod fayllari bilan.', 200000, 'Hit', 41],
  ['Figma darslari', 'video', 'Interfeys dizaynini noldan o\'rganish: komponentlar, grid, prototip.', 140000, '', 18],
  ['Telegram bot yaratish', 'video', 'Bot yaratish va serverga joylash bo\'yicha video kurs va tayyor kodlar.', 0, 'Yangi', 30],
]

export default {
  products: products.map(([title, cat, desc, price, tag, orders], i) => ({
    id: String(i + 1),
    title,
    cat,
    desc,
    price,
    oldPrice: 0,
    tag,
    image: `/images/cover-${String(i + 1).padStart(2, '0')}.svg`,
    active: true,
    orders,
    createdAt: now,
    updatedAt: now,
  })),
  settings: {
    telegramChannel: 'maxseller_uz',
    instagram: 'maxseller_uz',
    currency: 'so\'m',
    heroAccent: 'bir joyda!',
    heroLead: 'Veb-saytlar, premium dizayn shablonlar, tayyor ilmiy materiallar va video darsliklar. Tanlang, savatga qo\'shing va saytda buyurtma bering.',
    catalogText: 'Barcha mahsulotlar tayyor fayl ko\'rinishida beriladi. Savatga qo\'shing yoki hozir xarid qiling.',
    finalTitle: 'Kanalga qo\'shiling',
    finalText: 'Yangi mahsulotlar va chegirmalar birinchi bo\'lib Telegram kanalda e\'lon qilinadi.',
    adminPassword: 'admin123',
  },
}
