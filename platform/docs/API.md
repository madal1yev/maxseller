# MaxSeller REST API kontrakti

Base URL: `http://localhost:4000/api` (frontendlar `/api/...` nisbiy yo'llar bilan ishlaydi, Next.js rewrite qiladi).

Autentifikatsiya: `Authorization: Bearer <token>`. Mijoz tokeni `localStorage.maxseller_token`, admin tokeni `localStorage.maxseller_admin_token`.

Barcha javoblar JSON. Xatolik: `{ "error": string, "details"?: ... }`.

## Ommaviy

| Method | Endpoint | Javob |
| --- | --- | --- |
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/settings/public` | `SiteSettings` |
| GET | `/api/categories` | `Category[]` (faqat faollar) |
| GET | `/api/products?category=&q=&sort=new\|popular\|price_asc\|price_desc&page=1&limit=12` | `Paginated<Product>` |
| GET | `/api/products/featured` | `Product[]` |
| GET | `/api/products/popular` | `Product[]` |
| GET | `/api/products/new` | `Product[]` |
| GET | `/api/products/best-sellers` | `Product[]` |
| GET | `/api/products/:slug` | `Product` (images, files metadata, category, rating) |
| GET | `/api/reviews?productId=` | `Review[]` (tasdiqlangan) |
| GET | `/api/faq` | `FAQ[]` |
| GET | `/api/payment-methods` | `PaymentMethod[]` (faqat faol) |
| GET | `/api/media/:id` | rasm fayli (public) |

## Mijoz autentifikatsiyasi

| Method | Endpoint | Body / Javob |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ name, email, phone?, password }` → `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | → `{ user }` |
| PATCH | `/api/auth/me` | `{ name?, phone? }` → `{ user }` |

## Buyurtma va to'lov (mijoz, token talab qilinadi)

| Method | Endpoint | Body / Javob |
| --- | --- | --- |
| POST | `/api/orders` | `{ items:[{productId,quantity}], couponCode?, customerNote? }` → `Order` (status PENDING_PAYMENT) |
| GET | `/api/orders/my` | → `Order[]` |
| GET | `/api/orders/my/:id` | → `Order` |
| POST | `/api/orders/:id/receipt` | multipart/form-data: `receipt` (jpg/jpeg/png/pdf, ≤5MB) → `Order` (status PAYMENT_REVIEW) |
| POST | `/api/orders/:id/cancel` | → `Order` |
| GET | `/api/downloads` | → `Download[]` |
| GET | `/api/downloads/:id/file` | himoyalangan fayl stream (faqat PAID/COMPLETED va egasiga) |
| GET | `/api/favorites` | → `Product[]` |
| POST | `/api/favorites/:productId` | toggle → `{ favorited: boolean }` |
| POST | `/api/reviews` | `{ productId, rating, comment }` → `Review` (moderatsiyaga) |

## Admin (admin token talab qilinadi)

| Method | Endpoint | Tavsif |
| --- | --- | --- |
| POST | `/api/admin/auth/login` | `{ email, password }` → `{ admin, token }` |
| GET | `/api/admin/me` | → `{ admin }` |
| GET | `/api/admin/dashboard` | → `DashboardStats` |
| GET | `/api/admin/products?status=&q=&page=&limit=` | → `Paginated<Product>` |
| POST | `/api/admin/products` | `createProductSchema` → `Product` |
| GET | `/api/admin/products/:id` | → `Product` |
| PATCH | `/api/admin/products/:id` | `updateProductSchema` → `Product` |
| DELETE | `/api/admin/products/:id` | soft delete (ARCHIVED) → `{ ok:true }` |
| GET | `/api/admin/categories` | → `Category[]` (hammasi) |
| POST | `/api/admin/categories` | → `Category` |
| PATCH | `/api/admin/categories/:id` | → `Category` |
| DELETE | `/api/admin/categories/:id` | → `{ ok:true }` |
| GET | `/api/admin/orders?status=&q=&page=&limit=` | → `Paginated<Order>` |
| GET | `/api/admin/orders/:id` | → `Order` (receipt, verification, user to'liq) |
| PATCH | `/api/admin/orders/:id/status` | `{ status }` → `Order` |
| POST | `/api/admin/orders/:id/verify` | `{ action:'APPROVE'\|'REJECT'\|'REQUEST_RECEIPT', reason? }` → `Order` |
| GET | `/api/admin/orders/:id/receipts` | → `Receipt[]` |
| GET | `/api/admin/orders/:id/receipt/:receiptId` | chek faylini ko'rsatish (admin only) |
| PATCH | `/api/admin/orders/:id/note` | `{ adminNote }` → `Order` |
| GET | `/api/admin/customers?q=&page=` | → `Paginated<User & {orderCount,totalSpent}>` |
| GET | `/api/admin/customers/:id` | → customer + orders |
| PATCH | `/api/admin/customers/:id` | `{ isActive }` |
| GET | `/api/admin/payment-methods` | → `PaymentMethod[]` |
| POST | `/api/admin/payment-methods` | → `PaymentMethod` |
| PATCH | `/api/admin/payment-methods/:id` | → `PaymentMethod` |
| DELETE | `/api/admin/payment-methods/:id` | → `{ ok:true }` |
| GET | `/api/admin/coupons` | → `Coupon[]` |
| POST | `/api/admin/coupons` | → `Coupon` |
| PATCH | `/api/admin/coupons/:id` | → `Coupon` |
| DELETE | `/api/admin/coupons/:id` | → `{ ok:true }` |
| GET | `/api/admin/reviews?approved=` | → `Review[]` |
| PATCH | `/api/admin/reviews/:id/moderate` | `{ isApproved }` → `Review` |
| GET | `/api/admin/faq` | → `FAQ[]` |
| POST | `/api/admin/faq` | → `FAQ` |
| PATCH | `/api/admin/faq/:id` | → `FAQ` |
| DELETE | `/api/admin/faq/:id` | → `{ ok:true }` |
| GET | `/api/admin/notifications` | → `Notification[]` |
| PATCH | `/api/admin/notifications/:id/read` | → `Notification` |
| GET | `/api/admin/activity?page=` | → `Paginated<ActivityLog>` |
| GET | `/api/admin/settings` | → `SiteSettings` |
| PUT | `/api/admin/settings` | `settingsSchema` → `SiteSettings` |
| POST | `/api/admin/uploads/image` | multipart `file` → `{ id, url, name, size, mime }` |
| POST | `/api/admin/uploads/product-file` | multipart `file` → `{ id, name, size, mime }` |
| GET | `/api/events` | SSE: `update` hodisalari ( mahsulot/buyurtma yangilanganda ) |

## Muhim qoidalar

- Chek yuklash **hech qachon** to'lovni tasdiqlamaydi: natija `PAYMENT_REVIEW`.
- Faqat `POST /api/admin/orders/:id/verify` action=APPROVE to'lovni `PAID`/`COMPLETED` qiladi va faylga kirish ochadi.
- Download faqat egasiga va to'lov tasdiqlangandan keyin.
- Admin endpointlariga mijoz tokeni bilan kirish mumkin emas (403).
