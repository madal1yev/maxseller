import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  config, readDb, writeDb, updateDb, uid, nowIso, rootDir, imagesDir,
  bearer, verifyToken, signToken, requireAuth, requireAdmin, hashPassword, verifyPassword,
  publicUser, clean, normalizePhone, normalizeEmail, isEmail, assertUniqueContact,
  logActivity, paymentProvidersConfigured,
} from './lib/core.js'
import {
  saveImage, saveProductFile, mediaPath, privateFilePath, receiptPath, fileChecksum,
} from './lib/storage.js'
import {
  ORDER_STATUSES, STATUS_LABELS, PAYMENT_LABELS, allowedStatuses, orderNumber,
  orderText, notifyOrderEvent, createOrder, changeOrderStatus, confirmOrder, rejectOrder,
  submitPayment, verifyPayment, makeReceipt, getStats, publicOrder, paymentMethods,
} from './lib/service.js'
import {
  requestOtp, verifyOtp, providerStatus, normalizeCartItems, getCart, saveCart,
  clearCart, AuthError, ProviderError,
} from './lib/auth.js'
import { customerSummary, customerDetail, customerPurchases, customerReceipts, customerTransactions } from './lib/customer.js'
import { EVENTS, notify } from './lib/notifications.js'
import { startTelegram, stopTelegram, handleWebhookUpdate, telegramStatus, sendAdminMessage } from './telegram/index.js'

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '16mb' }))

const broadcast = (() => {
  const clients = new Set()
  return {
    add: (res) => clients.add(res),
    remove: (res) => clients.delete(res),
    send: (type = 'update', data = {}) => {
      for (const res of clients) {
        res.write(`event: ${type}\ndata: ${JSON.stringify({ at: Date.now(), ...data })}\n\n`)
      }
    },
  }
})()

// Ommaviy sozlamalarga buyurtma yo'naltirish bilan bog'liq eski maydonlar qo'shilmaydi.
function publicSettings(db) {
  const { adminPassword: _hidden, ...settings } = db.settings
  return settings
}

function authError(res, err) {
  const status = err instanceof AuthError
    ? ({ OTP_NOT_FOUND: 404, AUTH_REQUIRED: 401, USER_NOT_FOUND: 404, ACCOUNT_BLOCKED: 403, ACCOUNT_SUSPENDED: 403 }[err.code] || 400)
    : err instanceof ProviderError ? 503 : 400
  const payload = { error: err instanceof Error ? err.message : 'Xatolik' }
  if (err?.code) payload.code = err.code
  if (err?.retryAfterSeconds) payload.retryAfterSeconds = err.retryAfterSeconds
  if (err?.remainingAttempts !== undefined) payload.remainingAttempts = err.remainingAttempts
  return res.status(status).json(payload)
}

/* ------------------------------ SSE ------------------------------ */
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  res.write('event: hello\ndata: {}\n\n')
  broadcast.add(res)
  const ping = setInterval(() => res.write(': ping\n\n'), 20000)
  req.on('close', () => { clearInterval(ping); broadcast.remove(res) })
})

/* --------------------------- Public media --------------------------- */
app.get('/media/images/:name', (req, res) => {
  const target = mediaPath(`/media/images/${req.params.name}`)
  if (!target) return res.status(404).end()
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.sendFile(target)
})

/* --------------------------- Public API --------------------------- */
app.get('/api/bootstrap', (_req, res) => {
  const db = readDb()
  res.json({
    products: db.products.filter((p) => p.active),
    settings: publicSettings(db),
    paymentMethods: paymentMethods(),
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, telegram: telegramStatus(), time: nowIso() })
})

/* --------------------------- Customer auth --------------------------- */
const userFromRequest = (req) => {
  const payload = verifyToken(bearer(req))
  if (!payload?.uid || payload.role !== 'customer') return null
  return readDb().users.find((user) => user.id === payload.uid && user.role === 'customer') || null
}

app.get('/api/auth/providers', (_req, res) => res.json(providerStatus()))

app.post('/api/auth/otp/request', async (req, res) => {
  try {
    const purpose = clean(req.body?.purpose, 30) === 'verify_contact' ? 'verify_contact' : 'login'
    if (purpose === 'verify_contact' && !userFromRequest(req)) {
      return res.status(401).json({ error: 'Kirish talab qilinadi', code: 'AUTH_REQUIRED' })
    }
    const result = await requestOtp({
      channel: req.body?.channel,
      phone: req.body?.phone,
      email: req.body?.email,
      name: req.body?.name,
      purpose,
    })
    res.json(result)
  } catch (err) { return authError(res, err) }
})

app.post('/api/auth/otp/verify', (req, res) => {
  try {
    const purpose = clean(req.body?.purpose, 30) === 'verify_contact' ? 'verify_contact' : 'login'
    const actorUser = purpose === 'verify_contact' ? userFromRequest(req) : null
    if (purpose === 'verify_contact' && !actorUser) {
      return res.status(401).json({ error: 'Kirish talab qilinadi', code: 'AUTH_REQUIRED' })
    }
    const result = verifyOtp({
      requestId: req.body?.requestId,
      code: req.body?.code,
      name: req.body?.name,
      purpose,
      actorUser,
      cart: req.body?.cart,
      guestToken: req.body?.guestToken,
    })
    res.json(result)
  } catch (err) { return authError(res, err) }
})

// OTP tasdiqlashsiz akkaunt yaratish/kirish endi mumkin emas.
app.post('/api/auth/register', (_req, res) => res.status(410).json({
  error: 'Ro\'yxatdan o\'tish OTP orqali amalga oshiriladi', code: 'USE_OTP',
}))
app.post('/api/auth/login', (_req, res) => res.status(410).json({
  error: 'Kirish OTP orqali amalga oshiriladi', code: 'USE_OTP',
}))

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const result = updateDb((db) => {
      const user = db.users.find((u) => u.id === req.user.id)
      const name = clean(req.body?.name, 120)
      const nextPhone = normalizePhone(req.body?.phone)
      const nextEmail = normalizeEmail(req.body?.email)
      if (name.length >= 2) user.name = name

      if (nextPhone && nextPhone !== user.phone) {
        assertUniqueContact(db, { phone: nextPhone, excludeId: user.id })
        user.phone = nextPhone
        user.phoneDisplay = nextPhone
        user.phoneVerified = false
      }
      if (req.body?.email !== undefined) {
        if (nextEmail && nextEmail !== user.email) {
          assertUniqueContact(db, { email: nextEmail, excludeId: user.id })
          user.email = nextEmail
          user.emailVerified = false
        } else if (!nextEmail) {
          user.email = ''
          user.emailVerified = false
        }
      }
      user.telegramNotifications = req.body?.telegramNotifications !== false
      logActivity(db, user.name, 'PROFILE_UPDATE', `customer:${user.customerNumber || user.id}`)
      return publicUser(user)
    })
    res.json({ user: result })
  } catch (err) { return res.status(400).json({ error: err instanceof Error ? err.message : 'Xatolik' }) }
})

app.post('/api/auth/password', requireAuth, (req, res) => {
  const user = readDb().users.find((u) => u.id === req.user.id)
  const next = String(req.body?.next || '')
  if (next.length < 6) return res.status(400).json({ error: 'Yangi parol kamida 6 belgi bo\'lsin' })
  if (user.passwordHash && !verifyPassword(req.body?.current || '', user.passwordHash)) {
    return res.status(400).json({ error: 'Joriy parol noto\'g\'ri' })
  }
  updateDb((db) => {
    const target = db.users.find((u) => u.id === req.user.id)
    target.passwordHash = hashPassword(next)
    logActivity(db, target.name, 'PASSWORD_SET', `customer:${target.customerNumber || target.id}`)
  })
  res.json({ ok: true })
})

/* --------------------------- Server cart --------------------------- */
app.get('/api/cart', requireAuth, (req, res) => res.json({ items: getCart(readDb(), req.user.id) }))

app.put('/api/cart', requireAuth, (req, res) => {
  let items = []
  updateDb((db) => { items = saveCart(db, req.user.id, req.body?.items) })
  res.json({ items })
})

app.delete('/api/cart', requireAuth, (req, res) => {
  updateDb((db) => { clearCart(db, req.user.id) })
  res.json({ ok: true, items: [] })
})

app.post('/api/auth/telegram-link', requireAuth, (req, res) => {
  const code = clean(req.body?.code, 10)
  let result
  updateDb((db) => {
    const link = db.linkCodes.find((c) => c.code === code && !c.usedAt && c.expiresAt > Date.now())
    if (!link) { result = { error: 'Kod topilmadi yoki muddati tugagan' }; return }
    const other = db.users.find((u) => u.telegramId === link.telegramId && u.id !== req.user.id)
    if (other) { result = { error: 'Bu Telegram boshqa akkauntga bog\'langan' }; return }
    const user = db.users.find((u) => u.id === req.user.id)
    user.telegramId = link.telegramId
    user.telegramUsername = link.telegramUsername || ''
    link.usedAt = nowIso()
    result = { ok: true, user: publicUser(user) }
  })
  if (result.error) return res.status(400).json({ error: result.error })
  res.json(result)
})

app.post('/api/auth/telegram-unlink', requireAuth, (_req, res) => {
  updateDb((db) => {
    const user = db.users.find((u) => u.id === req.user.id)
    user.telegramId = null
    user.telegramUsername = ''
  })
  res.json({ ok: true })
})

/* --------------------------- Orders (customer) --------------------------- */
app.post('/api/orders', requireAuth, (req, res) => {
  const result = createOrder({ body: req.body, user: req.user })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders', { orderNumber: result.order.orderNumber })
  res.status(result.duplicate ? 200 : 201).json({ order: publicOrder(result.order) })
})

app.post('/api/orders/track', (req, res) => {
  const number = clean(req.body?.orderNumber, 40)
  const token = clean(req.body?.token, 120)
  if (!number || !token) return res.status(400).json({ error: 'Buyurtma raqami va token kerak' })
  const order = readDb().orders.find((o) => o.orderNumber === number && o.guestToken === token)
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi yoki token noto\'g\'ri' })
  res.json({ order: publicOrder(order) })
})

function findOwnOrder(req, res, next) {
  const order = readDb().orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  const token = clean(req.query.token || req.body?.token || req.body?.guestToken, 120)
  const isOwner = (req.user && order.userId === req.user.id) || (order.guestToken && order.guestToken === token)
  if (!isOwner) return res.status(403).json({ error: 'Bu buyurtma sizga tegishli emas' })
  req.order = order
  next()
}

const optionalAuth = (req, _res, next) => {
  const payload = verifyToken(bearer(req))
  if (payload?.uid) {
    const user = readDb().users.find((u) => u.id === payload.uid)
    if (user) req.user = user
  }
  next()
}

app.get('/api/orders', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Buyurtmalarni ko\'rish uchun kiring' })
  const orders = readDb().orders.filter((o) => o.userId === req.user.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({ orders: orders.map(publicOrder) })
})

app.get('/api/orders/:id', optionalAuth, findOwnOrder, (req, res) => {
  const db = readDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  res.json({
    order: publicOrder(order),
    history: db.statusHistory.filter((h) => h.orderId === order.id),
    payments: db.payments.filter((p) => p.orderId === order.id).map(({ receipt, ...rest }) => rest),
    receipts: db.receipts.filter((r) => r.orderId === order.id).map(({ filePath, ...rest }) => rest),
    deliveries: db.deliveries.filter((d) => d.orderId === order.id),
  })
})

app.post('/api/orders/:id/cancel', optionalAuth, findOwnOrder, (req, res) => {
  if (!['NEW', 'PENDING_CONFIRMATION', 'AWAITING_PAYMENT'].includes(req.order.status)) {
    return res.status(400).json({ error: 'Bu holatda buyurtmani bekor qilib bo\'lmaydi' })
  }
  const result = changeOrderStatus({ orderId: req.order.id, status: 'CANCELLED', actor: req.user?.name || 'mijoz', actorType: 'customer' })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order) })
})

app.post('/api/orders/:id/payment', optionalAuth, findOwnOrder, (req, res) => {
  const result = submitPayment({
    orderId: req.order.id,
    dataUrl: req.body?.receipt,
    note: req.body?.note,
    method: req.body?.method,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.status(201).json({ payment: { ...result.payment, receipt: undefined }, order: publicOrder(result.order) })
})

app.get('/api/orders/:id/receipt', optionalAuth, findOwnOrder, (req, res) => {
  const result = makeReceipt(req.order.id)
  if (result.error) return res.status(400).json({ error: result.error })
  const target = receiptPath(result.receipt.filePath)
  if (!target) return res.status(404).json({ error: 'Hujjat fayli topilmadi' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${result.receipt.number}.pdf"`)
  res.sendFile(target)
})

app.post('/api/orders/:id/download-token', optionalAuth, findOwnOrder, (req, res) => {
  const db = readDb()
  const order = db.orders.find((o) => o.id === req.order.id)
  if (order.paymentStatus !== 'PAID' || !['READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'IN_PROGRESS'].includes(order.status)) {
    return res.status(403).json({ error: 'Mahsulotni olish huquqi yo\'q: to\'lov tasdiqlanmagan' })
  }
  const requestedProduct = clean(req.body?.productId, 120)
  const delivery = requestedProduct
    ? db.deliveries.find((d) => d.orderId === order.id && d.productId === requestedProduct)
    : db.deliveries.find((d) => d.orderId === order.id)
  if (!delivery) return res.status(403).json({ error: 'Mahsulot topshirilmagan' })
  const token = uid('dl_')
  db.downloads.unshift({
    id: uid('dwt_'), token, orderId: order.id, userId: order.userId,
    productId: delivery.productId, expiresAt: Date.now() + 60 * 60 * 1000,
    usedAt: null, createdAt: nowIso(),
  })
  writeDb(db)
  res.json({ url: `/api/download/${token}`, expiresInSeconds: 3600 })
})

app.get('/api/download/:token', (req, res) => {
  let result
  updateDb((db) => {
    const grant = db.downloads.find((d) => d.token === req.params.token)
    if (!grant) { result = { error: 'Havola topilmadi' }; return }
    if (grant.expiresAt < Date.now()) { result = { error: 'Havola muddati tugagan' }; return }
    const order = db.orders.find((o) => o.id === grant.orderId)
    if (!order || order.paymentStatus !== 'PAID') { result = { error: 'To\'lov tasdiqlanmagan' }; return }
    const delivery = db.deliveries.find((d) => d.orderId === order.id && d.productId === grant.productId)
    const product = db.products.find((p) => p.id === grant.productId)
    if (!delivery || !product?.filePath) { result = { error: 'Fayl hali biriktirilmagan' }; return }
    const target = privateFilePath(product.filePath)
    if (!target) { result = { error: 'Fayl topilmadi' }; return }
    grant.usedAt = grant.usedAt || nowIso()
    result = { target, name: path.basename(target) }
  })
  if (result.error) return res.status(403).json({ error: result.error })
  res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`)
  res.sendFile(result.target)
})

/* --------------------------- Payments --------------------------- */
app.get('/api/payments/methods', (_req, res) => res.json({ methods: paymentMethods() }))

app.get('/api/payments/my', requireAuth, (req, res) => {
  const db = readDb()
  const orderIds = new Set(db.orders.filter((o) => o.userId === req.user.id).map((o) => o.id))
  const payments = db.payments.filter((p) => orderIds.has(p.orderId)).map(({ receipt, ...rest }) => rest)
  res.json({ payments })
})

/* --------------------------- Customer account --------------------------- */
app.get('/api/customer/summary', requireAuth, (req, res) => {
  const db = readDb()
  const user = db.users.find((u) => u.id === req.user.id && u.role === 'customer')
  if (!user) return res.status(404).json({ error: 'Mijoz topilmadi' })
  res.json(customerDetail(db, user.id))
})

app.get('/api/customer/purchases', requireAuth, (req, res) => {
  res.json({ purchases: customerPurchases(readDb(), req.user.id) })
})

app.get('/api/customer/receipts', requireAuth, (req, res) => {
  res.json({ receipts: customerReceipts(readDb(), req.user.id) })
})

app.get('/api/customer/transactions', requireAuth, (req, res) => {
  res.json({ transactions: customerTransactions(readDb(), req.user.id) })
})

app.get('/api/customer/activity', requireAuth, (req, res) => {
  const detail = customerDetail(readDb(), req.user.id)
  res.json({ activity: detail?.activity || [] })
})

function webhookSecretValid(bot, secret) {
  return Boolean(secret) && secret === config.telegram.webhookSecret && config.telegram.mode === 'webhook'
}

app.post('/api/telegram/:bot/:secret', async (req, res) => {
  const bot = req.params.bot === 'admin' ? 'admin' : 'customer'
  if (!webhookSecretValid(bot, req.params.secret)) return res.status(401).json({ error: 'Webhook secret noto\'g\'ri' })
  try {
    await handleWebhookUpdate(bot, req.body)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function providerSignatureValid(provider, req) {
  if (provider === 'click') {
    const secret = config.payments.clickSecretKey
    const { merchant_id, amount, transaction_id, sign } = { ...req.body, ...req.query }
    if (!secret || merchant_id !== config.payments.clickMerchantId) return false
    const expected = crypto.createHash('md5')
      .update(`${sign_string(secret, merchant_id, amount, transaction_id)}`).digest('hex')
    return String(sign || '').toLowerCase() === expected
  }
  if (provider === 'payme') {
    const secret = config.payments.paymeSecretKey
    if (!secret) return false
    const auth = req.headers.authorization || ''
    const expected = Buffer.from(`Payme:${secret}`).toString('base64')
    return auth === expected
  }
  return false
}

function sign_string(secret, merchant, amount, transaction) {
  return `${secret}${merchant}${amount}${transaction}`
}

app.post('/api/webhooks/:provider', async (req, res) => {
  const provider = req.params.provider
  if (!['click', 'payme'].includes(provider)) return res.status(404).json({ error: 'Provider topilmadi' })
  const configured = provider === 'click'
    ? Boolean(config.payments.clickMerchantId && config.payments.clickSecretKey)
    : Boolean(config.payments.paymeMerchantId && config.payments.paymeSecretKey)
  if (!configured) return res.status(503).json({ error: `${provider} sozlanmagan — to'lov qabul qilinmadi` })
  if (!providerSignatureValid(provider, req)) return res.status(401).json({ error: 'Imzolanmagan webhook rad etildi' })

  const orderRef = String(req.body.orderNumber || req.body.order_number || req.body.account?.order_id || req.query.orderNumber || '')
  let result
  updateDb((db) => {
    const order = db.orders.find((o) => o.orderNumber === orderRef)
    if (!order) { result = { error: 'Buyurtma topilmadi' }; return }
    const payment = db.payments.find((p) => p.orderId === order.id && p.status !== 'PAID')
      || db.payments.find((p) => p.orderId === order.id)
    if (payment?.status === 'PAID') { result = { ok: true, duplicate: true }; return }
    if (!payment) { result = { error: 'To\'lov yozuvi topilmadi' }; return }
    payment.transactionId = String(req.body.transaction_id || req.body.transactionId || req.body.id || uid('tx_'))
    result = { ok: true, payment }
  })
  if (result.error) return res.status(400).json({ error: result.error })
  if (result.duplicate) return res.json({ ok: true, duplicate: true })
  const verified = verifyPayment({ paymentId: result.payment.id, approve: true, actor: `webhook:${provider}` })
  if (verified.error) return res.status(400).json({ error: verified.error })
  broadcast.send('orders')
  res.json({ ok: true })
})

/* --------------------------- Admin auth --------------------------- */
app.post('/api/admin/login', (req, res) => {
  const db = readDb()
  const expected = config.adminPassword || String(db.settings.adminPassword || 'admin123')
  if (String(req.body?.password || '') !== expected) return res.status(401).json({ error: 'Parol noto\'g\'ri' })
  let admin = db.users.find((u) => u.role === 'admin')
  if (!admin) {
    updateDb((current) => {
      admin = {
        id: uid('adm_'), name: 'MaxSeller Admin', phone: '+998900000000',
        passwordHash: hashPassword(uid()), role: 'admin', createdAt: nowIso(),
      }
      current.users.unshift(admin)
    })
  }
  res.json(signAdmin(admin))
})

function signAdmin(admin) {
  // Admin tokeni oddiy session emas, imzolangan token (qayta ishga tushirishga chidamli)
  const payload = JSON.stringify({ uid: admin.id, role: 'admin', exp: Date.now() + 12 * 3600 * 1000 })
  const body = Buffer.from(payload).toString('base64url')
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(body).digest('base64url')
  return { token: `${body}.${sig}` }
}

app.post('/api/admin/logout', (_req, res) => res.json({ ok: true }))

/* --------------------------- Admin API --------------------------- */
app.get('/api/admin/data', requireAdmin, (_req, res) => {
  const db = readDb()
  res.json({
    products: db.products, settings: publicSettings(db), stats: getStats(),
    telegram: telegramStatus(),
  })
})

app.get('/api/admin/stats', requireAdmin, (_req, res) => res.json(getStats()))

function normalizeProduct(body, existing = {}) {
  const title = String(body.title ?? existing.title ?? '').trim()
  if (!title) throw new Error('Mahsulot nomi majburiy')
  return {
    ...existing,
    title: title.slice(0, 200),
    cat: ['web', 'design', 'docs', 'video'].includes(body.cat) ? body.cat : existing.cat || 'web',
    desc: String(body.desc ?? existing.desc ?? '').trim().slice(0, 2000),
    price: Math.max(0, Number(body.price ?? existing.price ?? 0) || 0),
    oldPrice: Math.max(0, Number(body.oldPrice ?? existing.oldPrice ?? 0) || 0),
    tag: String(body.tag ?? existing.tag ?? '').trim().slice(0, 24),
    image: String(body.image ?? existing.image ?? '').trim().slice(0, 500),
    filePath: existing.filePath || '',
    fileName: existing.fileName || '',
    active: body.active === undefined ? existing.active !== false : Boolean(body.active),
    orders: Number(existing.orders) || 0,
    createdAt: existing.createdAt || nowIso(),
    updatedAt: nowIso(),
  }
}

async function withImage(req, product) {
  if (req.body?.imageData) product.image = saveImage(req.body.imageData, 'product')
  return product
}

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    let created
    updateDb((db) => {
      const product = normalizeProduct(req.body || {})
      product.id = uid('prd_')
      withImage(req, product)
      db.products.unshift(product)
      created = product
    })
    broadcast.send('products')
    res.status(201).json(created)
  } catch (err) { res.status(400).json({ error: err.message }) }
})

const editProduct = (handler) => async (req, res) => {
  const db = readDb()
  const index = db.products.findIndex((p) => p.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Mahsulot topilmadi' })
  return handler(req, res, db, index)
}

app.put('/api/admin/products/:id', requireAdmin, editProduct(async (req, res, db, index) => {
  try {
    const product = normalizeProduct(req.body || {}, db.products[index])
    await withImage(req, product)
    db.products[index] = product
    writeDb(db)
    broadcast.send('products')
    res.json(product)
  } catch (err) { res.status(400).json({ error: err.message }) }
}))

app.patch('/api/admin/products/:id', requireAdmin, editProduct((_req, res, db, index) => {
  db.products[index].active = !db.products[index].active
  db.products[index].updatedAt = nowIso()
  writeDb(db)
  broadcast.send('products')
  res.json(db.products[index])
}))

app.delete('/api/admin/products/:id', requireAdmin, editProduct((_req, res, db, index) => {
  db.products.splice(index, 1)
  writeDb(db)
  broadcast.send('products')
  res.json({ ok: true })
}))

app.post('/api/admin/products/:id/image', requireAdmin, editProduct((req, res, db, index) => {
  try {
    db.products[index].image = saveImage(req.body?.imageData, 'product')
    db.products[index].updatedAt = nowIso()
    writeDb(db)
    broadcast.send('products')
    res.json({ image: db.products[index].image })
  } catch (err) { res.status(400).json({ error: err.message }) }
}))

app.post('/api/admin/products/:id/file', requireAdmin, editProduct((req, res, db, index) => {
  try {
    const product = db.products[index]
    product.filePath = saveProductFile(req.body?.fileData, req.body?.fileName || 'product')
    product.fileName = clean(req.body?.fileName, 200) || 'product'
    product.updatedAt = nowIso()
    writeDb(db)
    broadcast.send('products')
    res.json({ ok: true, fileName: product.fileName })
  } catch (err) { res.status(400).json({ error: err.message }) }
}))

app.get('/api/admin/files/:name', requireAdmin, (req, res) => {
  const target = privateFilePath(`/files/${req.params.name}`)
  if (!target) return res.status(404).json({ error: 'Fayl topilmadi' })
  res.sendFile(target)
})

/* --------------------------- Admin orders --------------------------- */
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const db = readDb()
  const q = clean(req.query.q, 100).toLocaleLowerCase('uz')
  const status = clean(req.query.status, 40)
  let orders = [...db.orders]
  if (status && status !== 'all') orders = orders.filter((o) => o.status === status)
  if (q) orders = orders.filter((o) => `${o.orderNumber} ${o.customer?.name} ${o.customer?.phone} ${o.items?.map((i) => i.title).join(' ')}`.toLocaleLowerCase('uz').includes(q))
  orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({
    orders: orders.map(publicOrder),
    statuses: ORDER_STATUSES.map((id) => ({ id, label: STATUS_LABELS[id] })),
  })
})

app.get('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = readDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  const customer = db.users.find((u) => u.id === order.userId)
  res.json({
    order: publicOrder(order),
    customer: customer ? publicUser(customer) : order.customer,
    history: db.statusHistory.filter((h) => h.orderId === order.id),
    payments: db.payments.filter((p) => p.orderId === order.id).map(({ receipt, ...rest }) => ({
      ...rest, hasReceipt: Boolean(receipt),
    })),
    receipts: db.receipts.filter((r) => r.orderId === order.id).map(({ filePath, ...rest }) => rest),
    allowedStatuses: allowedStatuses(order),
  })
})

app.post('/api/admin/orders/:id/confirm', requireAdmin, (req, res) => {
  const result = confirmOrder(req.params.id, req.user.name)
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order) })
})

app.post('/api/admin/orders/:id/reject', requireAdmin, (req, res) => {
  const result = rejectOrder(req.params.id, req.user.name, req.body?.reason)
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order) })
})

app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const result = changeOrderStatus({
    orderId: req.params.id, status: req.body?.status,
    actor: req.user.name, actorType: 'admin', reason: req.body?.reason,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order) })
})

app.patch('/api/admin/orders/:id/price', requireAdmin, (req, res) => {
  let order
  updateDb((db) => {
    const target = db.orders.find((o) => o.id === req.params.id)
    if (!target) { order = null; return }
    const total = Math.max(0, Number(req.body?.total) || 0)
    target.total = total || target.total
    target.discount = Math.max(0, Number(req.body?.discount) || 0)
    target.deadline = clean(req.body?.deadline, 120)
    target.adminPrice = total
    target.updatedAt = nowIso()
    logActivity(db, req.user.name, 'PRICE_SET', `order:${target.orderNumber}`, { total })
    order = target
  })
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  broadcast.send('orders')
  res.json({ order: publicOrder(order) })
})

app.post('/api/admin/orders/:id/file', requireAdmin, (req, res) => {
  try {
    let order
    updateDb((db) => {
      const target = db.orders.find((o) => o.id === req.params.id)
      if (!target) { order = null; return }
      const filePath = saveProductFile(req.body?.fileData, req.body?.fileName || 'project')
      target.files.push({ id: uid('fle_'), filePath, fileName: clean(req.body?.fileName, 200) || 'project', at: nowIso() })
      target.updatedAt = nowIso()
      logActivity(db, req.user.name, 'FILE_ATTACH', `order:${target.orderNumber}`)
      order = target
    })
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
    res.json({ order: publicOrder(order) })
  } catch (err) { res.status(400).json({ error: err.message }) }
})

app.post('/api/admin/orders/:id/complete', requireAdmin, (req, res) => {
  const result = changeOrderStatus({ orderId: req.params.id, status: 'COMPLETED', actor: req.user.name, actorType: 'admin' })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order) })
})

app.get('/api/admin/orders/:id/receipt', requireAdmin, (req, res) => {
  const result = makeReceipt(req.params.id)
  if (result.error) return res.status(400).json({ error: result.error })
  const target = receiptPath(result.receipt.filePath)
  if (!target) return res.status(404).json({ error: 'Hujjat topilmadi' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${result.receipt.number}.pdf"`)
  res.sendFile(target)
})

/* --------------------------- Admin payments --------------------------- */
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  const db = readDb()
  let payments = [...db.payments]
  if (clean(req.query.status, 30)) payments = payments.filter((p) => p.status === req.query.status)
  payments.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({
    payments: payments.map((p) => ({
      ...p, hasReceipt: Boolean(p.receipt),
      orderNumber: db.orders.find((o) => o.id === p.orderId)?.orderNumber || '—',
    })),
    labels: PAYMENT_LABELS,
  })
})

app.get('/api/admin/payments/:id/receipt', requireAdmin, (req, res) => {
  const payment = readDb().payments.find((p) => p.id === req.params.id)
  if (!payment?.receipt?.startsWith('data:image')) return res.status(404).json({ error: 'Chek rasmi yo\'q' })
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(payment.receipt)
  if (!match) return res.status(400).json({ error: 'Chek formati noto\'g\'ri' })
  res.setHeader('Content-Type', match[1])
  res.send(Buffer.from(match[2], 'base64'))
})

app.post('/api/admin/payments/:id/verify', requireAdmin, (req, res) => {
  const result = verifyPayment({
    paymentId: req.params.id, approve: req.body?.approve === true,
    actor: req.user.name, reason: req.body?.reason,
  })
  if (result.error) return res.status(400).json({ error: result.error })
  broadcast.send('orders')
  res.json({ order: publicOrder(result.order), payment: { ...result.payment, receipt: undefined } })
})

/* --------------------------- Admin customers / logs --------------------------- */
app.get('/api/admin/customers', requireAdmin, (_req, res) => {
  const db = readDb()
  const customers = db.users.filter((u) => u.role === 'customer').map((user) => customerSummary(db, user))
  customers.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({ customers })
})

app.get('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const db = readDb()
  const detail = customerDetail(db, req.params.id)
  if (!detail) return res.status(404).json({ error: 'Mijoz topilmadi' })
  res.json(detail)
})

app.patch('/api/admin/customers/:id/status', requireAdmin, (req, res) => {
  const status = clean(req.body?.status, 20)
  if (!['active', 'suspended', 'blocked'].includes(status)) return res.status(400).json({ error: 'Bunday akkaunt holati yo\'q' })
  let result
  updateDb((db) => {
    const user = db.users.find((u) => u.id === req.params.id && u.role === 'customer')
    if (!user) { result = null; return }
    user.accountStatus = status
    logActivity(db, req.user.name, `CUSTOMER_${status.toUpperCase()}`, `customer:${user.customerNumber || user.id}`, {
      reason: clean(req.body?.reason, 300),
    })
    result = publicUser(user)
  })
  if (!result) return res.status(404).json({ error: 'Mijoz topilmadi' })
  broadcast.send('orders')
  res.json({ customer: result })
})

app.get('/api/admin/notifications', requireAdmin, (_req, res) => {
  res.json({ notifications: readDb().notifications.slice(0, 100) })
})

app.get('/api/admin/activity', requireAdmin, (_req, res) => {
  res.json({ activity: readDb().activityLog.slice(0, 100) })
})

app.get('/api/admin/telegram', requireAdmin, (_req, res) => res.json(telegramStatus()))

app.post('/api/admin/telegram/test', requireAdmin, async (_req, res) => {
  try {
    await sendAdminMessage(`✅ MaxSeller test xabari. Buyurtmalar shu chatga keladi.\nVaqt: ${nowIso()}`)
    res.json({ ok: true })
  } catch (err) { res.status(502).json({ error: err.message }) }
})

/* --------------------------- Admin settings --------------------------- */
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const keys = [
    'telegramChannel', 'instagram', 'currency',
    'heroAccent', 'heroLead', 'catalogText', 'finalTitle', 'finalText',
    'supportEmail', 'supportPhone',
  ]
  updateDb((db) => {
    for (const key of keys) {
      if (req.body?.[key] !== undefined) db.settings[key] = String(req.body[key]).trim()
    }
    logActivity(db, req.user.name, 'SETTINGS_UPDATE')
  })
  broadcast.send('settings')
  res.json(publicSettings(readDb()))
})

app.post('/api/admin/password', requireAdmin, (req, res) => {
  const db = readDb()
  const expected = config.adminPassword || String(db.settings.adminPassword || 'admin123')
  if (String(req.body?.current || '') !== expected) return res.status(400).json({ error: 'Joriy parol noto\'g\'ri' })
  const next = String(req.body?.next || '')
  if (next.length < 4) return res.status(400).json({ error: 'Yangi parol kamida 4 belgi bo\'lsin' })
  db.settings.adminPassword = next
  writeDb(db)
  res.json({ ok: true })
})

/* --------------------------- Static frontend --------------------------- */
const distDir = path.join(rootDir, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('/admin', (_req, res) => res.sendFile(path.join(distDir, 'admin.html')))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((err, _req, res, _next) => {
  console.error('[server]', err instanceof Error ? err.message : err)
  res.status(500).json({ error: 'Server xatosi' })
})

// Serverless (Vercel) imports the app without opening a port or starting
// polling bots. Telegram webhooks still work through /api/telegram/...
const runAsServer = !process.env.VERCEL && !process.env.MAXSELLER_SERVERLESS
const server = runAsServer
  ? app.listen(config.port, () => {
      console.log(`MaxSeller API: http://localhost:${config.port}`)
      startTelegram()
    })
  : null

if (server) {
  process.on('SIGTERM', () => { stopTelegram(); server.close(() => process.exit(0)) })
  process.on('SIGINT', () => { stopTelegram(); server.close(() => process.exit(0)) })
}

export { app }
