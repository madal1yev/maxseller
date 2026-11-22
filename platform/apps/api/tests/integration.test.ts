import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/prisma'
import { notificationStatus } from '../src/notifications'

const app = createApp()
const uniq = Date.now().toString()
const adminEmail = 'admin@maxseller.uz'
const adminPassword = 'Admin123!'
const customerEmail = `mijoz-${uniq}@example.uz`
const otherEmail = `boshqa-${uniq}@example.uz`
const password = 'Customer123!'

let adminToken = ''
let userToken = ''
let otherToken = ''
let userId = ''
let categoryId = ''
let productId = ''
let productSlug = ''
let productTitle = ''
let updatedTitle = ''
let fileId = ''
let orderId = ''
let orderNumber = ''
let downloadId = ''
let receiptId = ''
let adminNotifications: any[] = []

const zipBuffer = Buffer.concat([
  Buffer.from('PK\u0003\u0004'),
  Buffer.from('maxseller-private-project-content'),
])
const fakeReceipt = Buffer.from('\u0089PNG\r\n\u001a\nFAKE-RECEIPT-SECURITY-TEST')

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

beforeAll(async () => {
  const login = await request(app).post('/api/admin/auth/login').send({ email: adminEmail, password: adminPassword })
  if (login.status !== 200) throw new Error(`Admin login failed: ${login.status} ${JSON.stringify(login.body)}`)
  adminToken = login.body.token

  const categories = await request(app).get('/api/admin/categories').set(auth(adminToken))
  categoryId = categories.body[0].id

  const upload = await request(app)
    .post('/api/admin/uploads/product-file')
    .set(auth(adminToken))
    .attach('file', zipBuffer, 'maxseller-loyiha.zip')
  if (upload.status !== 201) throw new Error(`ZIP upload failed: ${JSON.stringify(upload.body)}`)
  fileId = upload.body.id

  productTitle = `Test Loyiha ${uniq}`
  updatedTitle = `${productTitle} Yangilandi`
  const product = await request(app)
    .post('/api/admin/products')
    .set(auth(adminToken))
    .send({
      title: productTitle,
      shortDescription: 'Integratsiya testi uchun mahsulot',
      description: 'To\'lov xavfsizligi testlari uchun yaratilgan mahsulot.',
      price: 150000,
      oldPrice: 200000,
      categoryId,
      status: 'PUBLISHED',
      features: ['ZIP fayl', 'Tahrirlanadigan'],
      fileIds: [fileId],
    })
  if (product.status !== 201) throw new Error(`Product create failed: ${JSON.stringify(product.body)}`)
  productId = product.body.id
  productSlug = product.body.slug

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Test Mijoz', email: customerEmail, phone: '+998901112233', password,
  })
  if (reg.status !== 201) throw new Error(`Register failed: ${JSON.stringify(reg.body)}`)
  userToken = reg.body.token
  userId = reg.body.user.id

  const reg2 = await request(app).post('/api/auth/register').send({
    name: 'Boshqa Mijoz', email: otherEmail, password,
  })
  if (reg2.status !== 201) throw new Error(`Second register failed: ${JSON.stringify(reg2.body)}`)
  otherToken = reg2.body.token
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('1-3. Admin autentifikatsiyasi va rollsiz kirishning oldini olish', () => {
  it('TEST 1: admin muvaffaqiyatli kiradi va ADMIN token oladi', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ email: adminEmail, password: adminPassword })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    expect(res.body.admin.email).toBe(adminEmail)
    expect(adminToken).toBeTruthy()
  })

  it('noto\'g\'ri parol bilan admin kira olmaydi', async () => {
    const res = await request(app).post('/api/admin/auth/login').send({ email: adminEmail, password: 'wrong-password' })
    expect(res.status).toBe(401)
  })

  it('TEST 10: mijoz tokeni bilan admin funksiyasiga kiritish taqiqlanadi (403)', async () => {
    const res = await request(app).get('/api/admin/dashboard').set(auth(userToken))
    expect(res.status).toBe(403)
  })

  it('token bo\'lmasa admin funksiyasi 401 qaytaradi', async () => {
    const res = await request(app).get('/api/admin/products')
    expect(res.status).toBe(401)
  })
})

describe('4-7. Mahsulot boshqaruvi va avtomatik sinxronizatsiya', () => {
  it('TEST 2/3: admin yaratgan mahsulot do\'konda avtomatik ko\'rinadi', async () => {
    const res = await request(app).get('/api/products').query({ q: productTitle })
    expect(res.status).toBe(200)
    expect(res.body.items.some((p: any) => p.id === productId)).toBe(true)
  })

  it('TEST 3: admin tahrirlagan mahsulot do\'konda yangilanadi', async () => {
    const patch = await request(app)
      .patch(`/api/admin/products/${productId}`)
      .set(auth(adminToken))
      .send({ title: updatedTitle, price: 175000 })
    expect(patch.status).toBe(200)

    const pub = await request(app).get(`/api/products/${productSlug}`)
    expect(pub.status).toBe(200)
    expect(pub.body.title).toBe(updatedTitle)
    expect(pub.body.price).toBe(175000)
  })

  it('TEST 4: admin yashirgan mahsulot do\'kondan yo\'qoladi', async () => {
    const hide = await request(app)
      .patch(`/api/admin/products/${productId}`)
      .set(auth(adminToken))
      .send({ status: 'HIDDEN' })
    expect(hide.status).toBe(200)

    const detail = await request(app).get(`/api/products/${productSlug}`)
    expect(detail.status).toBe(404)

    const list = await request(app).get('/api/products').query({ q: updatedTitle })
    expect(list.body.items.some((p: any) => p.id === productId)).toBe(false)

    const restore = await request(app)
      .patch(`/api/admin/products/${productId}`)
      .set(auth(adminToken))
      .send({ status: 'PUBLISHED' })
    expect(restore.status).toBe(200)
  })

  it('mahsulot narxi OrderItem ichida snapshot sifatida saqlanadi', async () => {
    const order = await request(app).post('/api/orders').set(auth(userToken)).send({
      items: [{ productId, quantity: 1 }],
      customerNote: 'test',
    })
    expect(order.status).toBe(201)
    expect(order.body.items[0].unitPrice).toBe(175000)
    expect(order.body.items[0].productTitle).toBe(updatedTitle)
    expect(order.body.status).toBe('PENDING_PAYMENT')

    await prisma.order.delete({ where: { id: order.body.id } })
  })
})

describe('8-12. Mijoz kirishi va buyurtma yaratish', () => {
  it('TEST 4: mijoz ro\'yxatdan o\'tadi va keyinchalik kiradi', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: customerEmail, password })
    expect(login.status).toBe(200)
    expect(login.body.user.email).toBe(customerEmail)

    const me = await request(app).get('/api/auth/me').set(auth(userToken))
    expect(me.status).toBe(200)
    expect(me.body.user.id).toBe(userId)
  })

  it('TEST 5/6: mijoz buyurtma yaratadi (savatdan checkout)', async () => {
    const methods = await request(app).get('/api/payment-methods')
    expect(methods.status).toBe(200)
    expect(methods.body.length).toBeGreaterThan(0)

    const res = await request(app).post('/api/orders').set(auth(userToken)).send({
      items: [{ productId, quantity: 1 }],
      couponCode: '',
      customerNote: 'Iltimos tez ko\'rib chiqing',
    })
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('PENDING_PAYMENT')
    expect(res.body.payment.status).toBe('PENDING')
    expect(res.body.total).toBe(175000)
    orderId = res.body.id
    orderNumber = res.body.orderNumber
  })

  it('TEST 9: admin buyurtmani va to\'lov ma\'lumotlarini to\'liq ko\'radi', async () => {
    const res = await request(app).get(`/api/admin/orders/${orderId}`).set(auth(adminToken))
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(orderId)
    expect(res.body.user.email).toBe(customerEmail)
    expect(res.body.payment.amount).toBe(175000)
    expect(res.body.items[0].productTitle).toBe(updatedTitle)
    expect(res.body.customerNote).toContain('tez ko\'rib')
  })

  it('mijoz boshqa mijozning buyurtmasini ko\'ra olmaydi', async () => {
    const res = await request(app).get(`/api/orders/my/${orderId}`).set(auth(otherToken))
    expect(res.status).toBe(404)
  })
})

describe('13-16. Chek yuklash — hech qachon to\'lovni tasdiqlamaydi', () => {
  it('TEST 2: chek yuklash buyurtmani faqat PAYMENT_REVIEW ga o\'tkazadi', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/receipt`)
      .set(auth(userToken))
      .attach('receipt', fakeReceipt, 'fake-receipt.png')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PAYMENT_REVIEW')
    expect(res.body.paymentStatus).toBe('PENDING_REVIEW')
    receiptId = res.body.receipt.id

    const payment = await prisma.payment.findUnique({ where: { orderId } })
    expect(payment?.status).toBe('PENDING_REVIEW')
    expect(payment?.verifiedAt).toBeNull()
  })

  it('TEST 3: soxta chekdan keyin buyurtma PAID emas', async () => {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    expect(order?.status).toBe('PAYMENT_REVIEW')
    expect(order?.paymentStatus).toBe('PENDING_REVIEW')
    expect(await prisma.download.count({ where: { orderId } })).toBe(0)
  })

  it('chek yuklash hodisasi uchun bittagina bildirishnoma yaratiladi (dedupe)', async () => {
    const count = await prisma.notification.count({ where: { dedupeKey: `receipt:${receiptId}` } })
    expect(count).toBe(1)

    const status = notificationStatus()
    expect(status.smsConfigured).toBe(false)

    const res = await request(app).get('/api/admin/notifications').set(auth(adminToken))
    expect(res.status).toBe(200)
    adminNotifications = res.body
    expect(adminNotifications.some((n: any) => n.body.includes(orderNumber))).toBe(true)
  })

  it('faqat ruxsat etilgan formatlar qabul qilinadi', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/receipt`)
      .set(auth(userToken))
      .attach('receipt', Buffer.from('MZ\u0000malicious'), 'virus.exe')
    expect(res.status).toBe(400)
  })

  it('admin chekni ko\'rish uchun himoyalangan endpoint mavjud', async () => {
    const res = await request(app)
      .get(`/api/admin/orders/${orderId}/receipt/${receiptId}`)
      .set(auth(adminToken))
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)

    const asUser = await request(app)
      .get(`/api/admin/orders/${orderId}/receipt/${receiptId}`)
      .set(auth(userToken))
    expect(asUser.status).toBe(403)
  })
})

describe('17-22. Yuklab olish xavfsizligi', () => {
  it('TEST 5: tasdiqlanmagan buyurtma uchun ZIP yuklab olinmaydi', async () => {
    const leak = await prisma.download.create({
      data: {
        orderId, productId, userId, fileId,
        fileName: 'leak.zip', size: zipBuffer.length,
      },
    })
    const res = await request(app).get(`/api/downloads/${leak.id}/file`).set(auth(userToken))
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('tasdiqlanmagan')
    await prisma.download.delete({ where: { id: leak.id } })
  })

  it('TEST 6: autentifikatsiyasiz va boshqa rollar ZIP ololmaydi', async () => {
    const leak = await prisma.download.create({
      data: { orderId, productId, userId, fileId, fileName: 'leak.zip', size: zipBuffer.length },
    })
    const noToken = await request(app).get(`/api/downloads/${leak.id}/file`)
    expect(noToken.status).toBe(401)

    const adminAsUser = await request(app).get(`/api/downloads/${leak.id}/file`).set(auth(adminToken))
    expect(adminAsUser.status).toBe(401)

    const other = await request(app).get(`/api/downloads/${leak.id}/file`).set(auth(otherToken))
    expect(other.status).toBe(404)
    await prisma.download.delete({ where: { id: leak.id } })
  })

  it('TEST 7: admin rad etadi — sabab saqlanadi, fayl ochilmaydi', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/verify`)
      .set(auth(adminToken))
      .send({ action: 'REJECT', reason: 'To\'lov tushganligi tasdiqlanmadi' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('REJECTED')
    expect(res.body.paymentStatus).toBe('REJECTED')

    const verification = await prisma.paymentVerification.findFirst({
      where: { orderId, action: 'REJECT' },
    })
    expect(verification?.reason).toContain('tasdiqlanmadi')
    expect(verification?.adminId).toBeTruthy()
    expect(await prisma.download.count({ where: { orderId } })).toBe(0)
  })

  it('TEST 8: rad etishda sabab majburiy', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/verify`)
      .set(auth(adminToken))
      .send({ action: 'REJECT', reason: '' })
    expect(res.status).toBe(400)
  })

  it('mijoz tuzatilgan chekni qayta yuborishi mumkin', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/receipt`)
      .set(auth(userToken))
      .attach('receipt', fakeReceipt, 'corrected-receipt.png')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PAYMENT_REVIEW')
  })
})

describe('23-28. Admin tasdiqlashi va himoyalangan yetkazib berish', () => {
  it('TEST 9/10: admin haqiqiy to\'lovni tasdiqlagach fayl ochiladi', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/verify`)
      .set(auth(adminToken))
      .send({ action: 'APPROVE' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('COMPLETED')
    expect(res.body.paymentStatus).toBe('PAID')

    const payment = await prisma.payment.findUnique({ where: { orderId } })
    expect(payment?.status).toBe('PAID')
    expect(payment?.verifiedAt).toBeTruthy()

    const downloads = await request(app).get('/api/downloads').set(auth(userToken))
    expect(downloads.status).toBe(200)
    expect(downloads.body.length).toBe(1)
    downloadId = downloads.body[0].id

    const file = await request(app)
      .get(`/api/downloads/${downloadId}/file`)
      .set(auth(userToken))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => callback(null, Buffer.concat(chunks)))
      })
    expect(file.status).toBe(200)
    expect(file.headers['content-disposition']).toContain('attachment')
    expect((file.body as Buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('TEST 11: boshqa mijozning ZIP fayliga kirish taqiqlanadi', async () => {
    const res = await request(app).get(`/api/downloads/${downloadId}/file`).set(auth(otherToken))
    expect(res.status).toBe(404)
  })

  it('TEST 12: takroriy tasdiqlash dublikat yaratmaydi (idempotent)', async () => {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/verify`)
      .set(auth(adminToken))
      .send({ action: 'APPROVE' })
    expect(res.status).toBe(200)

    expect(await prisma.payment.count({ where: { orderId } })).toBe(1)
    expect(await prisma.download.count({ where: { orderId } })).toBe(1)
    expect(await prisma.paymentVerification.count({ where: { orderId, action: 'APPROVE' } })).toBe(1)
    expect(await prisma.transaction.count({ where: { orderId } })).toBe(1)
  })

  it('TEST 10: private fayl yo\'li hech qaerda ochiqko\'rinishda emas', async () => {
    const media = await request(app).get(`/api/media/${fileId}`)
    expect(media.status).toBe(404)

    const product = await request(app).get(`/api/products/${productSlug}`)
    expect(JSON.stringify(product.body)).not.toContain('storagePath')
    expect(JSON.stringify(product.body)).not.toContain('products/')
  })

  it('yangi app instansiyasi va qayta kirishdan keyin ma\'lumotlar saqlanadi', async () => {
    const fresh = request(createApp())
    const me = await fresh.get('/api/auth/me').set(auth(userToken))
    expect(me.status).toBe(200)

    const relogin = await request(app).post('/api/auth/login').send({ email: customerEmail, password })
    expect(relogin.status).toBe(200)
    const orders = await request(app).get('/api/orders/my').set(auth(relogin.body.token))
    expect(orders.body.some((o: any) => o.id === orderId)).toBe(true)
  })
})

describe('29-30. Baza statistikasi va eski katalog migratsiyasi', () => {
  it('dashboard haqiqiy ma\'lumotlardan hisoblanadi', async () => {
    const res = await request(app).get('/api/admin/dashboard').set(auth(adminToken))
    expect(res.status).toBe(200)
    expect(res.body.totalOrders).toBeGreaterThanOrEqual(1)
    expect(res.body.totalProducts).toBeGreaterThanOrEqual(12)
    expect(res.body.totalRevenue).toBeGreaterThan(0)
    expect(res.body.salesChart.length).toBe(7)
  })

  it('TEST 1/3: seed qilingan eski loyihalar ham adminda, ham do\'konda mavjud', async () => {
    const adminProducts = await request(app)
      .get('/api/admin/products')
      .query({ limit: 100 })
      .set(auth(adminToken))
    const storeProducts = await request(app).get('/api/products').query({ limit: 100 })
    expect(adminProducts.status).toBe(200)
    expect(storeProducts.status).toBe(200)

    const storeIds = new Set(storeProducts.body.items.map((p: any) => p.id))
    const published = adminProducts.body.items.filter((p: any) => p.status === 'PUBLISHED')
    for (const p of published) expect(storeIds.has(p.id)).toBe(true)
    expect(published.length).toBeGreaterThanOrEqual(12)
  })
})
