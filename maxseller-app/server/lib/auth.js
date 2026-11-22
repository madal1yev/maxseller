// OTP asosli mijoz autentifikatsiyasi va server tomonidagi savat.
// Hech qanday kod frontendga yoki loglarga qaytarilmaydi; faqat hash saqlanadi.
import crypto from 'node:crypto'
import {
  config, readDb, transactionDb, updateDb, uid, nowIso, clean,
  normalizePhone, normalizeEmail, isEmail, isPhone, maskDestination,
  findUserByContact, assertUniqueContact, nextCustomerNumber, signToken,
  publicUser,
} from './core.js'
import { deliverOtp, providerStatus, ProviderError } from './providers.js'

export class AuthError extends Error {
  constructor(code, message, extra = {}) {
    super(message)
    this.name = 'AuthError'
    this.code = code
    Object.assign(this, extra)
  }
}

const OTP_PURPOSES = ['login', 'verify_contact']
const ACTIVE = 'ACTIVE'

function otpHash(record, code) {
  const material = `${config.otp.secret}|${record.channel}|${record.destination}|${record.id}|${String(code)}`
  return crypto.createHmac('sha256', config.otp.secret).update(material).digest('hex')
}

export function matchesOtpCode(record, code) {
  const expected = String(record?.codeHash || '')
  const actual = otpHash(record, String(code || '').padStart(6, '0'))
  const a = Buffer.from(expected)
  const b = Buffer.from(actual)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function otpPublic(record) {
  const settings = providerStatus()
  return {
    requestId: record.id,
    expiresInSeconds: Math.max(1, Math.round((Date.parse(record.expiresAt) - Date.now()) / 1000)),
    resendAfterSeconds: config.otp.resendSeconds,
    destinationMasked: record.destinationMasked,
    provider: record.channel === 'phone' ? settings.sms.provider : settings.email.provider,
  }
}

function validateDestination(channel, phone, email) {
  if (channel === 'phone') {
    const destination = normalizePhone(phone)
    if (!isPhone(destination)) throw new AuthError('INVALID_PHONE', 'Telefon raqamini to\'g\'ri kiriting')
    return destination
  }
  if (channel === 'email') {
    const destination = normalizeEmail(email)
    if (!isEmail(destination)) throw new AuthError('INVALID_EMAIL', 'Email manzilini to\'g\'ri kiriting')
    return destination
  }
  throw new AuthError('INVALID_CHANNEL', 'Tasdiqlash usuli noto\'g\'ri')
}

export async function requestOtp({ channel, phone, email, name = '', purpose = 'login' } = {}) {
  const useCase = OTP_PURPOSES.includes(purpose) ? purpose : 'login'
  // Telefon/SMS kanali butunlay o'chirilgan: faqat email orqali kod yuboriladi.
  if (channel !== 'email') {
    throw new AuthError('PHONE_OTP_DISABLED', 'Telefon orqali kod yuborish o\'chirilgan. Email manzilingiz bilan kiring.')
  }
  const status = providerStatus()
  if (!status.email.configured) {
    throw new ProviderError('EMAIL_PROVIDER_NOT_CONFIGURED', 'Email provayderi sozlanmagan. Administrator bilan bog\'laning.')
  }

  const destination = validateDestination(channel, phone, email)
  const db = readDb()
  if (useCase === 'login') {
    const existing = findUserByContact(db, channel === 'phone' ? { phone: destination } : { email: destination })
    if (existing?.accountStatus === 'blocked') throw new AuthError('ACCOUNT_BLOCKED', 'Akkaunt bloklangan')
    if (existing?.accountStatus === 'suspended') throw new AuthError('ACCOUNT_SUSPENDED', 'Akkaunt vaqtincha to\'xtatilgan')
  }

  const now = Date.now()
  const latest = db.otpCodes
    .filter((item) => item.channel === channel && item.destination === destination && item.purpose === useCase)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]
  if (latest && now - Date.parse(latest.createdAt) < config.otp.resendSeconds * 1000) {
    const wait = Math.ceil((config.otp.resendSeconds * 1000 - (now - Date.parse(latest.createdAt))) / 1000)
    throw new AuthError('OTP_RESEND_TOO_SOON', `Yangi kod uchun ${wait} soniya kuting`, { retryAfterSeconds: wait })
  }

  const record = {
    id: uid('otp_'),
    channel,
    destination,
    destinationMasked: maskDestination(channel, destination),
    purpose: useCase,
    name: clean(name, 120),
    codeHash: '',
    status: ACTIVE,
    attempts: 0,
    maxAttempts: config.otp.maxAttempts,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.otp.ttlSeconds * 1000).toISOString(),
    consumedAt: null,
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  record.codeHash = otpHash(record, code)

  // Real provayder chaqiruvi bazaga yozishdan oldin: yuborilmasa, kod ham saqlanmaydi.
  const delivery = await deliverOtp(channel, destination, code)

  transactionDb((current) => {
    for (const old of current.otpCodes) {
      if (old.channel === channel && old.destination === destination
        && old.purpose === useCase && old.status === ACTIVE) {
        old.status = 'SUPERSEDED'
        old.consumedAt = nowIso()
      }
    }
    current.otpCodes.unshift(record)
    if (current.otpCodes.length > 500) current.otpCodes.length = 500
  })

  return { ...otpPublic(record), provider: delivery.provider }
}

export function verifyOtp({ requestId, code, name = '', purpose = 'login', actorUser = null, cart = [], guestToken = '' } = {}) {
  const id = clean(requestId, 80)
  const submitted = String(code || '').replace(/\D/g, '')
  if (!id || submitted.length !== 6) throw new AuthError('OTP_INVALID', '6 xonali kodni kiriting')

  // Noto'g'ri urinishlar alohida yoziladi: tranzaksiya bekor bo'lsa ham hisoblanadi.
  const preliminary = readDb().otpCodes.find((item) => item.id === id)
  if (!preliminary) throw new AuthError('OTP_NOT_FOUND', 'Kod topilmadi yoki muddati tugagan')
  if (preliminary.channel !== 'email') {
    throw new AuthError('PHONE_OTP_DISABLED', 'Telefon orqali kod tasdiqlash o\'chirilgan. Email bilan kiring.')
  }
  if (preliminary.status !== ACTIVE) throw new AuthError('OTP_USED', 'Bu kod allaqachon ishlatilgan')
  if (Date.parse(preliminary.expiresAt) < Date.now()) throw new AuthError('OTP_EXPIRED', 'Kod muddati tugagan, yangi kod oling')
  if (!matchesOtpCode(preliminary, submitted)) {
    const remaining = updateDb((db) => {
      const record = db.otpCodes.find((item) => item.id === id)
      if (!record || record.status !== ACTIVE) return 0
      record.attempts = Number(record.attempts || 0) + 1
      if (record.attempts >= record.maxAttempts) record.status = 'EXHAUSTED'
      return Math.max(0, record.maxAttempts - record.attempts)
    })
    if (remaining <= 0) throw new AuthError('OTP_EXHAUSTED', 'Noto\'g\'ri urinishlar tugadi, yangi kod oling')
    throw new AuthError('OTP_INVALID', `Noto\'g\'ri kod. Yana ${remaining} urinish qoldi`, { remainingAttempts: remaining })
  }

  const useCase = OTP_PURPOSES.includes(preliminary.purpose) ? preliminary.purpose : 'login'
  if (purpose && purpose !== useCase) throw new AuthError('OTP_PURPOSE_MISMATCH', 'Kod boshqa maqsad uchun yuborilgan')

  let result
  transactionDb((db) => {
    const record = db.otpCodes.find((item) => item.id === id)
    if (!record || record.status !== ACTIVE || !matchesOtpCode(record, submitted)) {
      throw new AuthError('OTP_USED', 'Bu kod allaqachon ishlatilgan yoki o\'zgartirilgan')
    }
    if (Date.parse(record.expiresAt) < Date.now()) throw new AuthError('OTP_EXPIRED', 'Kod muddati tugagan')

    const fullName = clean(name || record.name, 120)
    if (useCase === 'verify_contact') {
      if (!actorUser?.id) throw new AuthError('AUTH_REQUIRED', 'Avval kiring')
      const user = db.users.find((item) => item.id === actorUser.id)
      if (!user) throw new AuthError('USER_NOT_FOUND', 'Foydalanuvchi topilmadi')
      assertUniqueContact(db, {
        phone: record.channel === 'phone' ? record.destination : '',
        email: record.channel === 'email' ? record.destination : '',
        excludeId: user.id,
      })
      if (record.channel === 'phone') {
        user.phone = record.destination
        user.phoneDisplay = record.destination
        user.phoneVerified = true
      } else {
        user.email = record.destination
        user.emailVerified = true
      }
      record.status = 'USED'
      record.consumedAt = nowIso()
      result = { ok: true, user: publicUser(user), contactVerified: true }
      return
    }

    let user = findUserByContact(db, record.channel === 'phone'
      ? { phone: record.destination }
      : { email: record.destination })
    if (user?.accountStatus === 'blocked') throw new AuthError('ACCOUNT_BLOCKED', 'Akkaunt bloklangan')
    if (user?.accountStatus === 'suspended') throw new AuthError('ACCOUNT_SUSPENDED', 'Akkaunt vaqtincha to\'xtatilgan')

    if (!user) {
      if (fullName.length < 2) throw new AuthError('NAME_REQUIRED', 'Ismingizni kiriting (kamida 2 belgi)')
      user = {
        id: uid('usr_'),
        customerNumber: nextCustomerNumber(db),
        name: fullName,
        phone: record.channel === 'phone' ? record.destination : '',
        phoneDisplay: record.channel === 'phone' ? record.destination : '',
        email: record.channel === 'email' ? record.destination : '',
        phoneVerified: record.channel === 'phone',
        emailVerified: record.channel === 'email',
        passwordHash: '',
        role: 'customer',
        telegramId: null,
        telegramUsername: '',
        telegramNotifications: true,
        accountStatus: 'active',
        createdAt: nowIso(),
        lastLoginAt: nowIso(),
      }
      db.users.unshift(user)
      logContactVerified(db, user, record.channel)
    } else {
      if (fullName.length >= 2) user.name = fullName
      if (record.channel === 'phone') {
        user.phone = record.destination
        user.phoneDisplay = user.phoneDisplay || record.destination
        user.phoneVerified = true
      } else {
        user.email = record.destination
        user.emailVerified = true
      }
      user.lastLoginAt = nowIso()
      user.accountStatus = user.accountStatus || 'active'
      logContactVerified(db, user, record.channel)
    }

    record.status = 'USED'
    record.consumedAt = nowIso()
    attachGuestOrders(db, guestToken, user.id)
    result = { user: publicUser(user), cart: mergeCart(db, user.id, cart) }
  })

  if (result.contactVerified) return result
  result.token = signToken({ uid: result.user.id, role: 'customer' })
  return result
}

function logContactVerified(db, user, channel) {
  db.activityLog.unshift({
    id: uid('act_'),
    actor: user.name,
    action: channel === 'phone' ? 'PHONE_VERIFIED' : 'EMAIL_VERIFIED',
    entity: `customer:${user.customerNumber}`,
    meta: { customerId: user.id },
    at: nowIso(),
  })
  if (db.activityLog.length > 2000) db.activityLog.length = 2000
}

/* --------------------------- Server cart --------------------------- */
export function normalizeCartItems(db, items) {
  const merged = new Map()
  const raw = Array.isArray(items) ? items : []
  for (const item of raw.slice(0, 100)) {
    const productId = String(item?.productId || '')
    const product = db.products.find((p) => p.id === productId && p.active)
    if (!product) continue
    const quantity = Math.max(1, Math.min(100, Math.floor(Number(item?.quantity) || 1)))
    merged.set(productId, Math.min(100, (merged.get(productId) || 0) + quantity))
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }))
}

export function getCart(db, userId) {
  const cart = db.carts.find((item) => item.userId === userId)
  if (!cart) return []
  cart.items = normalizeCartItems(db, cart.items)
  return cart.items
}

export function saveCart(db, userId, items) {
  const normalized = normalizeCartItems(db, items)
  const existing = db.carts.find((item) => item.userId === userId)
  if (existing) {
    existing.items = normalized
    existing.updatedAt = nowIso()
  } else {
    db.carts.unshift({ userId, items: normalized, updatedAt: nowIso() })
  }
  return normalized
}

export function mergeCart(db, userId, incomingItems) {
  const existing = getCart(db, userId)
  const combined = [...existing, ...(Array.isArray(incomingItems) ? incomingItems : [])]
  return saveCart(db, userId, combined)
}

export function clearCart(db, userId) {
  db.carts = db.carts.filter((item) => item.userId !== userId)
}

export function attachGuestOrders(db, guestToken, userId) {
  const token = clean(guestToken, 120)
  if (!token) return 0
  let count = 0
  for (const order of db.orders) {
    if (order.guestToken === token && !order.userId) {
      order.userId = userId
      order.customerId = userId
      order.customerNumber = db.users.find((u) => u.id === userId)?.customerNumber || ''
      count += 1
    }
  }
  return count
}

export { ProviderError, providerStatus }
