import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { CATEGORY_SEED } from '../packages/shared/src/index.ts'

const prisma = new PrismaClient()

const LEGACY_PRODUCTS = [
  { title: 'Biznes landing page', cat: 'veb-saytlar', desc: 'Tayyor HTML/CSS/JS landing. Mobilga moslashgan, tez yuklanadi, matnlarni o\'zgartirish oson.', price: 150000, tag: 'Hit' },
  { title: 'Onlayn do\'kon shabloni', cat: 'veb-saytlar', desc: 'Katalog, savat va Telegram orqali buyurtma qabul qilish bilan tayyor do\'kon sayti.', price: 350000, tag: 'Yangi' },
  { title: 'Portfolio sayt', cat: 'veb-saytlar', desc: 'Dasturchi va dizaynerlar uchun shaxsiy portfolio. Qorong\'i va yorug\' rejim.', price: 120000, tag: '' },
  { title: 'Instagram post shablonlari', cat: 'dizayn', desc: '30 ta tahrirlanadigan post va story shabloni. Figma va Canva uchun.', price: 60000, tag: 'Hit' },
  { title: 'Logotip va brend to\'plami', cat: 'logotip', desc: 'Logotip, ranglar, shriftlar va vizitka maketlari bitta to\'plamda.', price: 99000, tag: '' },
  { title: 'UI Kit: mobil ilova', cat: 'dizayn', desc: '120+ ekran va komponentlar. Figma fayli, tayyor Auto Layout.', price: 180000, tag: 'Yangi' },
  { title: 'Referat va taqdimot to\'plami', cat: 'ilmiy-ishlar', desc: 'Tayyor tuzilma, andoza va namunalar. O\'zingizning mavzuingizga moslab oling.', price: 40000, tag: '' },
  { title: 'Kurs ishi andozalari', cat: 'ilmiy-ishlar', desc: 'Titul varaq, mundarija, adabiyotlar ro\'yxati — GOST bo\'yicha formatlangan Word fayllar.', price: 35000, tag: '' },
  { title: 'Ilmiy maqola yozish qo\'llanmasi', cat: 'ouv-materiallari', desc: 'Maqolani boshidan oxirigacha yozish, rasmiylashtirish va jurnalga topshirish bo\'yicha PDF.', price: 55000, tag: '' },
  { title: 'Noldan veb-dasturlash', cat: 'video-kurslar', desc: 'HTML, CSS va JavaScript bo\'yicha amaliy video darslar, har dars uchun kod fayllari bilan.', price: 200000, tag: 'Hit' },
  { title: 'Figma darslari', cat: 'video-kurslar', desc: 'Interfeys dizaynini noldan o\'rganish: komponentlar, grid, prototip.', price: 140000, tag: '' },
  { title: 'Telegram bot yaratish', cat: 'dasturlash', desc: 'Bot yaratish va serverga joylash bo\'yicha video kurs va tayyor kodlar.', price: 0, tag: 'Yangi' },
]

const FAQ = [
  { question: 'Fayl qaysi formatda beriladi?', answer: 'Veb-saytlar va shablonlar ZIP, Figma yoki Canva havolasi ko\'rinishida, ilmiy materiallar Word va PDF, darslar esa video fayl yoki yopiq kanal havolasi sifatida beriladi.', sortOrder: 1 },
  { question: 'To\'lovni qanday qilaman?', answer: 'Buyurtma sahifasida ko\'rsatilgan karta yoki to\'lov tizimiga o\'tkazma qiling, so\'ng chek (JPG/PNG/PDF) yuklang. Admin haqiqiy tushumni tekshirib tasdiqlagach fayl ochiladi.', sortOrder: 2 },
  { question: 'Necha vaqt ichida faylni olaman?', answer: 'Admin to\'lovni tasdiqlagach fayl darhol "Mening xaridlarim" bo\'limida paydo bo\'ladi. Tekshiruv odatda ish vaqtida bir necha daqiqa davom etadi.', sortOrder: 3 },
  { question: 'Shablonni o\'zgartirsam bo\'ladimi?', answer: 'Ha. Barcha fayllar tahrirlanadigan holatda beriladi, o\'z loyihangizda erkin ishlatishingiz mumkin.', sortOrder: 4 },
  { question: 'Katalogda kerakli narsa yo\'q. Nima qilaman?', answer: 'Telegram kanalga yozing yoki Contact sahifasidan murojaat qiling. Buyurtma asosida tayyorlab beramiz.', sortOrder: 5 },
]

function slug(title: string) {
  return title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180)
}

async function main() {
  console.log('🌱 Seed boshlandi (idempotent)')

  for (const name of ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']) {
    await prisma.role.upsert({
      where: { name },
      create: { name, description: `${name} roli` },
      update: {},
    })
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@maxseller.uz').toLowerCase()
  const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } })
  const superRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })

  await prisma.admin.upsert({
    where: { email: adminEmail },
    create: {
      name: process.env.ADMIN_NAME || 'MaxSeller Admin',
      email: adminEmail,
      passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 10),
      role: 'SUPER_ADMIN',
      roleId: superRole?.id || null,
    },
    update: {},
  })

  await prisma.user.upsert({
    where: { email: 'demo@maxseller.uz' },
    create: {
      name: 'Demo Mijoz',
      email: 'demo@maxseller.uz',
      passwordHash: bcrypt.hashSync('Demo123!', 10),
      role: 'CUSTOMER',
      roleId: customerRole?.id || null,
    },
    update: {},
  })

  for (const cat of CATEGORY_SEED) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name, nameUz: cat.nameUz, slug: cat.slug,
        description: '', icon: cat.icon, sortOrder: cat.sortOrder, isActive: true,
      },
      update: { name: cat.name, nameUz: cat.nameUz, icon: cat.icon, sortOrder: cat.sortOrder },
    })
  }

  for (const product of LEGACY_PRODUCTS) {
    const category = await prisma.category.findUnique({ where: { slug: product.cat } })
    if (!category) continue
    const productSlug = slug(product.title)
    await prisma.product.upsert({
      where: { slug: productSlug },
      create: {
        title: product.title,
        slug: productSlug,
        shortDescription: product.desc.slice(0, 220),
        description: product.desc,
        price: product.price,
        oldPrice: 0,
        categoryId: category.id,
        status: 'PUBLISHED',
        featured: product.tag === 'Hit',
        bestSeller: product.tag === 'Hit',
        features: ['Tayyor fayl', 'Tahrir qilish mumkin', 'Tezkor yetkazib berish'],
        requirements: 'ZIP arxivi. Faylni ochish uchun standart arxivator yetarli.',
        compatibility: 'Veb-saytlar: barcha zamonaviy brauzerlar. Shablonlar: Figma, Canva.',
      },
      update: {
        title: product.title,
        shortDescription: product.desc.slice(0, 220),
        description: product.desc,
        price: product.price,
        categoryId: category.id,
        status: 'PUBLISHED',
      },
    })
  }

  await prisma.paymentMethod.upsert({
    where: { code: 'bank_card' },
    create: {
      name: 'Bank kartasiga o\'tkazma',
      code: 'bank_card',
      instructions: 'To\'lovni admin ko\'rsatgan karta raqamiga qiling. So\'ng chek (JPG, PNG yoki PDF) yuklang. Admin haqiqiy tushumni tekshirib tasdiqlaydi. Chek yuklashning o\'zi to\'lov tasdiqlanishini anglatmaydi.',
      recipientDetails: 'Karta ma\'lumotlarini admin panel → To\'lov usullari bo\'limida sozlang.',
      isActive: true,
      sortOrder: 1,
    },
    update: {},
  })

  for (const faq of FAQ) {
    const existing = await prisma.faq.findFirst({ where: { question: faq.question } })
    if (!existing) await prisma.faq.create({ data: faq })
  }

  await prisma.storeSetting.upsert({
    where: { key: 'site' },
    create: {
      key: 'site',
      value: JSON.stringify({
        siteName: 'MaxSeller',
        slogan: 'Raqamli mahsulotlar bir joyda!',
        telegramChannel: 'maxseller_uz',
        instagram: 'maxseller_uz',
        email: 'info@maxseller.uz',
        phone: '+998 90 000 00 00',
        aboutText: 'MaxSeller — tayyor raqamli loyihalar, dizayn shablonlari, o\'quv va ilmiy materiallar do\'koni. Biz sifat, qulaylik va zamonaviylikka ishonamiz.',
        footerText: 'Raqamli mahsulotlar do\'koni. Sifat, qulaylik, zamonaviylik.',
        currency: 'so\'m',
      }),
    },
    update: {},
  })

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    admin: await prisma.admin.count(),
    customers: await prisma.user.count(),
  }
  console.log('✅ Seed tugadi:', counts)
}

main()
  .catch((err) => { console.error('❌ Seed xatosi:', err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
