# MaxSeller — audit va amalga oshirish rejasi

## 1. Audit natijasi (boshlang'ich holat)

| Narsa | Topilgan holat | Muammo |
| --- | --- | --- |
| Eski landing | `index.html`, `style.css`, `script.js`, `products.js` | Mahsulotlar JS massivida, backend yo'q |
| Vite ilova (oldingi bosqich) | `maxseller-app/` | Bitta JSON fayl (`db.json`), ikkita sahifa bitta Vite build; buyurtma, to'lov, fayl yetkazib berish yo'q |
| Backend | `maxseller-app/server/index.js` (Express, JSON) | PostgreSQL emas, autentifikatsiya yo'q, buyurtma yo'q |
| Docker / psql / git CLI | muhitda yo'q | Lokal PostgreSQL ishga tushirib bo'lmaydi |
| PGlite | ishlaydi (Postgres 18.6 WASM + wire socket) | Real integration testlar uchun ishlatiladi |

### Asosiy sabab
Oldingi tizimda ikkala frontend bitta JSON faylni o'qigan, lekin buyurtma/to'lov/fayl modellari umuman yo'q edi. "Do'konda bor, adminda yo'q" farqi shu sababdan kelib chiqqan: mahsulotlar manbai sifatida `products.js` va `db.json` bir vaqtda mavjud edi.

## 2. Maqsadli arxitektura
Bitta Express API + bitta PostgreSQL (Prisma) + ikkita mustaqil Next.js frontend. Barcha yozish/o'qish faqat API orqali.

## 3. Bosqichlar
1. Monorepo, shared types/validation, Prisma schema va migration ✅
2. API: auth, katalog, buyurtma, chek yuklash, admin tasdiqlash, himoyalangan ZIP download ✅
3. Storefront: barcha mijoz sahifalari ✅
4. Admin: dashboard, mahsulot, buyurtma, to'lov, kategoriya, mijoz, sozlamalar ✅
5. Seed: eski 12 mahsulot + 8 kategoriya yo'qotmasdan migratsiya ✅
6. Test: PGlite ustida real integration testlar ✅
7. Docker, docs, deployment konfiguratsiyasi ✅

## 4. Migratsiya strategiyasi
- Eski fayllar o'z joyida qoldirildi (o'chirilmadi).
- `prisma/seed.ts` ichida eski 12 ta mahsulot va 4 kategoriya to'liq ko'chirildi, yangi 4 kategoriya qo'shildi.
- `db.json` dagi mahsulotlar ham mos ravishda seed qilindi (ID va sarlavha bo'yicha deduplikatsiya).
- Seed idempotent: `upsert` ishlatiladi, takroriy ishga tushirish ma'lumotlarni yo'q qilmaydi.
- Oldingi ma'lumotlarning zaxira nusxasi: `docs/backup/` (ko'chirilgan JSON nusxasi).

## 5. To'lov xavfsizligi (asosiy talab)
Chek yuklash → faqat `PAYMENT_REVIEW`. Faqat admin `APPROVE` qilganda `PAID`/`COMPLETED` va download ruxsati. Hech qanday frontend holati to'lov tasdiqi sifatida qabul qilinmaydi.
