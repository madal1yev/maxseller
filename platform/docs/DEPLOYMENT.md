# MaxSeller — deployment qo'llanmasi

## 1. Talablar
- Docker 24+ va Docker Compose v2
- Domenlar: storefront (mas. `maxseller.uz`), admin (`admin.maxseller.uz`), API (`api.maxseller.uz`) — ixtiyoriy, reverse proxy orqali bitta IP ham bo'ladi.
- TLS sertifikati (Let's Encrypt tavsiya etiladi).

## 2. Birinchi ishga tushirish
```bash
cd platform
cp .env.example .env
```
`.env` da kamida:
```env
POSTGRES_USER=maxseller
POSTGRES_PASSWORD=<kuchli-parol>
POSTGRES_DB=maxseller
JWT_SECRET=<kamida-32-belgili-tasodifiy>
ADMIN_EMAIL=admin@maxseller.uz
ADMIN_PASSWORD=<kuchli-parol>
CORS_ORIGINS=https://maxseller.uz,https://admin.maxseller.uz
NEXT_PUBLIC_SITE_URL=https://maxseller.uz
```
```bash
docker compose up -d --build
docker compose logs -f api
docker compose ps
```
API konteyneri `prisma migrate deploy` + `db:seed` ni avtomatik bajaradi, so'ngra 4000-portni ochadi.

## 3. Reverse proxy (Nginx namunasi)
```nginx
server {
  listen 443 ssl http2;
  server_name maxseller.uz;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
server {
  listen 443 ssl http2;
  server_name admin.maxseller.uz;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
server {
  listen 443 ssl http2;
  server_name api.maxseller.uz;
  client_max_body_size 210m;   # MAX_PRODUCT_FILE_MB ga mos
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Frontend Next.js rewrites orqali `/api/*` ni ichki `http://api:4000/api` ga yuboradi, shuning uchun `api.maxseller.uz` faqat to'g'ridan-to'g'ri API kerak bo'lganda ishlatiladi.

## 4. Xavfsizlik nazorati
- `storage/` volume faqat `api` konteynerida; `storefront`/`admin` konteynerlariga ulanmagan.
- Cheklar va ZIP fayllar `public/` papkada emas; barcha fayllar `GET /api/downloads/:id/file` va `GET /api/admin/orders/:id/receipt/:receiptId` orqali, server tomonidagi tekshiruvlardan keyin beriladi.
- JWT secret, DB paroli, SMS/Telegram/Payment kalitlari faqat environment'da; frontendga faqat `NEXT_PUBLIC_*` ochiq qiymatlar boradi.
- Admin endpointlari `requireAdmin`, mijoz endpointlari `requireUser` bilan himoyalangan.
- To'lov tasdiqlashidagi takroriy so'rovlar `SELECT ... FOR UPDATE` va holat tekshiruvi bilan bloklanadi.

## 5. Yangilash
```bash
docker compose pull
docker compose up -d --build
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed   # idempotent, zararsiz
```

## 6. Backup
```bash
docker compose exec postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql
# storage volume:
docker run --rm -v maxseller_storage:/data -v $PWD:/backup alpine tar czf /backup/storage.tgz -C /data .
```

## 7. Sozlanmagan xizmatlar
SMS, Telegram, Click, Payme, Paynet va S3 uchun `.env` va adapterlar tayyor, lekin ular haqiqiy credentials/kelishuvsiz ishlamaydi. Admin panel → Sozlamalar sahifasida ularning holati **"Sozlanmagan"** deb ko'rsatiladi. To'lov chekini qo'lda tasdiqlash oqimi esa to'liq ishga tushadi.
