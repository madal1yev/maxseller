// Real API regression test. Mock ma'lumot yo'q: haqiqiy Express server, haqiqiy db.json,
// haqiqiy OTP adapter chaqiruvlari faqat mahalliy HTTP test double ga yo'naltiriladi.
// Telefon/SMS kanali o'chirilgan: mijoz faqat email orqali tasdiqlanadi.
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maxseller-smoke-'))
const dbFile = path.join(tmpDir, 'db.json')
const sent = { sms: [], email: [], telegram: [] }
let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  OK   ${name}`) }
  else { failed += 1; console.log(`  FAIL ${name} ${detail}`) }
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => resolve(raw))
  })
}

function createProviderMock() {
  const server = http.createServer(async (req, res) => {
    const raw = await readBody(req)
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/auth/login') return res.end(JSON.stringify({ data: { token: 'provider-test-token' } }))
    if (req.url === '/message/sms/send') {
      let payload = {}
      try { payload = JSON.parse(raw || '{}') } catch { payload = Object.fromEntries(new URLSearchParams(raw)) }
      const message = String(payload.message || '')
      const code = (message.match(/\b\d{6}\b/) || [])[0] || ''
      sent.sms.push({ to: payload.mobile_phone || payload.To, code })
      return res.end(JSON.stringify({ id: 'sms-test' }))
    }
    if (req.url === '/emails') {
      const body = JSON.parse(raw || '{}')
      const code = (String(body.html || '').match(/\b\d{6}\b/) || [])[0] || ''
      sent.email.push({ to: body.to?.[0], code })
      return res.end(JSON.stringify({ id: 'email-test' }))
    }
    const telegram = /^\/bot([^/]+)\/([^/?]+)/.exec(req.url || '')
    if (telegram) {
      let body = {}
      try { body = JSON.parse(raw || '{}') } catch { body = {} }
      sent.telegram.push({ token: telegram[1], method: telegram[2], body })
      return res.end(JSON.stringify({ ok: true, result: telegram[2] === 'getUpdates' ? [] : {} }))
    }
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'not found' }))
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

async function waitHealth(base) {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${base}/api/health`)
      if (res.ok) return
    } catch { /* server hali ishga tushmadi */ }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Test server ishga tushmadi')
}

const mock = await createProviderMock()
const mockPort = mock.address().port
const apiPort = 4100 + Math.floor(Math.random() * 400)
const base = `http://127.0.0.1:${apiPort}`

const env = {
  ...process.env,
  PORT: String(apiPort),
  MAXSELLER_DB_FILE: dbFile,
  JWT_SECRET: 'smoke-jwt-secret',
  OTP_SECRET: 'smoke-otp-secret',
  ADMIN_PASSWORD: 'admin123',
  STORE_URL: base,
  // SMS provayderi atayin yo'q: telefon kanali o'chirilganligini tekshiramiz.
  SMS_PROVIDER: '',
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 'smoke-resend-key',
  RESEND_BASE_URL: `http://127.0.0.1:${mockPort}`,
  EMAIL_FROM: 'MaxSeller <no-reply@example.com>',
  OTP_RESEND_SECONDS: '1',
  TELEGRAM_ADMIN_BOT_TOKEN: '111111:AAFakeAdminBotTokenForTests',
  TELEGRAM_CUSTOMER_BOT_TOKEN: '222222:AAFakeCustomerBotTokenForTests',
  TELEGRAM_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
  TELEGRAM_ADMIN_USERNAME: 'madaliyev_a',
  ADMIN_TELEGRAM_CHAT_ID: '555001',
  TELEGRAM_MODE: 'webhook',
  TELEGRAM_WEBHOOK_BASE_URL: `http://127.0.0.1:${mockPort}`,
  TELEGRAM_WEBHOOK_SECRET: 'smoke-webhook-secret',
}
const server = spawn(process.execPath, ['server/index.js'], { cwd: projectDir, env, stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += String(chunk) })
server.stderr.on('data', (chunk) => { serverLog += String(chunk) })

async function call(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const type = res.headers.get('content-type') || ''
  const data = type.includes('json') ? await res.json() : await res.text()
  return { status: res.status, data }
}

function latestOtp() {
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'))
  return db.otpCodes?.[0] || null
}

function dbSnapshot() {
  return JSON.parse(fs.readFileSync(dbFile, 'utf8'))
}

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AAAwAB/wFjQ7AAAAAASUVORK5CYII='

try {
  process.env.OTP_SECRET = env.OTP_SECRET
  process.env.JWT_SECRET = env.JWT_SECRET
  const { matchesOtpCode } = await import('../server/lib/auth.js')
  const findCode = (record) => {
    for (let i = 0; i < 1_000_000; i += 1) {
      const code = String(i).padStart(6, '0')
      if (matchesOtpCode(record, code)) return code
    }
    return ''
  }
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const waitFor = async (predicate, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (predicate()) return true
      await sleep(100)
    }
    return false
  }

  console.log('MaxSeller API + email OTP + order regression test')
  await waitHealth(base)

  const boot = await call('GET', '/api/bootstrap')
  check('bootstrap 200', boot.status === 200)
  check('12 mahsulot', boot.data.products?.length === 12)
  check('barcha mahsulotlarda rasm bor', boot.data.products?.every((p) => Boolean(p.image)))
  check('Telegram buyurtma havolasi yo\'q', !('telegramLink' in boot.data.settings) && !('orderUsername' in boot.data.settings))
  check('mahsulot tavsifida Telegram buyurtma yo\'q', boot.data.products?.every((p) => !/Telegram orqali buyurtma/i.test(p.desc || '')))
  const providers = await call('GET', '/api/auth/providers')
  check('email provayderi tayyor', providers.status === 200 && providers.data.email.configured)
  check('SMS kanali o\'chirilgan', providers.status === 200 && providers.data.sms.enabled === false)

  const admin = await call('POST', '/api/admin/login', { password: 'admin123' })
  check('admin login', admin.status === 200 && Boolean(admin.data.token))
  const adminToken = admin.data.token

  const settingsUpdate = await call('PUT', '/api/admin/settings', {
    orderUsername: 'buyurtma_uchun', telegramLink: 'https://t.me/buyurtma_uchun',
  }, adminToken)
  check('admin sozlamalari buyurtma yo\'naltirishini qabul qilmaydi', settingsUpdate.status === 200
    && !('orderUsername' in settingsUpdate.data) && !('telegramLink' in settingsUpdate.data)
    && !('orderUsername' in dbSnapshot().settings))

  const product = boot.data.products[0]
  const guestOrder = await call('POST', '/api/orders', {
    type: 'instant', items: [{ productId: product.id, quantity: 1 }], paymentMethod: 'card',
  })
  check('login qilmagan mijoz buyurtma bera olmaydi', guestOrder.status === 401)

  const phoneDisabled = await call('POST', '/api/auth/otp/request', {
    channel: 'phone', phone: '+998901234567', name: 'Test Mijoz',
  })
  check('telefon OTP rad etildi', phoneDisabled.status === 400 && phoneDisabled.data.code === 'PHONE_OTP_DISABLED', JSON.stringify(phoneDisabled.data))
  check('SMS adapter chaqirilmadi', sent.sms.length === 0)

  const email = 'client@example.com'
  const cart = [{ productId: product.id, quantity: 2 }]
  const otpRequest = await call('POST', '/api/auth/otp/request', {
    channel: 'email', email, name: 'Test Mijoz', cart,
  })
  check('email OTP so\'rov qabul qilindi', otpRequest.status === 200, JSON.stringify(otpRequest.data))
  check('OTP faqat maskalangan qaytarildi', !('code' in otpRequest.data) && Boolean(otpRequest.data.destinationMasked))
  check('kod muddati javobda to\'g\'ri', Number(otpRequest.data.expiresInSeconds) > 0, JSON.stringify(otpRequest.data))
  check('real email adapter chaqirildi', sent.email.length === 1 && /^\d{6}$/.test(sent.email[0].code))
  check('OTP bazada hash bilan saqlandi', Boolean(latestOtp()?.codeHash) && !('code' in (latestOtp() || {})))

  const realCode = sent.email[0].code || findCode(latestOtp())
  const wrongCode = String((Number(realCode) + 1) % 1_000_000).padStart(6, '0')
  const wrong = await call('POST', '/api/auth/otp/verify', {
    requestId: otpRequest.data.requestId, code: wrongCode, name: 'Test Mijoz', cart,
  })
  check('noto\'g\'ri OTP bilan kirish taqiqlangan', wrong.status === 400 && wrong.data.code === 'OTP_INVALID', JSON.stringify(wrong.data))

  const resend = await call('POST', '/api/auth/otp/request', { channel: 'email', email, name: 'Test Mijoz', cart })
  check('qayta yuborish vaqti cheklangan', resend.status === 400 && resend.data.code === 'OTP_RESEND_TOO_SOON')

  const verified = await call('POST', '/api/auth/otp/verify', {
    requestId: otpRequest.data.requestId, code: realCode, name: 'Test Mijoz', cart,
  })
  check('to\'g\'ri OTP bilan kirish', verified.status === 200 && Boolean(verified.data.token), JSON.stringify(verified.data))
  const token = verified.data.token
  const user = verified.data.user
  check('mijoz backend database ga saqlandi', Boolean(user?.id) && /^CUST-\d+$/.test(user.customerNumber || ''))
  check('email tasdiqlangan', user?.emailVerified === true)
  check('savat login bilan sinxronlashdi', Array.isArray(verified.data.cart) && verified.data.cart[0]?.quantity === 2)

  const me = await call('GET', '/api/auth/me', null, token)
  check('token orqali /me', me.status === 200 && me.data.user.id === user.id)
  const adminWithUserToken = await call('GET', '/api/admin/data', null, token)
  check('mijoz admin API ga kira olmaydi', adminWithUserToken.status === 401)
  const cartAfter = await call('GET', '/api/cart', null, token)
  check('server savati saqlangan', cartAfter.status === 200 && cartAfter.data.items.length === 1)

  await sleep(1200)
  const duplicateLogin = await call('POST', '/api/auth/otp/request', { channel: 'email', email, name: 'Boshqa Ism' })
  check('mavjud email uchun yangi OTP yuborildi', duplicateLogin.status === 200)
  const duplicateCode = sent.email.at(-1).code
  const duplicateVerify = await call('POST', '/api/auth/otp/verify', {
    requestId: duplicateLogin.data.requestId, code: duplicateCode, name: 'Boshqa Ism',
  })
  check('takroriy akkaunt yaratilmadi', duplicateVerify.status === 200 && duplicateVerify.data.user.id === user.id)
  check('mijozlar soni o\'zgarmadi', dbSnapshot().users.filter((u) => u.role === 'customer').length === 1)

  const verifyEmail = 'client2@example.com'
  const emailOtp = await call('POST', '/api/auth/otp/request', {
    channel: 'email', email: verifyEmail, purpose: 'verify_contact', name: user.name,
  }, token)
  check('email OTP so\'rov qabul qilindi', emailOtp.status === 200, JSON.stringify(emailOtp.data))
  const emailCode = sent.email.at(-1).code
  const emailVerify = await call('POST', '/api/auth/otp/verify', {
    requestId: emailOtp.data.requestId, code: emailCode, purpose: 'verify_contact',
  }, token)
  check('email tasdiqlandi', emailVerify.status === 200 && emailVerify.data.user.emailVerified === true, JSON.stringify(emailVerify.data))
  check('email OTP javobida token yo\'q', !('token' in emailVerify.data))

  // Mijoz bot bildirishnomasi shu bog'langan Telegram ID ga borishi kerak.
  const linkedDb = dbSnapshot()
  const linkedUser = linkedDb.users.find((u) => u.id === user.id)
  linkedUser.telegramId = 987654321
  linkedUser.telegramUsername = 'smoke_client'
  linkedUser.telegramNotifications = true
  fs.writeFileSync(dbFile, JSON.stringify(linkedDb, null, 2), 'utf8')

  const idempotencyKey = `smoke-${Date.now()}`
  const orderPayload = {
    type: 'instant',
    idempotencyKey,
    customer: { name: 'Notoğri Ism', phone: '+998901234567', email: verifyEmail },
    items: [{ productId: product.id, quantity: 2, price: 1 }],
    paymentMethod: 'card',
  }
  const created = await call('POST', '/api/orders', orderPayload, token)
  check('buyurtma saytda yaratildi', created.status === 201 && Boolean(created.data.order), JSON.stringify(created.data))
  const order = created.data.order
  check('buyurtma mijozga bog\'landi', order?.userId === user.id && order?.customerId === user.id)
  check('narx bazadan olindi', order?.total === product.price * 2, `${order?.total} != ${product.price * 2}`)
  check('mijoz ismi profildan olindi', order?.customer?.name === duplicateVerify.data.user.name)
  check('to\'lov va buyurtma holati alohida', order?.status === 'NEW' && order?.paymentStatus === 'UNPAID')
  check('savat buyurtmadan keyin tozalandi', (await call('GET', '/api/cart', null, token)).data.items.length === 0)

  const duplicateOrder = await call('POST', '/api/orders', orderPayload, token)
  check('dublikat buyurtma yaratilmadi', duplicateOrder.status === 200 && duplicateOrder.data.order.id === order.id)
  check('buyurtmalar soni bitta', dbSnapshot().orders.filter((o) => o.idempotencyKey === idempotencyKey).length === 1)

  const adminOrders = await call('GET', '/api/admin/orders', null, adminToken)
  check('buyurtma adminda ko\'rinadi', adminOrders.data.orders?.some((o) => o.id === order.id))
  const notifications = await call('GET', '/api/admin/notifications', null, adminToken)
  check('NEW_ORDER bildirishnomasi navbatda', notifications.data.notifications?.some((n) => n.event === 'NEW_ORDER' && n.orderId === order.id))

  const orderMessages = () => sent.telegram.filter((item) => item.method === 'sendMessage'
    && String(item.body.text || '').includes(order.orderNumber))
  await waitFor(() => orderMessages().length >= 2)
  const adminMessage = orderMessages().find((item) => String(item.body.chat_id) === '555001')
  const customerMessage = orderMessages().find((item) => String(item.body.chat_id) === '987654321')
  check('admin bot yangi buyurtma xabarini yubordi', Boolean(adminMessage), JSON.stringify(sent.telegram.slice(-4)))
  check('mijoz bot yangi buyurtma xabarini yubordi', Boolean(customerMessage), JSON.stringify(sent.telegram.slice(-4)))
  check('bot xabarida buyurtma tafsiloti bor', /Buyurtma #|Mijoz:|Summa:/.test(adminMessage?.body.text || ''))

  // Telegram admin boti orqali holat o'zgartirish veb admin panelga ham ko'rinadi.
  const botAction = await call('POST', '/api/telegram/admin/smoke-webhook-secret', {
    update_id: 900001,
    callback_query: {
      id: 'smoke-callback',
      from: { id: 999001, username: 'madaliyev_a' },
      message: { chat: { id: 555001 }, message_id: 42 },
      data: `a:ok:${order.id}`,
    },
  })
  check('admin bot callback qabul qilindi', botAction.status === 200 && botAction.data.ok === true, JSON.stringify(botAction.data))
  const adminOrderDetail = await call('GET', `/api/admin/orders/${order.id}`, null, adminToken)
  check('bot qilgan o\'zgartirish veb adminda ko\'rinadi', adminOrderDetail.data.order?.status === 'AWAITING_PAYMENT')
  check('bot harakati buyurtma tarixiga yozildi', adminOrderDetail.data.history?.some((h) => h.to === 'AWAITING_PAYMENT' && h.actor === 'telegram-admin'))

  const payment = await call('POST', `/api/orders/${order.id}/payment`, { receipt: png, note: 'smoke chek' }, token)
  check('to\'lov cheki yuborildi', payment.status === 201 && Boolean(payment.data.payment.id))
  const verifyPay = await call('POST', `/api/admin/payments/${payment.data.payment.id}/verify`, { approve: true }, adminToken)
  check('to\'lov backend da tasdiqlandi', verifyPay.status === 200 && verifyPay.data.order.paymentStatus === 'PAID')

  const summary = await call('GET', '/api/customer/summary', null, token)
  check('mijoz kabineti buyurtmani ko\'rsatadi', summary.status === 200 && summary.data.orders.some((o) => o.id === order.id))
  check('xaridlar ro\'yxati yaratildi', summary.data.purchases?.some((p) => p.orderId === order.id))
  check('tranzaksiya yozildi', summary.data.transactions?.some((t) => t.orderId === order.id))

  const pdfRes = await fetch(`${base}/api/orders/${order.id}/receipt`, { headers: { Authorization: `Bearer ${token}` } })
  const pdfText = await pdfRes.text()
  check('PDF hujjat haqiqiy', pdfRes.status === 200 && pdfText.startsWith('%PDF-'))

  const download = await call('POST', `/api/orders/${order.id}/download-token`, { productId: product.id }, token)
  check('tolangan mahsulotni yuklash ruxsati', download.status === 200 && Boolean(download.data.url))

  const botStatus = await call('GET', '/api/admin/telegram', null, adminToken)
  check('botlar faqat bildirishnoma uchun', botStatus.data.purpose === 'notifications_and_support' && !('orderLink' in botStatus.data))
  check('bot tokenlari log va API javobida yo\'q', ![env.TELEGRAM_ADMIN_BOT_TOKEN, env.TELEGRAM_CUSTOMER_BOT_TOKEN]
    .some((secret) => serverLog.includes(secret) || JSON.stringify(botStatus.data).includes(secret)))
  check('SMS yuborilmadi', sent.sms.length === 0)

  const otherOrder = await call('GET', `/api/orders/${order.id}`, null, duplicateVerify.data.token)
  check('ikkinchi chiqishdan keyingi token ham egasini ko\'radi', otherOrder.status === 200 || otherOrder.status === 403)
} catch (err) {
  failed += 1
  console.error('  FAIL test runner:', err instanceof Error ? err.message : err)
  if (serverLog) console.error(serverLog.slice(-1500))
} finally {
  server.kill('SIGTERM')
  await new Promise((resolve) => { mock.close(resolve) })
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
}

console.log(`\nNatija: ${passed} o'tdi, ${failed} xato`)
process.exit(failed ? 1 : 0)
