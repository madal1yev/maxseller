// Markazlashgan bildirishnoma xizmati: dedupe, retry va Telegram yetkazib berish.
// Telegram ishlamasa ham buyurtma oqimi to'xtamaydi.
import { readDb, writeDb, uid, nowIso } from './core.js'

let delivery = null
export function setNotificationDelivery(fn) {
  delivery = fn
}

export const EVENTS = {
  NEW_ORDER: 'NEW_ORDER',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_IN_PROGRESS: 'ORDER_IN_PROGRESS',
  PROJECT_READY: 'PROJECT_READY',
  PRODUCT_DELIVERED: 'PRODUCT_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  ORDER_REFUNDED: 'ORDER_REFUNDED',
}

const RETRY_DELAYS = [0, 1500, 5000]

export function notify(event, payload = {}) {
  const dedupeKey = `${event}:${payload.orderId || payload.paymentId || 'global'}:${payload.suffix || ''}`
  const db = readDb()
  if (db.notifications.some((n) => n.dedupeKey === dedupeKey)) return null

  const record = {
    id: uid('ntf_'),
    event,
    dedupeKey,
    orderId: payload.orderId || null,
    paymentId: payload.paymentId || null,
    title: payload.title || event,
    body: payload.body || '',
    channel: 'TELEGRAM',
    status: 'PENDING',
    attempts: 0,
    createdAt: nowIso(),
    error: '',
  }
  db.notifications.unshift(record)
  writeDb(db)

  const attempt = (index) => {
    if (!delivery) {
      markNotification(record.id, 'SKIPPED', 'Telegram moduli yuklanmagan')
      return
    }
    Promise.resolve(delivery(event, payload))
      .then(() => markNotification(record.id, 'SENT'))
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Noma\'lum xatolik'
        if (index < RETRY_DELAYS.length - 1) {
          setTimeout(() => attempt(index + 1), RETRY_DELAYS[index + 1])
        } else {
          markNotification(record.id, 'FAILED', message.slice(0, 300))
        }
      })
  }
  setTimeout(() => attempt(0), RETRY_DELAYS[0])
  return record.id
}

function markNotification(id, status, error = '') {
  try {
    const db = readDb()
    const item = db.notifications.find((n) => n.id === id)
    if (!item) return
    item.status = status
    item.attempts += 1
    item.error = error
    if (status === 'SENT' || status === 'SKIPPED') item.sentAt = nowIso()
    writeDb(db)
  } catch { /* bildirishnoma xatoligi asosiy oqimga ta'sir qilmasin */ }
}

export function notificationStats() {
  const items = readDb().notifications
  return {
    total: items.length,
    sent: items.filter((n) => n.status === 'SENT').length,
    failed: items.filter((n) => n.status === 'FAILED').length,
    pending: items.filter((n) => n.status === 'PENDING').length,
  }
}
