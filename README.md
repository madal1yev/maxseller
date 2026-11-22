# maxseller

MaxSeller — to‘liq do‘kon + admin + buyurtma boshqaruv tizimi.

## Tuzilma

- `maxseller-app/` — asosiy ilova (React + Vite + Express). Ushbu papkada `npm run dev` ishga tushiriladi.
- Root’dagi eski `index.html`, `style.css`, `script.js` va `assets/` — avvalgi statik landing fayllari (faqat ma’lumot uchun saqlangan).

## Ishga tushirish

```bash
cd maxseller-app
npm install
npm run dev
```

- Do‘kon: http://127.0.0.1:5173/
- Admin: http://127.0.0.1:5173/admin.html
- Admin paroli: `.env` dagi `ADMIN_PASSWORD` (bo‘lmasa `admin123`)

Windows uchun `maxseller-app/START-ADMIN.bat` faylini ikki marta bosing.

## Vercelga joylashtirish

Repo ildizidagi `vercel.json` hamma narsani sozlaydi:

- **Frontend:** `maxseller-app/dist` — do'kon `/`, admin `/admin.html` (qisqa manzil `/admin`).
- **API:** `api/[...path].js` — butun Express API bitta Node serverless function ichida.
- **Build:** `npm --prefix maxseller-app install && npm --prefix maxseller-app run build`.

Deploy qilish uchun:

```bash
npm i -g vercel
vercel login
vercel --prod
```

Keyin Vercel dashboard → **Settings → Environment Variables** ga quyidagi qiymatlarni qo'ying:

| O'zgaruvchi | Qiymat |
| --- | --- |
| `JWT_SECRET` | uzoq tasodifiy matn |
| `OTP_SECRET` | uzoq tasodifiy matn |
| `ADMIN_PASSWORD` | admin paroli |
| `EMAIL_PROVIDER` | `gmail` |
| `GMAIL_USER` | Gmail manzili |
| `GMAIL_APP_PASSWORD` | Gmail app password (16 belgili) |
| `EMAIL_FROM` | `MaxSeller < Gmail manzili >` |
| `TELEGRAM_ADMIN_BOT_TOKEN` | admin bot tokeni |
| `TELEGRAM_CUSTOMER_BOT_TOKEN` | mijoz bot tokeni |
| `ADMIN_TELEGRAM_CHAT_ID` | admin chat ID |
| `TELEGRAM_MODE` | `webhook` |
| `TELEGRAM_WEBHOOK_BASE_URL` | `https://<deploy-domain>` |
| `TELEGRAM_WEBHOOK_SECRET` | tasodifiy matn |

### Muhim cheklov

Vercel serverless’da disk faqat o'qish uchun (yozish faqat `/tmp`). Shuning uchun:

- Ilova **xatosiz ishlaydi**, lekin `/tmp` dagi `db.json` va yuklangan fayllar **cold start’da yo'qoladi**.
- Telegram **polling** o'rniga **webhook** ishlatiladi (polling serverless’da ishlamaydi).
- SSE o'rniga frontend 15 soniyada bir marta jimgina yangilanadi.
- Haqiqiy do'kon uchun `MAXSELLER_DB_FILE` ni doimiy volume’ga yoki tashqi DB/Blob’ga o'tkazish kerak. Buni keyingi bosqichda ulab beraman.

## Muhim

- `.env`, `server/data/db.json` va `server/storage/` gitga kiritilmaydi (secret va shaxsiy ma’lumotlar).
- Backend doimiy disk va uzoq ishlaydigan jarayon talab qiladi (Telegram botlar, SSE, fayl yuklash). Shuning uchun to‘liq ishlash uchun Vercel bilan birga persistent Node host ham kerak. Batafsil: `maxseller-app/README.md`.
