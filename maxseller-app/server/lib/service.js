// Umumiy biznes logika: veb admin va Telegram bot bir xil funksiyalarni chaqiradi.
import {
  readDb, updateDb, transactionDb, uid, nowIso, clean, logActivity,
  validateOrderInput, config,
} from './core.js'
import { clearCart } from './auth.js'
import { buildReceiptPdf } from './pdf.js'
import { saveReceiptPdf } from './storage.js'
import { notify, EVENTS } from './notifications.js'

export const ORDER_STATUSES = [
  'NEW', 'PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID',
  'IN_PROGRESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED',
]

export const STATUS_LABELS = {
  NEW: 'Yangi',
  PENDING_CONFIRMATION: 'Tasdiq kutilmoqda',
  AWAITING_PAYMENT: 'To\'lov kutilmoqda',
  PAYMENT_PROCESSING: 'To\'lov tekshirilmoqda',
  PAID: 'To\'langan',
  IN_PROGRESS: 'Ish jarayonida',
  READY_FOR_DELIVERY: 'Topshirishga tayyor',
  DELIVERED: 'Topshirildi',
  COMPLETED: 'Bajarildi',
  CANCELLED: 'Bekor qilindi',
  REFUNDED: 'Pullar qaytarildi',
}

export const PAYMENT_LABELS = {
  UNPAID: 'To\'lanmagan',
  REVIEW: 'Tekshiruvda',
  PAID: 'To\'langan',
  FAILED: 'Rad etilgan',
  REFUNDED: 'Qaytarilgan',
}

const NEXT = {
  NEW: ['PENDING_CONFIRMATION', 'AWAITING_PAYMENT', 'CANCELLED'],
  PENDING_CONFIRMATION: ['AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAYMENT_PROCESSING', 'CANCELLED'],
  PAYMENT_PROCESSING: ['PAID', 'AWAITING_PAYMENT', 'CANCELLED'],
  PAID: ['IN_PROGRESS', 'READY_FOR_DELIVERY', 'COMPLETED', 'REFUNDED'],
  IN_PROGRESS: ['READY_FOR_DELIVERY', 'CANCELLED', 'REFUNDED'],
  READY_FOR_DELIVERY: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}

export function allowedStatuses(order) {
  if (!order) return []
  let list = [...(NEXT[order.status] || [])]
  if (order.type === 'instant') list = list.filter((s) => s !== 'IN_PROGRESS')
  return list
}

export function orderNumber(db) {
  const year = new Date().getFullYear()
  const prefix = `MS-${year}-`
  const max = db.orders.reduce((acc, order) => {
    const n = Number(String(order.orderNumber || '').replace(prefix, ''))
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return `${prefix}${String(max + 1).padStart(5, '0')}`
}

// Buyurtma faqat tasdiqlangan mijozga bog'lanib yaratiladi.
// Narxlar har doim bazadagi mahsulotlardan qayta olinadi; frontend narxiga ishonilmaydi.
export function createOrder({ body = {}, user } = {}) {
  if (!user?.id || user.role !== 'customer') return { error: 'Kirish talab qilinadi' }
  if (user.accountStatus && user.accountStatus !== 'active') return { error: 'Akkaunt holati buyurtma berishga ruxsat bermaydi' }

  const preview = readDb()
  const { errors, value } = validateOrderInput(body, preview.products)
  if (errors.length) return { error: errors.join('. ') }

  const idempotencyKey = clean(body?.idempotencyKey, 120)
  if (!idempotencyKey) return { error: 'Buyurtma identifikatori yuborilmadi. Sahifani yangilab qayta urining.' }

  let result
  transactionDb((db) => {
    if (idempotencyKey) {
      const existing = db.orders.find((order) => order.idempotencyKey === idempotencyKey && order.userId === user.id)
      if (existing) {
        result = { ok: true, order: existing, duplicate: true }
        return
      }
    }

    const items = value.items.map((item) => {
      const product = db.products.find((p) => p.id === item.productId && p.active)
      if (!product) throw new Error('Katalogda bunday mahsulot yo\'q yoki u faol emas')
      return {
        productId: product.id,
        title: product.title,
        image: product.image || '',
        price: Number(product.price) || 0,
        quantity: item.quantity,
      }
    })
    if (value.type === 'instant' && items.length === 0) throw new Error('Kamida bitta mahsulot tanlang')

    const total = value.type === 'custom'
      ? Math.max(0, Number(value.budget) || 0)
      : items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const order = {
      id: uid('ord_'),
      orderNumber: orderNumber(db),
      idempotencyKey,
      userId: user.id,
      customerId: user.id,
      customerNumber: user.customerNumber || '',
      type: value.type,
      items,
      customer: {
        ...value.customer,
        name: user.name || value.customer.name,
        phone: user.phone || value.customer.phone,
        email: user.email || value.customer.email,
      },
      requirements: value.requirements,
      projectType: value.projectType,
      budget: value.budget,
      total,
      discount: 0,
      deadline: '',
      status: 'NEW',
      paymentStatus: 'UNPAID',
      paymentMethod: value.paymentMethod,
      notes: '',
      files: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    db.orders.unshift(order)
    db.statusHistory.unshift({
      id: uid('sh_'), orderId: order.id, from: null, to: 'NEW',
      reason: 'Buyurtma saytda yaratildi', actor: user.name || 'Mijoz',
      actorType: 'customer', at: nowIso(),
    })
    logActivity(db, user.name || 'Mijoz', 'ORDER_CREATE', `order:${order.orderNumber}`, {
      customerId: user.id, customerNumber: user.customerNumber,
    })
    // Savat faqat buyurtma bazaga yozilgach tozalanadi.
    clearCart(db, user.id)
    result = { ok: true, order, duplicate: false }
  })

  if (result.error) return result
  if (!result.duplicate) notifyOrderEvent(EVENTS.NEW_ORDER, result.order)
  return result
}

export function orderText(order, short = false) {
  const customer = order.customer || {}
  const items = (order.items || []).map((i) => `${i.title} x${i.quantity}`).join(', ') || order.requirements?.slice(0, 60) || '—'
  const lines = [
    `Buyurtma #${order.orderNumber}`,
    `Mijoz: ${customer.name || '—'}`,
    `Telefon: ${customer.phone || '—'}`,
  ]
  if (!short) {
    lines.push(`Telegram: ${customer.telegramUsername ? '@' + customer.telegramUsername : '—'}`)
    lines.push(`Turi: ${order.type === 'custom' ? 'Individual loyiha' : 'Tayyor mahsulot'}`)
  }
  lines.push(`Mahsulot: ${items}`)
  lines.push(`Summa: ${order.total || 0} so'm`)
  lines.push(`To'lov: ${PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus}`)
  lines.push(`Holat: ${STATUS_LABELS[order.status] || order.status}`)
  if (!short && order.customer?.notes) lines.push(`Izoh: ${order.customer.notes}`)
  return lines.join('\n')
}

export function notifyOrderEvent(event, order, extra = {}) {
  notify(event, {
    orderId: order.id,
    title: EVENTS[event] || event,
    body: orderText(order, event === EVENTS.PAYMENT_RECEIVED),
    ...extra,
  })
}

export function changeOrderStatus({ orderId, status, actor = 'system', actorType = 'system', reason = '' }) {
  if (!ORDER_STATUSES.includes(status)) return { error: 'Bunday holat yo\'q' }
  let result
  updateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) { result = { error: 'Buyurtma topilmadi' }; return }
    if (order.status === status) { result = { ok: true, order, unchanged: true }; return }
    if (!allowedStatuses(order).includes(status) && actorType !== 'system') {
      result = { error: `Bu holatga o'tib bo'lmaydi: ${STATUS_LABELS[status]}` }
      return
    }
    const from = order.status
    order.status = status
    order.updatedAt = nowIso()
    if (reason) order.rejectReason = String(reason).slice(0, 500)
    db.statusHistory.unshift({
      id: uid('sh_'), orderId, from, to: status, reason: String(reason || '').slice(0, 500),
      actor, actorType, at: nowIso(),
    })
    logActivity(db, actor, `STATUS_${status}`, `order:${order.orderNumber}`, { from, reason })
    result = { ok: true, order }
  })
  if (result?.ok && !result.unchanged) {
    const eventMap = {
      PENDING_CONFIRMATION: EVENTS.ORDER_CONFIRMED,
      AWAITING_PAYMENT: EVENTS.AWAITING_PAYMENT,
      PAYMENT_PROCESSING: EVENTS.PAYMENT_SUBMITTED,
      IN_PROGRESS: EVENTS.ORDER_IN_PROGRESS,
      READY_FOR_DELIVERY: EVENTS.PROJECT_READY,
      DELIVERED: EVENTS.PRODUCT_DELIVERED,
      COMPLETED: EVENTS.PRODUCT_DELIVERED,
      CANCELLED: EVENTS.ORDER_CANCELLED,
      REFUNDED: EVENTS.ORDER_REFUNDED,
    }
    if (eventMap[status]) notifyOrderEvent(eventMap[status], result.order, { suffix: status })
  }
  return result
}

export function confirmOrder(orderId, actor) {
  return changeOrderStatus({ orderId, status: 'AWAITING_PAYMENT', actor, actorType: 'admin' })
}

export function rejectOrder(orderId, actor, reason) {
  if (!String(reason || '').trim()) return { error: 'Rad etish sababi majburiy' }
  return changeOrderStatus({ orderId, status: 'CANCELLED', actor, actorType: 'admin', reason })
}

export function submitPayment({ orderId, dataUrl, note = '', method = '' }) {
  let result
  updateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) { result = { error: 'Buyurtma topilmadi' }; return }
    if (['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(order.status)) {
      result = { error: 'Bu buyurtmaga to\'lov qabul qilinmaydi' }; return
    }
    const existing = db.payments.find((p) => p.orderId === orderId && p.status === 'REVIEW')
    if (existing) { result = { ok: true, payment: existing, duplicate: true }; return }
    const payment = {
      id: uid('pay_'), orderId, method: method || order.paymentMethod || 'cash',
      amount: Number(order.total) || 0, status: 'REVIEW',
      receipt: dataUrl || '', note: String(note || '').slice(0, 500),
      transactionId: '', createdAt: nowIso(), verifiedAt: null, verifiedBy: null,
      attempts: 0,
    }
    db.payments.unshift(payment)
    order.paymentStatus = 'REVIEW'
    if (order.status === 'AWAITING_PAYMENT' || order.status === 'NEW') order.status = 'PAYMENT_PROCESSING'
    order.updatedAt = nowIso()
    db.statusHistory.unshift({
      id: uid('sh_'), orderId, from: 'AWAITING_PAYMENT', to: 'PAYMENT_PROCESSING',
      reason: 'To\'lov cheki yuborildi', actor: 'customer', actorType: 'customer', at: nowIso(),
    })
    logActivity(db, 'customer', 'PAYMENT_SUBMIT', `order:${order.orderNumber}`)
    result = { ok: true, payment, order }
  })
  if (result?.ok && !result.duplicate) {
    notify(EVENTS.PAYMENT_SUBMITTED, {
      orderId, paymentId: result.payment.id,
      title: 'Yangi to\'lov cheki',
      body: `Buyurtma #${result.order.orderNumber}. Summa: ${result.order.total} so'm. Admin panelda tekshiring.`,
    })
  }
  return result
}

export function verifyPayment({ paymentId, approve, actor = 'admin', reason = '' }) {
  let result
  updateDb((db) => {
    const payment = db.payments.find((p) => p.id === paymentId)
    if (!payment) { result = { error: 'To\'lov topilmadi' }; return }
    if (payment.status === 'PAID' || payment.status === 'FAILED') {
      result = { ok: true, payment, duplicate: true }; return
    }
    if (!approve && !String(reason || '').trim()) {
      result = { error: 'Rad etish sababi majburiy' }; return
    }
    const order = db.orders.find((o) => o.id === payment.orderId)
    if (!order) { result = { error: 'Buyurtma topilmadi' }; return }

    payment.status = approve ? 'PAID' : 'FAILED'
    payment.verifiedAt = nowIso()
    payment.verifiedBy = actor
    payment.reason = String(reason || '').slice(0, 500)
    order.paymentStatus = approve ? 'PAID' : 'UNPAID'
    order.updatedAt = nowIso()

    if (approve) {
      order.status = order.type === 'custom' ? 'IN_PROGRESS' : 'READY_FOR_DELIVERY'
      const items = order.items || []
      for (const item of items) {
        const already = db.deliveries.find((d) => d.orderId === order.id && d.productId === item.productId)
        if (!already) {
          db.deliveries.unshift({
            id: uid('dlv_'), orderId: order.id, productId: item.productId,
            title: item.title, grantedAt: nowIso(), grantedBy: actor,
          })
        }
        const purchased = db.purchases.find((p) => p.orderId === order.id && p.productId === item.productId && p.userId === order.userId)
        if (!purchased && order.userId) {
          db.purchases.unshift({
            id: uid('pur_'), userId: order.userId, customerNumber: order.customerNumber || '',
            orderId: order.id, productId: item.productId, title: item.title,
            image: item.image || '', price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1, grantedAt: nowIso(), grantedBy: actor,
            paymentId: payment.id, license: 'Shaxsiy foydalanish huquqi. Qayta sotish taqiqlanadi.',
            createdAt: nowIso(),
          })
        }
      }
      const transactionExists = db.transactions.some((t) => t.paymentId === payment.id)
      if (!transactionExists) {
        db.transactions.unshift({
          id: uid('txn_'), paymentId: payment.id, orderId: order.id,
          userId: order.userId || null, amount: Number(payment.amount) || 0,
          method: payment.method || order.paymentMethod || 'cash',
          status: 'PAID', type: 'payment', transactionId: payment.transactionId || '',
          createdAt: nowIso(),
        })
      }
    }
    db.statusHistory.unshift({
      id: uid('sh_'), orderId: order.id,
      from: 'PAYMENT_PROCESSING', to: approve ? (order.type === 'custom' ? 'IN_PROGRESS' : 'READY_FOR_DELIVERY') : 'AWAITING_PAYMENT',
      reason: approve ? 'To\'lov tasdiqlandi' : `To'lov rad etildi: ${reason}`,
      actor, actorType: 'admin', at: nowIso(),
    })
    logActivity(db, actor, approve ? 'PAYMENT_APPROVE' : 'PAYMENT_REJECT', `order:${order.orderNumber}`)
    result = { ok: true, payment, order }
  })
  if (result?.ok && !result.duplicate) {
    notify(approve ? EVENTS.PAYMENT_RECEIVED : EVENTS.PAYMENT_FAILED, {
      orderId: result.order.id, paymentId: result.payment.id,
      title: approve ? 'To\'lov tasdiqlandi' : 'To\'lov rad etildi',
      body: `Buyurtma #${result.order.orderNumber}. ${approve ? 'Mahsulotga kirish ochildi.' : `Sabab: ${reason}`}`,
    })
  }
  return result
}

export function makeReceipt(orderId) {
  let result
  updateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId)
    if (!order) { result = { error: 'Buyurtma topilmadi' }; return }
    const existing = db.receipts.find((r) => r.orderId === orderId)
    if (existing) { result = { ok: true, receipt: existing }; return }
    const number = `MS-RCP-${String(db.receipts.length + 1).padStart(5, '0')}`
    const subtotal = (order.items || []).reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
    const payment = db.payments.find((p) => p.orderId === orderId && p.status === 'PAID')
    const pdf = buildReceiptPdf({
      receiptNumber: number,
      orderNumber: order.orderNumber,
      date: new Date(order.createdAt).toLocaleString('uz-UZ'),
      orderType: order.type === 'custom' ? 'Individual loyiha' : 'Tayyor mahsulot',
      status: STATUS_LABELS[order.status] || order.status,
      customer: order.customer || {},
      items: order.items || [],
      subtotal,
      discount: Number(order.discount) || 0,
      total: Number(order.total) || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: PAYMENT_LABELS[order.paymentStatus] || order.paymentStatus,
      transactionId: payment?.transactionId || '',
      orderStatus: STATUS_LABELS[order.status] || order.status,
      notes: order.customer?.notes || '',
    })
    const filePath = saveReceiptPdf(pdf)
    const receipt = {
      id: uid('rcp_'), orderId, number, filePath, total: Number(order.total) || 0,
      createdAt: nowIso(), isFiscal: false,
    }
    db.receipts.unshift(receipt)
    logActivity(db, 'system', 'RECEIPT_CREATE', `order:${order.orderNumber}`)
    result = { ok: true, receipt }
  })
  return result
}

export function getStats() {
  const db = readDb()
  const today = new Date().toISOString().slice(0, 10)
  const orders = db.orders
  const revenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + Number(o.total || 0), 0)
  const top = {}
  for (const order of orders) {
    for (const item of order.items || []) {
      top[item.title] = (top[item.title] || 0) + Number(item.quantity || 1)
    }
  }
  return {
    total: orders.length,
    today: orders.filter((o) => o.createdAt?.slice(0, 10) === today).length,
    new: orders.filter((o) => o.status === 'NEW').length,
    inProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    unpaid: orders.filter((o) => o.paymentStatus !== 'PAID').length,
    revenue,
    customers: db.users.filter((u) => u.role === 'customer').length,
    products: db.products.filter((p) => p.active).length,
    paymentsPending: db.payments.filter((p) => p.status === 'REVIEW').length,
    topProducts: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([title, count]) => ({ title, count })),
  }
}

export function publicOrder(order) {
  if (!order) return null
  const { guestToken, ...safe } = order
  return safe
}

export function paymentMethods() {
  const configured = {
    click: Boolean(config.payments.clickMerchantId && config.payments.clickSecretKey),
    payme: Boolean(config.payments.paymeMerchantId && config.payments.paymeSecretKey),
  }
  return [
    { id: 'cash', name: 'Naqd / kelishilgan to\'lov', available: true, instructions: 'Admin bilan kelishib, karta yoki naqd orqali to\'lang va chekni yuklang.' },
    { id: 'card', name: 'Bank kartasi (o\'tkazma)', available: true, instructions: 'Admin ko\'rsatgan karta raqamiga o\'tkazing va chekni yuklang.' },
    { id: 'click', name: 'Click', available: configured.click, instructions: configured.click ? 'Click orqali to\'lang.' : 'Click sozlanmagan — hozircha foydalanib bo\'lmaydi.' },
    { id: 'payme', name: 'Payme', available: configured.payme, instructions: configured.payme ? 'Payme orqali to\'lang.' : 'Payme sozlanmagan — hozircha foydalanib bo\'lmaydi.' },
  ]
}
