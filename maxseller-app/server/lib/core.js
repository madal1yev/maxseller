// MaxSeller core: configuration, JSON database and security primitives.
// Mavjud db.json formati saqlanadi, yangi kolleksiyalar qo'shiladi.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import seed from '../data/seed.js'

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const rootDir = path.resolve(serverDir, '..')

// Vercel/serverless: filesystem is read-only except /tmp. Keep the same JSON
// database layout there so no request crashes on startup. Use a real persistent
// volume (MAXSELLER_DB_FILE) or an external DB for production data durability.
export const isServerless = Boolean(process.env.VERCEL || process.env.MAXSELLER_SERVERLESS)
const writableRoot = isServerless ? path.join('/tmp', 'maxseller') : serverDir
export const dataDir = isServerless ? path.join(writableRoot, 'data') : path.join(serverDir, 'data')
export const dbFile = process.env.MAXSELLER_DB_FILE
  ? path.resolve(process.env.MAXSELLER_DB_FILE)
  : path.join(dataDir, 'db.json')
export const storageDir = isServerless ? path.join(writableRoot, 'storage') : path.join(serverDir, 'storage')
export const imagesDir = path.join(storageDir, 'images')
export const filesDir = path.join(storageDir, 'files')
export const receiptsDir = path.join(storageDir, 'receipts')

/* ----------------------------- .env ----------------------------- */
const envFile = path.join(rootDir, '.env')
if (fs.existsSync(envFile)) {
  for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const at = line.indexOf('=')
    if (at < 1) continue
    const key = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

const num = (key, fallback) => {
  const value = Number(process.env[key])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const config = {
  port: num('PORT', 3001),
  storeUrl: process.env.STORE_URL || 'http://localhost:3001/',
  jwtSecret: process.env.JWT_SECRET || 'maxseller-insecure-dev-secret-change-me',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  telegram: {
    adminBotToken: process.env.TELEGRAM_ADMIN_BOT_TOKEN || '',
    customerBotToken: process.env.TELEGRAM_CUSTOMER_BOT_TOKEN || '',
    adminUsername: (process.env.TELEGRAM_ADMIN_USERNAME || 'madaliyev_a').replace(/^@/, ''),
    adminChatId: process.env.ADMIN_TELEGRAM_CHAT_ID || '',
    adminIds: (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map((v) => v.trim()).filter(Boolean),
    apiBaseUrl: (process.env.TELEGRAM_API_BASE_URL || 'https://api.telegram.org').replace(/\/$/, ''),
    mode: process.env.TELEGRAM_MODE === 'webhook' ? 'webhook' : 'polling',
    webhookBaseUrl: process.env.TELEGRAM_WEBHOOK_BASE_URL || '',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  },
  payments: {
    clickMerchantId: process.env.CLICK_MERCHANT_ID || '',
    clickSecretKey: process.env.CLICK_SECRET_KEY || '',
    paymeMerchantId: process.env.PAYME_MERCHANT_ID || '',
    paymeSecretKey: process.env.PAYME_SECRET_KEY || '',
  },
  otp: {
    ttlSeconds: num('OTP_TTL_SECONDS', 300),
    resendSeconds: num('OTP_RESEND_SECONDS', 60),
    maxAttempts: num('OTP_MAX_ATTEMPTS', 5),
    secret: process.env.OTP_SECRET || process.env.JWT_SECRET || 'maxseller-insecure-dev-secret-change-me',
  },
  providers: {
    sms: {
      name: (process.env.SMS_PROVIDER || '').trim().toLowerCase(),
      twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
      twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
      twilioFrom: process.env.TWILIO_FROM_NUMBER || '',
      eskizEmail: process.env.ESKIZ_EMAIL || '',
      eskizPassword: process.env.ESKIZ_PASSWORD || '',
      eskizFrom: process.env.ESKIZ_FROM || '',
      eskizUrl: process.env.ESKIZ_BASE_URL || 'https://notify.eskiz.uz/api',
    },
    email: {
      name: (process.env.EMAIL_PROVIDER || '').trim().toLowerCase(),
      resendKey: process.env.RESEND_API_KEY || '',
      from: process.env.EMAIL_FROM || '',
      resendUrl: process.env.RESEND_BASE_URL || 'https://api.resend.com',
      // API keysiz bepul yo'l: Gmail app password (SMTP).
      smtpHost: process.env.SMTP_HOST || '',
      smtpPort: num('SMTP_PORT', 587),
      smtpSecure: /^(1|true|yes)$/i.test(process.env.SMTP_SECURE || ''),
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      // Faqat mahalliy proxy/TLS muammosi uchun; productionda true qoldiring.
      smtpTlsRejectUnauthorized: !/^(0|false|no)$/i.test(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || ''),
      gmailUser: process.env.GMAIL_USER || '',
      gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
    },
  },
  limits: {
    imageMb: num('MAX_IMAGE_MB', 4),
    productFileMb: num('MAX_PRODUCT_FILE_MB', 20),
  },
}

export const paymentProvidersConfigured = () => ({
  click: Boolean(config.payments.clickMerchantId && config.payments.clickSecretKey),
  payme: Boolean(config.payments.paymeMerchantId && config.payments.paymeSecretKey),
  manual: true,
})

/* ----------------------------- Database ----------------------------- */
for (const dir of [dataDir, storageDir, imagesDir, filesDir, receiptsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2), 'utf8')

const COLLECTIONS = [
  'users', 'orders', 'statusHistory', 'payments', 'transactions',
  'deliveries', 'downloads', 'receipts', 'purchases', 'notifications',
  'otpCodes', 'carts', 'linkCodes', 'activityLog',
]

export function readDb() {
  let data
  try {
    data = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  } catch {
    data = structuredClone(seed)
  }
  if (!Array.isArray(data.products)) data.products = []
  if (!data.settings || typeof data.settings !== 'object') data.settings = { ...seed.settings }
  for (const key of COLLECTIONS) if (!Array.isArray(data[key])) data[key] = []
  if (!data.telegram || typeof data.telegram !== 'object') data.telegram = {}
  if (!data.telegram.offsets || typeof data.telegram.offsets !== 'object') data.telegram.offsets = {}
  if (!Array.isArray(data.telegram.processedUpdates)) data.telegram.processedUpdates = []

  // Mavjud ma'lumotlarni buzmasdan yangi sozlamalar qo'shish
  const defaults = {
    telegramChannel: 'maxseller_uz',
    instagram: 'maxseller_uz',
    currency: "so'm",
    heroAccent: 'bir joyda!',
    heroLead: '',
    catalogText: '',
    finalTitle: 'Kanalga qo\'shiling',
    finalText: '',
    supportEmail: '',
    supportPhone: '',
  }
  for (const [key, value] of Object.entries(defaults)) {
    if (data.settings[key] === undefined) data.settings[key] = value
  }
  data = migrateLegacyData(data)
  if (data.version !== 2) {
    data.version = 2
    writeDb(data)
  }
  return data
}

// Mavjud db.json ni buzmasdan yangi mijoz/OTP/savat maydonlariga o'tkazish.
function migrateLegacyData(data) {
  const usedPhones = new Set()
  const usedEmails = new Set()
  let customerSeq = 1000

  // Eski buyurtma yo'naltirish sozlamalari endi ishlatilmaydi.
  if (data.settings) {
    delete data.settings.orderUsername
    delete data.settings.telegramLink
  }
  for (const product of data.products || []) {
    if (String(product.desc || '').includes('Telegram orqali buyurtma qabul qilish')) {
      product.desc = String(product.desc).replace('Telegram orqali buyurtma qabul qilish', 'saytda buyurtma qabul qilish')
    }
  }

  for (const user of data.users || []) {
    if (!user.id) user.id = uid('usr_')
    if (!['admin', 'customer'].includes(user.role)) user.role = 'customer'
    if (!user.name) user.name = user.role === 'admin' ? 'MaxSeller Admin' : 'Mijoz'
    if (user.phone) {
      user.phoneDisplay = user.phoneDisplay || user.phone
      user.phone = normalizePhone(user.phone)
    }
    if (user.email) user.email = normalizeEmail(user.email)
    user.emailVerified = Boolean(user.emailVerified)
    user.phoneVerified = Boolean(user.phoneVerified)
    // Eski parolli akkauntlar tasdiqlanmagan hisoblanadi: OTP orqali qayta kirish talab qilinadi.
    if (user.role === 'admin') user.phoneVerified = true
    user.telegramId = user.telegramId ?? null
    user.telegramUsername = user.telegramUsername || ''
    user.telegramNotifications = user.telegramNotifications !== false
    user.createdAt = user.createdAt || nowIso()
    user.lastLoginAt = user.lastLoginAt || ''
    user.accountStatus = ['active', 'suspended', 'blocked'].includes(user.accountStatus) ? user.accountStatus : 'active'

    if (user.phone && usedPhones.has(user.phone)) user.phone = `${user.phone}#dup${user.id.slice(-4)}`
    if (user.phone) usedPhones.add(user.phone)
    if (user.email && usedEmails.has(user.email)) user.email = `dup-${user.id.slice(-6)}-${user.email}`
    if (user.email) usedEmails.add(user.email)

    if (!user.customerNumber) {
      customerSeq += 1
      user.customerNumber = `CUST-${customerSeq}`
    } else {
      const n = Number(String(user.customerNumber).replace('CUST-', ''))
      if (Number.isFinite(n) && n > customerSeq) customerSeq = n
    }
  }

  for (const order of data.orders || []) {
    order.customerNumber = order.customerNumber || data.users.find((u) => u.id === order.userId)?.customerNumber || ''
    order.customerId = order.customerId || order.userId || null
    order.idempotencyKey = order.idempotencyKey || ''
  }

  if (data.settings) {
    if (String(data.settings.heroLead || '').includes('Telegramda yozing')) {
      data.settings.heroLead = 'Veb-saytlar, premium dizayn shablonlar, tayyor ilmiy materiallar va video darsliklar. Tanlang, savatga qo\'shing va saytda buyurtma bering.'
    }
    if (String(data.settings.catalogText || '').includes('tugmani bosing')) {
      data.settings.catalogText = 'Barcha mahsulotlar tayyor fayl ko\'rinishida beriladi. Savatga qo\'shing yoki hozir xarid qiling.'
    }
  }
  return data
}

export function writeDb(data) {
  const tmp = `${dbFile}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmp, dbFile)
}

export function updateDb(mutator) {
  const db = readDb()
  const result = mutator(db)
  writeDb(db)
  return result
}

// JSON bazasi uchun atomik tranzaksiya: xatolik bo'lsa hech narsa yozilmaydi,
// muvaffaqiyat bo'lsa vaqtinchalik fayl + rename orqali birdaniga almashtiriladi.
export function transactionDb(mutator) {
  const original = readDb()
  const snapshot = structuredClone(original)
  let result
  try {
    result = mutator(original)
  } catch (err) {
    // Xotira nusxasini qaytarish — keyingi readDb toza bazani ko'radi.
    writeDb(snapshot)
    throw err
  }
  writeDb(original)
  return result
}

export const uid = (prefix = '') => `${prefix}${crypto.randomBytes(12).toString('hex')}`
export const nowIso = () => new Date().toISOString()

export function publicUser(user) {
  if (!user) return null
  const { passwordHash, guestToken, ...rest } = user
  return rest
}

/* --------------------------- Security --------------------------- */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, expected] = stored.split(':')
  const actual = crypto.scryptSync(String(password), salt, 64)
  const target = Buffer.from(expected, 'hex')
  return actual.length === target.length && crypto.timingSafeEqual(actual, target)
}

const b64url = (buffer) => Buffer.from(buffer).toString('base64url')

export function signToken(payload, hours = 24 * 30) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + hours * 3600 * 1000 }))
  const signature = crypto.createHmac('sha256', config.jwtSecret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verifyToken(token) {
  if (typeof token !== 'string' || token.split('.').length !== 2) return null
  const [body, signature] = token.split('.')
  const expected = crypto.createHmac('sha256', config.jwtSecret).update(body).digest('base64url')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function bearer(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

export function requireAuth(req, res, next) {
  const payload = verifyToken(bearer(req))
  if (!payload?.uid) return res.status(401).json({ error: 'Kirish talab qilinadi' })
  const db = readDb()
  const user = db.users.find((u) => u.id === payload.uid)
  if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi. Qaytadan kiring.' })
  req.user = user
  req.authPayload = payload
  next()
}

export function requireAdmin(req, res, next) {
  const payload = verifyToken(bearer(req))
  if (!payload?.uid || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Admin huquqi talab qilinadi' })
  }
  const db = readDb()
  const admin = db.users.find((u) => u.id === payload.uid && u.role === 'admin')
  if (!admin) return res.status(401).json({ error: 'Admin topilmadi' })
  req.user = admin
  next()
}

export function requireOrderOwner(req, res, next) {
  const order = readDb().orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  if (order.userId !== req.user.id && order.guestToken !== req.query.token && order.guestToken !== req.body?.token) {
    return res.status(403).json({ error: 'Bu buyurtma sizga tegishli emas' })
  }
  req.order = order
  next()
}

export function logActivity(db, actor, action, entity, meta = {}) {
  db.activityLog.unshift({ id: uid('act_'), actor, action, entity, meta, at: nowIso() })
  if (db.activityLog.length > 2000) db.activityLog.length = 2000
}

/* --------------------------- Validation --------------------------- */
export const isPhone = (value) => /^[+\d][\d\s()-]{6,18}$/.test(String(value || '').trim())
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim())
export const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max)
export const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// Telefon raqamini bitta ko'rinishga keltirish: +998901234567.
export function normalizePhone(value) {
  const raw = String(value || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('998') && digits.length >= 12) return `+${digits.slice(0, 12)}`
  if (digits.startsWith('8') && digits.length === 10) return `+7${digits.slice(1)}`
  if (digits.length === 9) return `+998${digits}`
  return `+${digits.slice(0, 15)}`
}

export const normalizeEmail = (value) => clean(value, 180).toLowerCase()

export function maskDestination(channel, destination) {
  const value = String(destination || '')
  if (channel === 'email') {
    const [local, domain] = value.split('@')
    if (!domain) return '***'
    return `${local.slice(0, 2)}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`
  }
  if (value.length <= 4) return '***'
  return `${value.slice(0, 3)}${'*'.repeat(Math.max(1, value.length - 7))}${value.slice(-4)}`
}

export function findUserByContact(db, { phone = '', email = '', excludeId = '' } = {}) {
  const normalizedPhone = normalizePhone(phone)
  const normalizedEmail = normalizeEmail(email)
  return (db.users || []).find((user) => user.id !== excludeId && (
    (normalizedPhone && user.phone === normalizedPhone)
    || (normalizedEmail && user.email === normalizedEmail)
  )) || null
}

export function assertUniqueContact(db, { phone = '', email = '', excludeId = '' } = {}) {
  const other = findUserByContact(db, { phone, email, excludeId })
  if (!other) return
  if (normalizePhone(phone) && other.phone === normalizePhone(phone)) {
    throw new Error('Bu telefon raqami bilan akkaunt allaqachon mavjud')
  }
  throw new Error('Bu email bilan akkaunt allaqachon mavjud')
}

export function nextCustomerNumber(db) {
  const max = (db.users || []).reduce((acc, user) => {
    const n = Number(String(user.customerNumber || '').replace('CUST-', ''))
    return Number.isFinite(n) && n > acc ? n : acc
  }, 1000)
  return `CUST-${max + 1}`
}

export function normalizeTelegramUsername(value) {
  const raw = clean(value, 80).replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '').split(/[?/]/)[0]
  return /^[A-Za-z0-9_]{4,32}$/.test(raw) ? raw : ''
}

export function validateOrderInput(body, products) {
  const errors = []
  const type = body?.type === 'custom' ? 'custom' : 'instant'
  const name = clean(body?.customer?.name, 120)
  const phone = normalizePhone(body?.customer?.phone)
  const email = normalizeEmail(body?.customer?.email)
  const telegramUsername = normalizeTelegramUsername(body?.customer?.telegramUsername)
  const items = []
  const rawItems = Array.isArray(body?.items) ? body.items : []

  if (name.length < 2) errors.push('Ism kamida 2 belgi bo\'lsin')
  if (!isPhone(phone)) errors.push('Telefon raqami noto\'g\'ri')
  if (email && !isEmail(email)) errors.push('Email manzili noto\'g\'ri')

  for (const raw of rawItems.slice(0, 100)) {
    const product = products.find((p) => p.id === raw?.productId && p.active)
    const quantity = Math.min(100, Math.max(1, Math.floor(Number(raw?.quantity) || 1)))
    if (!product) {
      errors.push('Katalogda bunday mahsulot yo\'q')
      continue
    }
    items.push({
      productId: product.id,
      title: product.title,
      image: product.image || '',
      price: Number(product.price) || 0,
      quantity,
    })
  }
  if (type === 'instant' && items.length === 0) errors.push('Kamida bitta mahsulot tanlang')
  if (type === 'custom' && clean(body?.requirements, 4000).length < 10) {
    errors.push('Loyiha talablarini batafsil yozing (kamida 10 belgi)')
  }
  const paymentMethod = ['cash', 'click', 'payme', 'card'].includes(body?.paymentMethod)
    ? body.paymentMethod : 'cash'

  return {
    errors, value: {
      type, items, paymentMethod,
      customer: { name, phone, email, telegramUsername, notes: clean(body?.customer?.notes, 1000) },
      requirements: clean(body?.requirements, 4000),
      projectType: clean(body?.projectType, 120),
      budget: Math.max(0, Number(body?.budget) || 0),
    },
  }
}
