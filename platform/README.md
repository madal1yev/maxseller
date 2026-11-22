# MaxSeller — Raqamli mahsulotlar platformasi

**Bitta backend + bitta PostgreSQL database + ikkita mustaqil frontend.**

- Storefront: http://localhost:3000
- Admin panel: http://localhost:3001
- REST API: http://localhost:4000/api
- Telegram: [@maxseller_uz](https://t.me/maxseller_uz)

---

## 1. Bajarilgan ishlar

### Arxitektura
- `apps/api` — Express + TypeScript REST API: autentifikatsiya (JWT + httpOnly cookie), bcrypt, Zod validatsiya, rate limiting, CORS, Helmet, SSE real-time yangilanishlar, private storage abstraction (`local` / `s3` interfeysi).
- `apps/storefront` — Next.js 15 App Router mijoz do'koni: 23 sahifa, qorong'i/yorug' rejim, Uzbek tili, localStorage savat, himoyalangan sahifalar, to'lov chekini yuklash, himoyalangan download.
- `apps/admin` — Next.js 15 App Router admin paneli: 18 sahifa, real dashboard statistikasi, mahsulot/buyurtma/to'lov/mijoz/kupon/sharh/FAQ/sozlama boshqaruvi, chek preview, idempotent tasdiqlash.
- `packages/shared`, `packages/types`, `packages/validation` — barcha frontend va backend uchun yagona TypeScript kontraktlari va Zod sxemalari.
- `prisma/` — 23 ta model, indekslar, foreign key'lar, `migrations/20261117000000_init/migration.sql`, idempotent seed.

### Asosiy biznes qoidalar
- **Chek yuklash hech qachon to'lovni tasdiqlamaydi.** Chekdan keyin buyurtma faqat `PAYMENT_REVIEW` ga o'tadi.
- Faqat `POST /api/admin/orders/:id/verify` (action `APPROVE`) to'lovni `PAID` qiladi va ZIP faylga kirish ochadi.
- Admin rad etishda sabab majburiy; mijoz tuzatilgan chekni qayta yuborishi mumkin.
- Har bir yuklab olishda server: foydalanuvchi, buyurtma egaligi, `PAID`/`COMPLETED` holati, to'lov holati va mahsulot tegishliligini qayta tekshiradi.
- Parallel tasdiqlash uchun `SELECT ... FOR UPDATE` + idempotent holat tekshiruvi; dublikat to'lov/yuklash yaratilmaydi.
- Barcha admin harakatlari `ActivityLog` ga, to'lov yechimlari `PaymentVerification` ga yoziladi.
- SMS/Telegram/Paynet/Click/Payme — interfeys va konfiguratsiya tayyor, **credentials bo'lmaganda ishlamaydi deb aniq ko'rsatiladi**.

### Eski ma'lumotlar migratsiyasi
- Eski HTML/Vite fayllari o'chirilmadi.
- `docs/backup/` ichida `legacy-db.json`, `legacy-products.js`, `legacy-seed.js` zaxira nusxalari saqlangan.
- `prisma/seed.ts` 8 kategoriya + 12 mahsulot + FAQ + admin/demo foydalanuvchi + bank karta usulini idempotent tarzda yuklaydi.
- Admin mahsulotni yaratganda/tahrirlaganda/yashirganda SSE orqali do'kon avtomatik yangilanadi.

---

## 2. Papka tuzilishi

```
platform/
├── apps/
│   ├── api/                 # Express backend (port 4000)
│   │   ├── src/
│   │   │   ├── routes/      # public, auth, orders, admin, admin-extra
│   │   │   ├── middleware/  # upload validatsiyasi
│   │   │   ├── app.ts       # Express app, CORS, rate limit, SSE
│   │   │   ├── auth.ts      # JWT / bcrypt / RBAC
│   │   │   ├── config.ts    # faqat environment variables
│   │   │   ├── storage.ts   # private disk / S3 interfeysi
│   │   │   ├── notifications.ts # SMS / Telegram / in-app + dedupe
│   │   │   └── utils.ts     # serializer'lar
│   │   ├── tests/integration.test.ts  # 29 ta integratsiya testi
│   │   └── Dockerfile
│   ├── storefront/          # Mijoz do'koni (port 3000), 23 sahifa
│   │   └── Dockerfile
│   └── admin/               # Admin panel (port 3001 → container 3000), 18 sahifa
│       └── Dockerfile
├── packages/
│   ├── shared/              # umumiy konstanta/helper'lar
│   ├── types/               # yagona TypeScript tiplari
│   └── validation/          # Zod sxemalari
├── prisma/
│   ├── schema.prisma        # 23 model
│   ├── migrations/          # initial migration
│   └── seed.ts
├── docs/
│   ├── PLAN.md              # audit va migratsiya rejasi
│   ├── API.md               # to'liq REST API kontrakti
│   ├── DEPLOYMENT.md
│   └── backup/              # eski JSON/JS ma'lumotlar zaxirasi
├── scripts/
│   ├── pglite-server.mjs    # lokal test uchun real Postgres (WASM)
│   └── pglite-apply-schema.mjs
├── .env.example
├── docker-compose.yml
└── package.json
```

---

## 3. Database o'rnatish

### 3.1 Production / Docker (tavsiya etiladi)
```bash
cp .env.example .env
# .env ichida JWT_SECRET va ADMIN_PASSWORD ni o'zgartiring
docker compose up -d --build
```
`api` konteyneri ishga tushganda migratsiya va seed avtomatik bajariladi. PostgreSQL 17 konteynerda `maxseller` bazasi yaratiladi.

### 3.2 Lokal (Docker bo'lmagan muhit uchun)
Muhitda Docker/psql yo'qligi sababli **PGlite** (real PostgreSQL 18.6 WASM) ishlatiladi:
```bash
npm install
npm run db:generate
npm run db:test-server        # 1-terminal: 127.0.0.1:55433
npm run db:setup-local        # 2-terminal: migratsiya + seed
```
`.env` dagi `DATABASE_URL` shu socket'ga qaratilgan. Haqiqiy PostgreSQL serverga o'tish uchun faqat `DATABASE_URL` ni o'zgartiring.

### 3.3 Boshqa PostgreSQL server
```bash
DATABASE_URL="postgresql://user:pass@host:5432/maxseller?schema=public" npm run db:migrate
DATABASE_URL="..." npm run db:seed
```

---

## 4. O'rnatish va ishga tushirish

```bash
cd platform
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed

# barcha xizmatlar bir vaqtda:
npm run dev

# yoki alohida:
npm run dev:api       # http://localhost:4000/api
npm run dev:store     # http://localhost:3000
npm run dev:admin     # http://localhost:3001
```

Production build:
```bash
npm run build
npm run start -w @maxseller/api
npm run start -w @maxseller/storefront
npm run start -w @maxseller/admin
```

Testlar:
```bash
npm test                      # 29 ta integratsiya testi
npm test -w @maxseller/api
```

---

## 5. Muhim environment o'zgaruvchilari

To'liq ro'yxat `.env.example` da. Eng muhimlari:

| O'zgaruvchi | Tavsif |
| --- | --- |
| `DATABASE_URL` | Yagona PostgreSQL ulanish satri (barcha ilovalar uchun) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token imzolash kaliti (production'da majburiy) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Birinchi admin hisobi |
| `CORS_ORIGINS` | Faqat storefront va admin domenlari |
| `STORAGE_DRIVER`, `STORAGE_DIR` | `local` yoki `s3`; public papka ichida bo'lmasligi kerak |
| `MAX_RECEIPT_MB`, `MAX_PRODUCT_FILE_MB`, `MAX_IMAGE_MB` | Yuklash cheklovlari |
| `SMS_PROVIDER`, `SMS_API_URL`, `SMS_API_KEY`, `SMS_FROM`, `ADMIN_PHONE`, `SMS_RETRY_ATTEMPTS` | SMS (ixtiyoriy) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` | Telegram bot (ixtiyoriy, **@maxseller_uz kanali emas**) |
| `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `PAYME_MERCHANT_ID`, `PAYME_SECRET_KEY` | Kelajakdagi providerlar (ixtiyoriy) |
| `NEXT_PUBLIC_API_URL` | Frontendlar uchun faqat ochiq API manzili |

Demo hisoblar: `admin@maxseller.uz / Admin123!`, `demo@maxseller.uz / Demo123!` — production'da o'zgartiring.

---

## 6. Testing natijalari

`npm test` — **29/29 o'tdi**. Qamrov:

1. Admin login (muvaffaqiyatli/noto'g'ri parol), rollsiz kirish 403/401.
2. Admin mahsulot yaratadi → do'konda avtomatik ko'rinadi; tahrir → yangilanadi; `HIDDEN` → yo'qoladi.
3. Mijoz register/login/me; boshqa mijozning buyurtmasini ko'ra olmaydi.
4. Buyurtma yaratish, OrderItem narx snapshot'i, admin buyurtma+to'lovni ko'radi.
5. To'lov usullari ro'yxati.
6. Soxta chek yuklash → `PAYMENT_REVIEW` (hech qachon `PAID` emas), `verifiedAt = null`.
7. Bir hodisa uchun bitta bildirishnoma (dedupe), SMS sozlanmaganligi aniq qayd etiladi.
8. Chek formati validatsiyasi (.exe rad etiladi), admin chek preview himoyalangan.
9. Tasdiqlanmagan/to'lovsiz/download yozuvi mavjud bo'lsa ham fayl 403; boshqa foydalanuvchi 404; admin tokeni bilan 401.
10. Admin rad etadi → sabab saqlanadi, fayl yo'q; sababsiz rad 400; tuzatilgan chek qayta yuboriladi.
11. Admin tasdiqlaydi → `COMPLETED`/`PAID`, download yaratiladi, ZIP haqiqatan oqadi (`PK`).
12. Boshqa mijoz ZIP ololmaydi; takroriy APPROVE dublikat yaratmaydi (1 payment, 1 download, 1 verification, 1 transaction).
13. Private storage yo'li hech qanday API javobida yo'q; yangi app instansiyasi/qayta login ma'lumotlari saqlanadi.
14. Dashboard haqiqiy bazadan hisoblanadi; eski 12 mahsulot ham adminda, ham do'konda mavjud.

---

## 7. Deploy qilish

`docs/DEPLOYMENT.md` ga qarang. Qisqa:
```bash
docker compose up -d --build
docker compose logs -f api
```
Admin domeni (`admin.maxseller.uz`) uchun `CORS_ORIGINS` va `NEXT_PUBLIC_SITE_URL` ni yangilang, TLS'ni reverse proxy (Nginx/Caddy/Traefik) bilan ta'minlang. `storage/` papkasi faqat API konteyneriga ulangan bo'lishi kerak, frontendga hech qachon mount qilinmasin.

---

## 8. Real third-party credentials talab qiladigan qoldiq ishlar

| Xizmat | Holat | Nima kerak |
| --- | --- | --- |
| SMS (admin xabarlar) | Interfeys + retry + dedupe tayyor, provayder `none` | `SMS_API_URL`, `SMS_API_KEY`, `ADMIN_PHONE`; sozlanmaganda admin panel ichidagi xabar ishlaydi |
| Telegram bot | Kod tayyor | `@BotFather` dan olingan `TELEGRAM_BOT_TOKEN` va `TELEGRAM_ADMIN_CHAT_ID` (kanal emas) |
| Click / Payme | Payment modeli va webhook uchun joy tayyor, **ishlamaydi deb ko'rsatilgan** | Merchant shartnomasi, `CLICK_MERCHANT_ID`/`CLICK_SECRET_KEY`, `PAYME_MERCHANT_ID`/`PAYME_SECRET_KEY`, imzolangan callback endpoint |
| Paynet Xolis | Tegishli model yo'q (hali qo'shilmagan) | Merchant eligibility/API shartnomasi, keyin `PaymentMethod` + provider adapter |
| Bank karta (oila a'zosi) | Admin panel orqali karta ma'lumotlarini kiritish tayyor | Qonuniy vakolat/rozilik va haqiqiy karta ma'lumotlari; kodda saqlanmaydi |
| S3/MinIO | `s3` driver interfeysi tayyor, xatolik xabari aniq | S3 endpoint, bucket, access key/secret |
| Production secrets | `.env` faqat lokal | `JWT_SECRET`, `ADMIN_PASSWORD`, DB paroli, TLS sertifikati |

**Muhim:** yuqoridagi xizmatlar sozlanmagan holatda ular ishlaydi deb ko'rsatilmaydi. Asosiy to'lov oqimi (chek → admin tekshiruvi → tasdiq → himoyalangan ZIP) to'liq ishlaydi va 29 ta test bilan tasdiqlangan.
