// MaxSeller Telegram: Admin bot (Control) + Customer bot (Assistant).
// Ikkalasi ham bitta backend va db.json ustida ishlaydi. Tokenlar faqat .env dan.
import { readDb, writeDb, updateDb, uid, nowIso, config, clean } from '../lib/core.js'
import { setNotificationDelivery } from '../lib/notifications.js'
import {
  STATUS_LABELS, PAYMENT_LABELS, getStats, orderText, changeOrderStatus,
  verifyPayment, makeReceipt, allowedStatuses,
} from '../lib/service.js'

const ADMIN = 'admin'
const CUSTOMER = 'customer'
const tokens = {
  [ADMIN]: config.telegram.adminBotToken,
  [CUSTOMER]: config.telegram.customerBotToken,
}
let running = false
const timers = {}

/* --------------------------- Bot API --------------------------- */
function safeError(err) {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(new RegExp(tokens[ADMIN] || 'xXx', 'g'), '[token]')
    .replace(new RegExp(tokens[CUSTOMER] || 'xXx', 'g'), '[token]')
    .slice(0, 250)
}

async function api(bot, method, body) {
  const token = tokens[bot]
  if (!token) throw new Error(`${bot} bot tokeni sozlanmagan`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`${config.telegram.apiBaseUrl}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.ok === false) {
      throw new Error(data?.description || `Telegram xatosi: ${response.status}`)
    }
    return data.result
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Telegram javob bermadi (timeout)')
    throw new Error(safeError(err))
  } finally {
    clearTimeout(timer)
  }
}

function chunk(text) {
  const value = String(text || '')
  const out = []
  for (let i = 0; i < value.length; i += 3800) out.push(value.slice(i, i + 3800))
  return out.length ? out : ['']
}

async function send(bot, chatId, text, replyMarkup) {
  if (!chatId) throw new Error('Chat ID yo\'q')
  let last
  for (const part of chunk(text)) {
    last = await api(bot, 'sendMessage', {
      chat_id: chatId,
      text: part,
      parse_mode: undefined,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    })
  }
  return last
}

const kb = (rows) => ({ inline_keyboard: rows })
const btn = (text, callbackData, url) => (url ? { text, url } : { text, callback_data: callbackData })

function adminChatId() {
  const db = readDb()
  return config.telegram.adminChatId || db.telegram.adminChatId || ''
}

function isAdmin(from = {}) {
  const username = String(from.username || '').replace(/^@/, '').toLowerCase()
  return config.telegram.adminIds.includes(String(from.id)) || username === config.telegram.adminUsername.toLowerCase()
}

function customerByTelegram(telegramId) {
  return readDb().users.find((u) => u.telegramId === telegramId && u.role === 'customer') || null
}

/* --------------------- Notification delivery --------------------- */
setNotificationDelivery(async (event, payload) => {
  const results = []
  const order = payload.orderId ? readDb().orders.find((o) => o.id === payload.orderId) : null
  const header = payload.title ? `🔔 ${payload.title}` : '🔔 MaxSeller'
  const text = `${header}\n\n${payload.body || ''}`
  const adminId = adminChatId()

  if (tokens[ADMIN] && adminId) {
    const keyboard = order ? kb([[btn('Buyurtmani ochish', `a:o:${order.id}`)]]) : undefined
    results.push(await send(ADMIN, adminId, text, keyboard).then(() => 'ok', (e) => `admin: ${safeError(e)}`))
  }

  if (tokens[CUSTOMER] && order?.userId) {
    const user = readDb().users.find((u) => u.id === order.userId)
    if (user?.telegramId && user.telegramNotifications !== false) {
      results.push(await send(CUSTOMER, user.telegramId, text).then(() => 'ok', (e) => `customer: ${safeError(e)}`))
    }
  }
  const failures = results.filter((r) => r !== 'ok')
  if (failures.length && failures.length === results.length) throw new Error(failures.join(' | '))
})

/* --------------------------- Admin bot --------------------------- */
function mainMenu() {
  return kb([
    [btn('📦 Buyurtmalar', 'a:orders'), btn('🆕 Yangilar', 'a:new')],
    [btn('💳 To\'lovlar', 'a:pay'), btn('📊 Statistika', 'a:stats')],
    [btn('👥 Mijozlar', 'a:customers'), btn('⚙️ Sozlamalar', 'a:settings')],
    [btn('🔔 Bildirishnomalar', 'a:notify')],
  ])
}

function orderKeyboard(order) {
  const rows = [
    [btn('✅ Tasdiqlash', `a:ok:${order.id}`), btn('❌ Rad etish', `a:no:${order.id}`)],
    [btn('💳 To\'lov tekshirish', `a:pay:${order.id}`), btn('📞 Mijoz', `a:contact:${order.id}`)],
    [btn('🔄 Holat', `a:status:${order.id}`), btn('🧾 Chek', `a:receipt:${order.id}`)],
    [btn('◀️ Buyurtmalar', 'a:orders')],
  ]
  return kb(rows)
}

async function adminStart(msg) {
  const from = msg.from || {}
  if (!isAdmin(from)) {
    await send(ADMIN, msg.chat.id, '⛔ Bu bot faqat MaxSeller adminlari uchun. Sizga ruxsat berilmagan.')
    return
  }
  const db = readDb()
  if (db.telegram.adminChatId !== String(msg.chat.id)) {
    db.telegram.adminChatId = String(msg.chat.id)
    if (!Array.isArray(db.telegram.adminChatIds)) db.telegram.adminChatIds = []
    if (!db.telegram.adminChatIds.includes(String(msg.chat.id))) db.telegram.adminChatIds.push(String(msg.chat.id))
    writeDb(db)
  }
  await send(ADMIN, msg.chat.id,
    `👋 Assalomu alaykum!\n\nMaxSeller Control — admin boshqaruv boti.\nSiz admin sifatida tanildingiz. Buyurtmalar shu chatga keladi.\n\nChat ID: <code>${msg.chat.id}</code>\n\nQuyidagi menyudan foydalaning:`, mainMenu())
}

function ordersList(statusFilter, page = 0) {
  const db = readDb()
  let orders = [...db.orders]
  if (statusFilter === 'new') orders = orders.filter((o) => ['NEW', 'PENDING_CONFIRMATION', 'PAYMENT_PROCESSING'].includes(o.status))
  if (statusFilter === 'pay') orders = orders.filter((o) => db.payments.some((p) => p.orderId === o.id && p.status === 'REVIEW'))
  orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const perPage = 8
  const pages = Math.max(1, Math.ceil(orders.length / perPage))
  const current = Math.min(Math.max(0, page), pages - 1)
  const slice = orders.slice(current * perPage, current * perPage + perPage)
  const text = slice.length
    ? slice.map((o) => `• #${o.orderNumber} | ${o.customer?.name || '—'} | ${o.total} so'm | ${STATUS_LABELS[o.status] || o.status}`).join('\n')
    : 'Buyurtma topilmadi.'
  const rows = slice.map((o) => [btn(`#${o.orderNumber} - ${o.customer?.name || '—'}`, `a:o:${o.id}`)])
  const nav = []
  if (current > 0) nav.push(btn('◀ Oldingi', `a:page:${statusFilter}:${current - 1}`))
  if (current < pages - 1) nav.push(btn('Keyingi ▶', `a:page:${statusFilter}:${current + 1}`))
  if (nav.length) rows.push(nav)
  rows.push([btn('◀️ Menyu', 'a:menu')])
  return { text: `📦 Buyurtmalar (${orders.length}) - sahifa ${current + 1}/${pages}\n\n${text}`, keyboard: kb(rows) }
}

async function adminCallback(query) {
  const data = String(query.data || '')
  const chatId = query.message?.chat?.id
  if (!isAdmin(query.from)) {
    await api(ADMIN, 'answerCallbackQuery', { callback_query_id: query.id, text: 'Ruxsat yo\'q', show_alert: true })
    return
  }
  const answer = async (text = '') => {
    await api(ADMIN, 'answerCallbackQuery', { callback_query_id: query.id, text }).catch(() => undefined)
  }
  const edit = async (text, keyboard) => {
    await api(ADMIN, 'editMessageText', {
      chat_id: chatId, message_id: query.message.message_id, text, ...(keyboard ? { reply_markup: keyboard } : {}),
    }).catch(() => send(ADMIN, chatId, text, keyboard))
  }

  if (data === 'a:menu') { await answer(); return edit('⚙️ MaxSeller Control', mainMenu()) }
  if (data === 'a:orders' || data === 'a:new' || data === 'a:pay') {
    await answer()
    const filter = data === 'a:new' ? 'new' : data === 'a:pay' ? 'pay' : 'all'
    const list = ordersList(filter)
    return edit(list.text, list.keyboard)
  }
  if (data.startsWith('a:page:')) {
    await answer()
    const [, , filter, page] = data.split(':')
    const list = ordersList(filter, Number(page) || 0)
    return edit(list.text, list.keyboard)
  }
  if (data === 'a:stats') {
    await answer()
    const s = getStats()
    return edit(`📊 Statistika\n\nBuyurtmalar: ${s.total}\nBugungi: ${s.today}\nYangi: ${s.new}\nJarayonda: ${s.inProgress}\nBajarilgan: ${s.completed}\nBekor qilingan: ${s.cancelled}\nTushum: ${s.revenue} so'm\nMijozlar: ${s.customers}\nKutilayotgan to'lovlar: ${s.paymentsPending}`, kb([[btn('◀️ Menyu', 'a:menu')]]))
  }
  if (data === 'a:customers') {
    await answer()
    const db = readDb()
    const list = db.users.filter((u) => u.role === 'customer').slice(0, 15)
      .map((u) => `• ${u.name} | ${u.phone} | ${u.telegramId ? '@' + (u.telegramUsername || 'bog\'langan') : 'bog\'lanmagan'}`).join('\n')
    return edit(`👥 Mijozlar (${list ? db.users.filter((u) => u.role === 'customer').length : 0})\n\n${list || 'Hali mijoz yo\'q'}`, kb([[btn('◀️ Menyu', 'a:menu')]]))
  }
  if (data === 'a:settings' || data === 'a:notify') {
    await answer()
    const db = readDb()
    const stats = db.notifications.slice(0, 30)
    const text = data === 'a:notify'
      ? `🔔 Bildirishnomalar\n\n${stats.map((n) => `${n.status === 'SENT' ? '✅' : n.status === 'FAILED' ? '❌' : '⏳'} ${n.event} - ${n.createdAt.slice(0, 16)}`).join('\n') || 'Hali yo\'q'}`
      : `⚙️ Sozlamalar\n\nAdmin username: @${config.telegram.adminUsername}\nAdmin chat: ${adminChatId() || 'ulanmagan'}\nAdmin bot: ${tokens[ADMIN] ? 'faol' : 'yo\'q'}\nMijoz boti: ${tokens[CUSTOMER] ? 'faol' : 'yo\'q'}\n\nBotlar faqat bildirishnoma va yordamchi xizmat uchun. Buyurtmalar faqat saytda rasmiylashtiriladi.`
    return edit(text, kb([[btn('◀️ Menyu', 'a:menu')]]))
  }
  if (data.startsWith('a:o:')) {
    await answer()
    const order = readDb().orders.find((o) => o.id === data.slice(4))
    if (!order) return edit('Buyurtma topilmadi.', kb([[btn('◀️', 'a:orders')]]))
    return edit(orderText(order), orderKeyboard(order))
  }
  if (data.startsWith('a:ok:')) {
    await answer()
    const result = changeOrderStatus({ orderId: data.slice(5), status: 'AWAITING_PAYMENT', actor: 'telegram-admin', actorType: 'admin' })
    return send(ADMIN, chatId, result.ok ? '✅ Buyurtma tasdiqlandi, to\'lov kutilmoqda.' : `❌ ${result.error}`)
  }
  if (data.startsWith('a:no:')) {
    await answer()
    const id = data.slice(5)
    updateDb((db) => { db.telegram.pending = { ...(db.telegram.pending || {}), [chatId]: { action: 'reject', orderId: id } } })
    return send(ADMIN, chatId, '✍️ Rad etish sababini yozing (bu mijozga yetkaziladi):')
  }
  if (data.startsWith('a:status:')) {
    await answer()
    const id = data.slice(9)
    const order = readDb().orders.find((o) => o.id === id)
    if (!order) return send(ADMIN, chatId, 'Buyurtma topilmadi')
    const allowed = allowedStatuses(order)
    if (!allowed.length) return send(ADMIN, chatId, 'Bu buyurtma yakuniy holatda')
    return edit(`🔄 Holatni tanlang: #${order.orderNumber}`, kb([
      ...allowed.map((s) => [btn(STATUS_LABELS[s], `a:set:${id}:${s}`)]),
      [btn('◀️ Orqaga', `a:o:${id}`)],
    ]))
  }
  if (data.startsWith('a:set:')) {
    await answer()
    const [, , id, status] = data.split(':')
    const result = changeOrderStatus({ orderId: id, status, actor: 'telegram-admin', actorType: 'admin' })
    return send(ADMIN, chatId, result.ok ? `✅ Holat: ${STATUS_LABELS[status]}` : `❌ ${result.error}`)
  }
  if (data.startsWith('a:contact:')) {
    await answer()
    const order = readDb().orders.find((o) => o.id === data.slice(10))
    if (!order) return send(ADMIN, chatId, 'Buyurtma topilmadi')
    const c = order.customer || {}
    const links = [c.phone ? `📞 ${c.phone}` : '', c.telegramUsername ? `✈️ https://t.me/${c.telegramUsername}` : ''].filter(Boolean)
    return send(ADMIN, chatId, `Mijoz: ${c.name}\nBuyurtma: #${order.orderNumber}\n${links.join('\n') || 'Aloqa ma\'lumoti yo\'q'}`)
  }
  if (data === 'a:pay' || data.startsWith('a:pay:')) {
    if (data === 'a:pay') return
    await answer()
    const payment = readDb().payments.find((p) => p.id === data.slice(6))
    if (!payment) return send(ADMIN, chatId, 'To\'lov topilmadi')
    const order = readDb().orders.find((o) => o.id === payment.orderId)
    return edit(`💳 To'lov\n\nBuyurtma: #${order?.orderNumber || '—'}\nSumma: ${payment.amount} so'm\nUsul: ${payment.method}\nHolat: ${PAYMENT_LABELS[payment.status] || payment.status}\nTranzaksiya: ${payment.transactionId || '—'}\nIzoh: ${payment.note || '—'}`, kb([
      [btn('✅ Tasdiqlash', `a:ver:${payment.id}`), btn('❌ Rad etish', `a:rev:${payment.id}`)],
      [btn('◀️ Buyurtmalar', 'a:orders')],
    ]))
  }
  if (data.startsWith('a:ver:')) {
    await answer()
    const result = verifyPayment({ paymentId: data.slice(6), approve: true, actor: 'telegram-admin' })
    return send(ADMIN, chatId, result.ok ? '✅ To\'lov tasdiqlandi, mijozga xabar yuborildi.' : `❌ ${result.error}`)
  }
  if (data.startsWith('a:rev:')) {
    await answer()
    const id = data.slice(6)
    updateDb((db) => { db.telegram.pending = { ...(db.telegram.pending || {}), [chatId]: { action: 'rejectPayment', paymentId: id } } })
    return send(ADMIN, chatId, '✍️ To\'lovni rad etish sababini yozing:')
  }
  if (data.startsWith('a:receipt:')) {
    await answer()
    const result = makeReceipt(data.slice(10))
    return send(ADMIN, chatId, result.ok ? `🧾 Chek yaratildi: ${result.receipt.number}` : `❌ ${result.error}`)
  }
}

async function adminMessage(msg) {
  const chatId = msg.chat.id
  if (!isAdmin(msg.from)) {
    if (msg.text === '/start') return adminStart(msg)
    return send(ADMIN, chatId, '⛔ Ruxsat yo\'q. Bu bot faqat adminlar uchun.')
  }
  const pending = readDb().telegram.pending?.[chatId]
  if (pending && msg.text && !msg.text.startsWith('/')) {
    const text = clean(msg.text, 500)
    if (pending.action === 'reject') {
      const result = changeOrderStatus({ orderId: pending.orderId, status: 'CANCELLED', actor: 'telegram-admin', actorType: 'admin', reason: text })
      await send(ADMIN, chatId, result.ok ? '✅ Buyurtma rad etildi, mijozga sabab yetkaziladi.' : `❌ ${result.error}`)
    } else if (pending.action === 'rejectPayment') {
      const result = verifyPayment({ paymentId: pending.paymentId, approve: false, actor: 'telegram-admin', reason: text })
      await send(ADMIN, chatId, result.ok ? '✅ To\'lov rad etildi.' : `❌ ${result.error}`)
    }
    updateDb((db) => { if (db.telegram.pending) delete db.telegram.pending[chatId] })
    return
  }
  const text = String(msg.text || '')
  if (text.startsWith('/start')) return adminStart(msg)
  if (text === '/id') return send(ADMIN, chatId, `Sizning chat ID: <code>${chatId}</code>`)
  if (text === '/help') return send(ADMIN, chatId, 'Buyruqlar:\n/start - menyu\n/orders - buyurtmalar\n/new - yangi buyurtmalar\n/pay - to\'lovlar\n/stats - statistika\n/id - chat ID', mainMenu())
  if (text === '/orders') { const l = ordersList('all'); return send(ADMIN, chatId, l.text, l.keyboard) }
  if (text === '/new') { const l = ordersList('new'); return send(ADMIN, chatId, l.text, l.keyboard) }
  if (text === '/stats') { const s = getStats(); return send(ADMIN, chatId, `📊 Buyurtma: ${s.total} | Bugungi: ${s.today} | Tushum: ${s.revenue} so'm`) }
  const match = /^\/order_(\S+)$/.exec(text)
  if (match) {
    const order = readDb().orders.find((o) => o.orderNumber === match[1] || o.id === match[1])
    return send(ADMIN, chatId, order ? orderText(order) : 'Buyurtma topilmadi', order ? orderKeyboard(order) : undefined)
  }
  return send(ADMIN, chatId, 'Menyudan foydalaning yoki /help yozing.', mainMenu())
}

/* --------------------------- Customer bot --------------------------- */
function customerMenu(linked) {
  return kb([
    [btn('🛍 Do\'konga kirish', null, config.storeUrl)],
    [btn('📦 Mening buyurtmalarim', 'c:orders'), btn('🔎 Buyurtma kuzatish', 'c:track')],
    [btn('💳 To\'lovlarim', 'c:payments'), btn('🧾 Hujjatlar', 'c:receipts')],
    [btn(linked ? '👤 Profilim' : '🔗 Akkauntni bog\'lash', linked ? 'c:profile' : 'c:link')],
    [btn('💬 Yordam', 'c:help')],
  ])
}

async function customerStart(msg) {
  const user = customerByTelegram(msg.from?.id)
  const db = readDb()
  if (!user && db.telegram.pendingCustomers?.[msg.chat.id]?.linkRequested) {
    // bog'lash kodi allaqachon yuborilgan
  }
  await send(CUSTOMER, msg.chat.id,
    `👋 Assalomu alaykum, ${msg.from?.first_name || 'mijoz'}!\n\nMaxSeller Assistant — buyurtmalaringizni kuzatish va yordam olish boti.\n\n${user ? 'Akkauntingiz bog\'langan ✅' : 'Buyurtmalaringizni ko\'rish uchun saytdagi profilingizdan akkauntni bog\'lang.'}`, customerMenu(Boolean(user)))
}

async function customerCallback(query) {
  const data = String(query.data || '')
  const chatId = query.message?.chat?.id
  const answer = async (text = '') => api(CUSTOMER, 'answerCallbackQuery', { callback_query_id: query.id, text }).catch(() => undefined)
  const edit = async (text, keyboard) => {
    await api(CUSTOMER, 'editMessageText', {
      chat_id: chatId, message_id: query.message.message_id, text, ...(keyboard ? { reply_markup: keyboard } : {}),
    }).catch(() => send(CUSTOMER, chatId, text, keyboard))
  }
  const user = customerByTelegram(query.from?.id)

  if (data === 'c:link') {
    await answer()
    if (user) return edit('Akkauntingiz allaqachon bog\'langan ✅', customerMenu(true))
    const code = String(Math.floor(100000 + Math.random() * 900000))
    updateDb((db) => {
      db.linkCodes = db.linkCodes.filter((c) => c.telegramId !== query.from.id)
      db.linkCodes.unshift({ code, telegramId: query.from.id, telegramUsername: query.from.username || '', expiresAt: Date.now() + 15 * 60 * 1000, usedAt: null, createdAt: nowIso() })
    })
    return edit(`🔗 Bog'lash kodi: <code>${code}</code>\n\nBu kodni MaxSeller saytidagi\n<b>Profil → Telegram botni bog'lash</b>\njoyiga kiriting.\nKod 15 daqiqa amal qiladi.`, kb([[btn('◀️ Menyu', 'c:menu')]]))
  }
  if (data === 'c:menu') { await answer(); return edit('🏠 Asosiy menyu', customerMenu(Boolean(user))) }
  if (!user) {
    await answer('Avval akkauntni bog\'lang')
    return edit('🔗 Avval saytdagi profil orqali akkauntni bog\'lang.', kb([[btn('Bog\'lash', 'c:link')]]))
  }
  if (data === 'c:orders' || data === 'c:payments' || data === 'c:receipts') {
    await answer()
    const db = readDb()
    const orders = db.orders.filter((o) => o.userId === user.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    let text
    let rows = []
    if (data === 'c:orders') {
      text = orders.length ? orders.slice(0, 12).map((o) => `• #${o.orderNumber} | ${STATUS_LABELS[o.status] || o.status} | ${o.total} so'm`).join('\n') : 'Hali buyurtma yo\'q.'
      rows = orders.slice(0, 12).map((o) => [btn(`#${o.orderNumber}`, `c:o:${o.id}`)])
    } else if (data === 'c:payments') {
      const payments = db.payments.filter((p) => orders.some((o) => o.id === p.orderId))
      text = payments.length ? payments.slice(0, 12).map((p) => `• ${p.amount} so'm | ${PAYMENT_LABELS[p.status] || p.status} | ${p.createdAt.slice(0, 10)}`).join('\n') : 'To\'lovlar yo\'q.'
    } else {
      const receipts = db.receipts.filter((r) => orders.some((o) => o.id === r.orderId))
      text = receipts.length ? receipts.slice(0, 12).map((r) => `• ${r.number} | ${r.total} so'm`).join('\n') : 'Hujjatlar yo\'q. Saytdagi kabinetdan yuklab oling.'
    }
    rows.push([btn('◀️ Menyu', 'c:menu')])
    return edit(`📋 ${data === 'c:orders' ? 'Buyurtmalar' : data === 'c:payments' ? 'To\'lovlar' : 'Hujjatlar'}\n\n${text}`, kb(rows))
  }
  if (data.startsWith('c:o:')) {
    await answer()
    const order = readDb().orders.find((o) => o.id === data.slice(4) && o.userId === user.id)
    if (!order) return edit('Buyurtma topilmadi.', kb([[btn('◀️', 'c:orders')]]))
    return edit(orderText(order), kb([[btn('🧾 Hujjat olish', 'c:receipts')], [btn('◀️ Buyurtmalar', 'c:orders')]]))
  }
  if (data === 'c:profile') {
    await answer()
    return edit(`👤 ${user.name}\n📞 ${user.phone}\n✈️ @${user.telegramUsername || '—'}\n🔔 Xabarlar: ${user.telegramNotifications === false ? 'o\'chirilgan' : 'yoqilgan'}`, kb([
      [btn(user.telegramNotifications === false ? '🔔 Xabarlarni yoqish' : '🔕 Xabarlarni o\'chirish', 'c:notify')],
      [btn('◀️ Menyu', 'c:menu')],
    ]))
  }
  if (data === 'c:notify') {
    updateDb((db) => {
      const target = db.users.find((u) => u.id === user.id)
      if (target) target.telegramNotifications = target.telegramNotifications === false
    })
    return customerCallback({ ...query, data: 'c:profile' })
  }
  if (data === 'c:help') {
    await answer()
    return edit('💬 Yordam uchun saytdagi Kontakt sahifasidan yozing yoki buyurtma raqamini ko\'rsatib admin botga murojaat qiling.', customerMenu(true))
  }
}

async function customerMessage(msg) {
  const chatId = msg.chat.id
  const text = String(msg.text || '')
  if (text.startsWith('/start')) return customerStart(msg)
  if (text === '/help') return send(CUSTOMER, chatId, 'Buyruqlar:\n/start - menyu\n/orders - buyurtmalarim\n/link - akkauntni bog\'lash', customerMenu(Boolean(customerByTelegram(msg.from?.id))))
  const user = customerByTelegram(msg.from?.id)
  if (!user) return send(CUSTOMER, chatId, 'Avval saytdan akkauntni bog\'lang (/link).', customerMenu(false))
  if (text === '/orders') {
    const orders = readDb().orders.filter((o) => o.userId === user.id)
    return send(CUSTOMER, chatId, orders.length ? orders.map((o) => `#${o.orderNumber} - ${STATUS_LABELS[o.status] || o.status}`).join('\n') : 'Buyurtma yo\'q.', customerMenu(true))
  }
  if (text === '/link') return customerCallback({ id: 'synthetic', from: msg.from, message: msg, data: 'c:link' })
  const track = /^#?(MS-\d{4}-\d+)$/.exec(text.trim())
  if (track) {
    const order = readDb().orders.find((o) => o.orderNumber === track[1] && o.userId === user.id)
    return send(CUSTOMER, chatId, order ? orderText(order) : 'Bunday buyurtma topilmadi yoki sizga tegishli emas.', customerMenu(true))
  }
  return send(CUSTOMER, chatId, 'Menyudan foydalaning.', customerMenu(true))
}

/* --------------------------- Poll loop --------------------------- */
async function handleUpdate(bot, update) {
  const db = readDb()
  if (db.telegram.processedUpdates.includes(update.update_id)) return
  db.telegram.processedUpdates = [update.update_id, ...db.telegram.processedUpdates].slice(0, 600)
  writeDb(db)
  if (bot === ADMIN) {
    if (update.message) await adminMessage(update.message)
    if (update.callback_query) await adminCallback(update.callback_query)
  } else {
    if (update.message) await customerMessage(update.message)
    if (update.callback_query) await customerCallback(update.callback_query)
  }
}

export async function handleWebhookUpdate(bot, body) {
  if (!tokens[bot]) return
  await handleUpdate(bot, body)
}

async function poll(bot) {
  if (!running || !tokens[bot]) return
  const key = bot === ADMIN ? 'admin' : 'customer'
  try {
    const offset = readDb().telegram.offsets[key] || 0
    const updates = await api(bot, 'getUpdates', { offset, timeout: 10, allowed_updates: ['message', 'callback_query'] })
    for (const update of updates) {
      const current = readDb().telegram.offsets[key] || 0
      if (update.update_id >= current) {
        const db = readDb()
        db.telegram.offsets[key] = update.update_id + 1
        writeDb(db)
      }
      await handleUpdate(bot, update)
    }
  } catch (err) {
    const message = safeError(err)
    // 401 — noto'g'ri token: har 5 daqiqada bir marta xabar
    if (!message.includes('401') || !timers[`warn_${key}`]) {
      console.warn(`[telegram:${key}] ${message}`)
      timers[`warn_${key}`] = true
      setTimeout(() => { timers[`warn_${key}`] = false }, 5 * 60 * 1000).unref?.()
    }
  } finally {
    if (running) timers[key] = setTimeout(() => void poll(bot), 400)
  }
}

export async function startTelegram() {
  if (running) return
  running = true
  if (config.telegram.mode === 'webhook' && config.telegram.webhookBaseUrl && config.telegram.webhookSecret) {
    for (const bot of [ADMIN, CUSTOMER]) {
      if (!tokens[bot]) continue
      try {
        await api(bot, 'setWebhook', {
          url: `${config.telegram.webhookBaseUrl}/api/telegram/${bot}/${config.telegram.webhookSecret}`,
          allowed_updates: ['message', 'callback_query'],
        })
        console.log(`[telegram:${bot}] webhook o'rnatildi`)
      } catch (err) { console.warn(`[telegram:${bot}] webhook: ${safeError(err)}`) }
    }
    return
  }
  for (const bot of [ADMIN, CUSTOMER]) {
    if (tokens[bot]) void poll(bot)
    else console.warn(`[telegram:${bot}] token yo'q — bot ishlamaydi, sayt va buyurtmalar normal ishlaydi`)
  }
}

export function stopTelegram() {
  running = false
  for (const key of [ADMIN, CUSTOMER]) if (timers[key]) clearTimeout(timers[key])
}

export function telegramStatus() {
  return {
    adminBotConfigured: Boolean(tokens[ADMIN]),
    customerBotConfigured: Boolean(tokens[CUSTOMER]),
    adminChatConnected: Boolean(adminChatId()),
    adminChatId: adminChatId(),
    adminUsername: config.telegram.adminUsername,
    mode: config.telegram.mode,
    purpose: 'notifications_and_support',
  }
}

export async function sendAdminMessage(text) {
  return send(ADMIN, adminChatId(), text, mainMenu())
}
