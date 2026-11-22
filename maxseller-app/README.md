# MaxSeller — buyurtma boshqaruv tizimi

Eski dizayn saqlangan, lekin endi bu haqiqiy e-commerce / order-management tizimi: mahsulotlar, OTP mijoz akkauntlari, server savati, buyurtmalar, to'lovlar, fayllar, xabarnomalar va ikkita Telegram boti **bitta backend va bitta `db.json` bazasi** ustida ishlaydi.

**Buyurtma faqat saytda yaratiladi.** Telegram botlari faqat bildirishnoma va yordam uchun; ular orqali buyurtma berish yo'q va bot ishlamay qolsa ham sayt ishlayveradi.

| Sahifa | Manzil | Vazifa |
| --- | --- | --- |
| **Do'kon** | `/` yoki http://localhost:5173/ | Katalog, mahsulot, savat, tezkor/individual buyurtma, muvaffaqiyat sahifasi, kabinet, kuzatish |
| **Admin** | `/admin.html` yoki http://localhost:5173/admin.html | Buyurtmalar, to'lovlar, mahsulotlar, mijozlar, loglar, bot holati, sozlamalar. Aktiv bo'lim URL hash'da saqlanadi (`admin.html#orders`), shuning uchun refresh qilganda ham shu sahifada qolasiz |
| **API** | `/api/...` | Express REST API + SSE jonli yangilanish |

## Tez ishga tushirish

```bash
cd maxseller-app
npm install
cp .env.example .env   # mavjud .env bo'lsa o'zgartirmang
npm run dev
```

- Do'kon: http://localhost:5173/
- Admin: http://localhost:5173/admin.html
- Admin paroli: `.env` dagi `ADMIN_PASSWORD` (bo'lmasa `admin123`)

### Windows: bitta bosish bilan ishga tushirish

`START-ADMIN.bat` faylini ikki marta bosing. U ochilgandan keyin ichkarida `npm run dev` ishga tushadi va 9 soniyadan so'ng admin sahifasi brauzerda ochiladi. To'xtatish uchun oynada **CTRL+C** bosing.

Agar o'zingiz terminaldan yozmoqchi bo'lsangiz:

```bash
cd C:\Users\New\Desktop\maxseller\maxseller-app
npm run dev
```

Diqqat: buyruq **`npm run dev`** (noto'g'risi `npm tun dev`). Agar `npm` topilmasa, Node.js o'rnatilganligini tekshiring: `node -v` va `npm -v`. Port band bo'lsa, eski jarayonni yoping yoki kompyuterni qayta ishga tushiring.

### Telefondan ochish

Vite endi barcha tarmoq interfeyslarida ishlaydi (`0.0.0.0:5173`). Telefon **Wi-Fi orqali kompyuter bilan bir tarmoqda** bo‘lishi kerak. Telefonda `localhost` yozmang — u telefonning o‘zini anglatadi.

1. Kompyuterda `ipconfig` buyrug‘ini bosing va **IPv4 Address** qiymatini toping (masalan `192.168.1.24`).
2. Telefon brauzeriga kiriting: `http://192.168.1.24:5173/admin.html`
3. Do‘kon uchun: `http://192.168.1.24:5173/`

Agar ochilmasa, tarmoq turini **Private** qilib qo‘ying. MaxSeller uchun `MaxSeller Dev 5173` nomli firewall qoidasi qo‘shilgan (faqat `192.168.1.0/24`, Private tarmoq). Joriy kompyuter IP: `192.168.1.108`, demo manzil: http://192.168.1.108:5173/admin.html

Production:

```bash
npm run build
npm start
```

Server bitta portda (default `3001`) ham API, ham ikkala sahifani beradi. `server/data/db.json` va `server/storage/` doimiy diskda bo'lishi kerak.

## Mijoz kirishi: OTP

Ro'yxatdan o'tish va kirish **faqat OTP** bilan amalga oshiriladi. Eski `POST /api/auth/register` va `POST /api/auth/login` endpointlari `410 USE_OTP` qaytaradi.

1. `GET /api/auth/providers` — email yuboruvchi sozlanganligini ko'rsatadi (`sms.enabled: false`).
2. `POST /api/auth/otp/request` — `channel: 'email'`, email, ism va ixtiyoriy `cart` yuboriladi. Telefon/SMS kanali butunlay o'chirilgan: `PHONE_OTP_DISABLED` qaytariladi.
3. `POST /api/auth/otp/verify` — kod tekshiriladi; faqat muvaffaqiyatdan keyin JWT qaytariladi.

Xavfsizlik qoidalari:

- Kod faqat bazada HMAC hash bilan saqlanadi, frontendga yoki loglarga chiqmaydi.
- Kod muddati (`OTP_TTL_SECONDS`), qayta yuborish cheklovi (`OTP_RESEND_SECONDS`) va urinish cheklovi (`OTP_MAX_ATTEMPTS`) bor.
- Yangi kod so'ralganda eskisi bekor qilinadi.
- Email bo'yicha bitta mijoz; `customerNumber` (`CUST-1001` shaklida) unikal.
- Profildagi email o'zgarsa, `purpose: 'verify_contact'` bilan qayta tasdiqlash talab qilinadi; bu jarayon sessiyani almashtirmaydi. Telefon oddiy aloqa ma'lumoti sifatida saqlanadi, OTP bilan tasdiqlanmaydi.
- Haqiqiy yuboruvchi ulanmagan bo'lsa, soxta muvaffaqiyat yo'q: aniq `EMAIL_PROVIDER_NOT_CONFIGURED` xatoligi qaytariladi.

### OTP yuboruvchilari

| O'zgaruvchi | Ma'nosi |
| --- | --- |
| `EMAIL_PROVIDER` | `gmail` (API keysiz, bepul) yoki `smtp` / `resend`; bo'sh bo'lsa email o'chirilgan |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM` | Gmail app password uchun (tavsiya etiladi) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Oddiy SMTP server uchun |
| `RESEND_API_KEY`, `RESEND_BASE_URL`, `EMAIL_FROM` | Resend (API key bilan) uchun |
| `OTP_SECRET` | OTP hashlarini imzolash kaliti — productionda uzoq tasodifiy qiymat qo'ying |

Gmail uchun: Google Account → **Security** → **2-Step Verification** → **App passwords** → yangi parol yaratib, `GMAIL_APP_PASSWORD` ga qo'ying (bo'shliqlar bilan yozsa ham bo'ladi). Bu API key emas va bepul.

## Savat va buyurtma oqimi

- Savat `localStorage` da offline nusxa sifatida saqlanadi; tizimga kirgandan keyin `GET/PUT /api/cart` orqali mijoz akkauntiga sinxronlanadi. Server savati ustun turadi.
- Checkout (`/checkout` yoki `/checkout?mode=custom`) faqat kirgan mijoz uchun. Kirilmagan bo'lsa, aniq manzil (shu jumladan `?mode=custom`) saqlanadi va OTP muvaffaqiyatidan keyin shu sahifaga qaytariladi.
- `POST /api/orders` `Authorization: Bearer <customer-token>` va `idempotencyKey` talab qiladi. Mehmon buyurtmasi yaratish olib tashlangan.
- Backend mahsulot va narxlarni yana bazadan tekshiradi; frontend yuborgan narx inobatga olinmaydi.
- Buyurtma yozuvi `userId`/`customerId` bilan bog'lanadi, alohida `orderNumber`, `paymentStatus` va `status` ga ega. Har bir o'zgarish `statusHistory` ga yoziladi.
- Bir xil `idempotencyKey` bilan ikkinchi yuborish yangi buyurtma yaratmaydi. Savat faqat buyurtma muvaffaqiyatli yaratilgandan keyin tozalanadi.
- `/success/:id` sahifasida buyurtma raqami, sana, mahsulotlar, jami summa, to'lov va buyurtma holati ko'rsatiladi.

Individual buyurtmada yetkazib berish manzili so'ralmaydi; loyiha turi va batafsil talablar majburiy. Tayyor mahsulotlar uchun ham yetkazib berish manzili kerak emas (faqat raqamli fayllar sotiladi).

## Telegram botlar

| O'zgaruvchi | Ma'nosi |
| --- | --- |
| `TELEGRAM_ADMIN_BOT_TOKEN` | `@maxsellermanager_bot` tokeni |
| `TELEGRAM_CUSTOMER_BOT_TOKEN` | `@maxsellershop_bot` tokeni |
| `TELEGRAM_ADMIN_USERNAME` | Admin username (default `madaliyev_a`) |
| `ADMIN_TELEGRAM_CHAT_ID` | Ixtiyoriy admin chat ID; bo'sh bo'lsa admin `/start` yuborganda avtomatik saqlanadi |
| `ADMIN_TELEGRAM_IDS` | Ixtiyoriy admin Telegram user ID lari (vergul bilan) |
| `TELEGRAM_MODE` | `polling` (default) yoki `webhook` |
| `TELEGRAM_API_BASE_URL` | Bot API manzili (default `https://api.telegram.org`) |
| `TELEGRAM_WEBHOOK_BASE_URL`, `TELEGRAM_WEBHOOK_SECRET` | Faqat webhook rejimi uchun |

1. **Admin bot:** `@maxsellermanager_bot` ga `/start` yuboring. `@madaliyev_a` ekanligingiz tasdiqlangach chat ID bazaga saqlanadi; yangi buyurtmalar, to'lovlar va holat o'zgarishlari shu chatga keladi.
2. **Mijoz bot:** `@maxsellershop_bot` ga `/start` yuboring. Kabinetdagi bog'lash kodini botga yuborsangiz, veb va bot ma'lumotlari bitta mijozga biriktiriladi.
3. Admin panel → **Telegram botlar** bo'limida holatni ko'ring va **Test xabar** yuboring.

Bot orqali qilingan tasdiqlash/holat o'zgarishi umumiy biznes logikaga o'tadi va veb admin hamda mijoz kabinetida darhol ko'rinadi. Bildirishnomalarda dedupe va qayta urinish bor; xabar yetkazilmasa ham buyurtma oqimi to'xtamaydi. Bot tokenlari faqat backend `.env` da; frontendga, API javobiga yoki loglarga chiqmaydi.

## Imkoniyatlar

### Do'kon

- Katalog: qidirish, kategoriyalar, rasmlar, savatga qo'shish va "Hozir olaman".
- Mahsulot sahifasi: tavsif, narx, tezkor xarid.
- Checkout: kirgan mijoz, email/telefon, mahsulotlar va narxlar jadvali, to'lov usuli, izoh, individual loyiha talablari.
- Buyurtma sahifasi: statuslar, to'lov chekini yuklash, tarix, PDF hujjat, faylni yuklab olish, bekor qilish.
- Kabinet: **Buyurtmalarim**, **Buyurtma tafsilotlari**, **To'lovlar tarixi**, **Xaridlar**, **Yuklab olishlar**, **Hujjatlar**, **Faoliyat**, **Profil sozlamalari**. Faqat o'z ma'lumotlari ko'rinadi.
- Kuzatish: buyurtma raqami + maxfiy token orqali eski mehmon buyurtmalarini ko'rish; yangi buyurtmalar akkauntga bog'lanadi.
- Interfeys: dark/light rejim (`maxseller-theme`), Oʻzbekcha/Ruscha/Inglizcha tillar (`maxseller-lang`) va kirgandan keyin navda "Kabinet" o'rniga foydalanuvchi ismi ko'rsatiladi. Tanlov brauzerda saqlanadi.
- Mobil UX: ixcham yuqori nav, katta tegishli tugmalar (44–48px), jadvallar o'rniga kartalar, OTP/formalar va buyurtma oqimi telefonda qulay; xavfsiz hudud (`safe-area`) hisobga olingan.

### Admin

- Dashboard: real buyurtma/to'lov statistikasi, daromad, top mahsulotlar.
- Buyurtmalar: filtr, qidirish, tasdiqlash/rad etish, holat, narx/chegirma/muddat, fayl biriktirish, tarix.
- To'lovlar: chek rasmini ko'rish, faqat backend orqali tasdiqlash/rad etish (sabab bilan).
- Mahsulotlar: CRUD, rasm yuklash, mahsulot faylini yuklash, faollik.
- Mijozlar: ro'yxat, qidirish, tasdiqlanish holati, hisob holatini o'zgartirish (sabab bilan); detalda buyurtmalar, to'lovlar, xaridlar, hujjatlar va faoliyat.
- Harakatlar/xabarnomalar: audit log, bot xabarlari holati va xatolari.
- Botlar: ikkala bot holati, test xabar, ulanish ko'rsatmalari. Botlar faqat bildirishnoma/yordam uchun ekanligi aniq ko'rsatilgan.
- Mobil boshqaruv: pastda 6 ta tez tugma (Bosh/Buyurtma/To'lov/Maxsulot/Mijoz/Ko'proq), qolgan bo'limlar va chiqish "Ko'proq" menyusida; jadvallar kartalarga, modallar pastki varaqga aylanadi.

## Ma'lumotlar modeli

`server/data/db.json` `version: 2`. Kolleksiyalar: `products`, `users`, `orders`, `statusHistory`, `payments`, `receipts`, `deliveries`, `notifications`, `activityLog`, `linkCodes`, `downloads`, `purchases`, `otpCodes`, `carts`, `settings`, `telegram`.

Mijoz yozuvi: `customerNumber`, to'liq ism, email, telefon, ixtiyoriy `passwordHash`, `emailVerified`, `phoneVerified`, `telegramId`, `telegramUsername`, `createdAt`, `lastLoginAt`, `accountStatus`. Email/telefon unikal; JSON bazada cheklovlar servis qatlamida ham tekshiriladi.

- Barcha yozishlar atomik (vaqtinchalik fayl + `rename`); buyurtma yaratish va to'lov tasdiqlash bitta tranzaksiyada.
- Parollar `scrypt` bilan xashlanadi. Tokenlar HMAC imzolangan (adminSession 12 soat, mijoz sessiyasi alohida).
- RBAC: mijoz faqat o'z buyurtmalarini, admin barchasini ko'radi.
- Statuslar markazlashgan: `NEW → PENDING_CONFIRMATION → AWAITING_PAYMENT → PAYMENT_PROCESSING → PAID → IN_PROGRESS/READY_FOR_DELIVERY → DELIVERED → COMPLETED`. Bekor qilish/qaytarish ham alohida holatlar.
- To'lov faqat server tomonidan tasdiqlanadi. Click/Payme webhooklari imzani tekshiradi; credentials bo'lmaganda 503 qaytaradi.
- PDF — buyurtma/to'lov **ichki hujjati**, moliyaviy chek (fiscal receipt) **emas**.

## API (qisqa)

| Method | Endpoint | Tavsif |
| --- | --- | --- |
| GET | `/api/bootstrap` | Faol mahsulotlar + ommaviy sozlamalar + to'lov usullari |
| GET | `/api/health` | Botlar va admin chat holati |
| GET | `/api/events` | SSE jonli yangilanish |
| GET | `/api/auth/providers` | Email yuboruvchisi holati (`sms.enabled: false`) |
| POST | `/api/auth/otp/request`, `/api/auth/otp/verify` | Faqat email OTP bilan kirish/ro'yxatdan o'tish va email tasdiqlash |
| GET | `/api/auth/me` | Joriy mijoz |
| PUT | `/api/auth/profile`, `POST /api/auth/password` | Profil va parol |
| GET/PUT/DELETE | `/api/cart` | Mijoz server savati |
| POST | `/api/orders` | Buyurtma yaratish (auth + idempotencyKey) |
| GET | `/api/orders`, `/api/orders/:id` | Mijoz buyurtmalari/tafsiloti |
| POST | `/api/orders/track` | Eski mehmon buyurtmasini token bilan kuzatish |
| POST | `/api/orders/:id/payment`, `/api/orders/:id/cancel` | Chek yuborish / bekor qilish |
| GET | `/api/orders/:id/receipt` | PDF hujjat (faqat egasi/admin) |
| POST | `/api/orders/:id/download-token` | To'langan mahsulot uchun vaqtinchalik havola |
| GET | `/api/customer/summary` | Kabinet xulosasi |
| GET | `/api/customer/purchases`, `/receipts`, `/transactions`, `/activity` | Faqat joriy mijoz ma'lumotlari |
| GET | `/api/payments/my` | Mijoz to'lovlari |
| GET | `/api/admin/data`, `/api/admin/stats` | Admin ma'lumotlari |
| GET | `/api/admin/customers`, `/api/admin/customers/:id` | Mijozlar ro'yxati va detali |
| PATCH | `/api/admin/customers/:id/status` | Hisob holatini o'zgartirish |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/orders...` | Buyurtma boshqaruv |
| GET/POST | `/api/admin/payments...` | To'lovlarni tekshirish |
| GET | `/api/admin/telegram`, `POST /api/admin/telegram/test` | Bot holati/test |
| POST | `/api/telegram/:bot/:secret` | Bot webhook (faqat webhook rejimida) |

Admin endpointlari `Authorization: Bearer <admin-token>`, mijoz endpointlari `Authorization: Bearer <customer-token>` talab qiladi.

## Test

```bash
npm run build
node scripts/smoke-test.mjs
```

Smoke test o'zining vaqtinchalik bazasi va mahalliy HTTP test double larida ishlaydi — ishga tushgan server yoki haqiqiy email kalitlari kerak emas. U haqiqiy Express API, email OTP hash/verify, telefon kanali rad etilishi, savat, buyurtma, to'lov, kabinet, admin, PDF, yuklash va ikkala bot xabarini tekshiradi; shuningdek buyurtmani Telegramga yo'naltiradigan havolalar yo'qligini tekshiradi.

Natija: **59 o'tdi, 0 xato** (test soni o'zgarsa, oxirgi chiqishga qarang).

## Tashqi integratsiyalar holati

- ✅ Telegram botlari: bildirishnoma, tasdiqlash va yordam; web admin bilan umumiy DB.
- ✅ OTP: Twilio/Eskiz/Resend real adapterlari; soxta yuborish yo'q.
- ✅ Chek yuklash + admin tasdiqlash + ichki PDF hujjat.
- ✅ Click/Payme webhook imzo tekshiruvi (faqat `.env` credentials berilganda faol).
- ⏳ Click/Payme to'lov oynasi/redirect integratsiyasi ulanmagan — hozircha "karta o'tkazmasi + chek" modeli ishlaydi.
- ⏳ Soliq/fiskal chek (OFD) ulanmagan — PDF ichki hujjat sifatida beriladi.
