import { prisma } from './prisma.js'
import { config } from './config.js'

export interface NotificationMessage {
  to: string
  title: string
  body: string
  dedupeKey: string
  orderId?: string
  userId?: string
}

export interface DeliveryResult {
  channel: string
  ok: boolean
  error?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class SmsProvider {
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    if (config.sms.provider === 'none' || !config.sms.apiUrl || !config.sms.adminPhone) {
      return { channel: 'SMS', ok: false, error: 'SMS provayderi sozlanmagan' }
    }

    let lastError = ''
    for (let attempt = 1; attempt <= config.sms.retries; attempt++) {
      try {
        const response = await fetch(config.sms.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.sms.apiKey}`,
          },
          body: JSON.stringify({
            to: message.to || config.sms.adminPhone,
            from: config.sms.from || 'MaxSeller',
            text: `${message.title}\n${message.body}`,
          }),
        })
        if (response.ok) return { channel: 'SMS', ok: true }
        lastError = `HTTP ${response.status}`
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err)
      }
      if (attempt < config.sms.retries) await sleep(500 * attempt)
    }
    return { channel: 'SMS', ok: false, error: lastError }
  }
}

class TelegramProvider {
  async send(message: NotificationMessage): Promise<DeliveryResult> {
    if (!config.telegram.botToken || !config.telegram.adminChatId) {
      return { channel: 'TELEGRAM', ok: false, error: 'Telegram bot sozlanmagan' }
    }
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.telegram.adminChatId,
          text: `*${message.title}*\n${message.body}`,
          parse_mode: 'Markdown',
        }),
      })
      return response.ok
        ? { channel: 'TELEGRAM', ok: true }
        : { channel: 'TELEGRAM', ok: false, error: `HTTP ${response.status}` }
    } catch (err) {
      return { channel: 'TELEGRAM', ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }
}

const sms = new SmsProvider()
const telegram = new TelegramProvider()

/** DedupeKey orqali bir hodisa uchun faqat bitta in-app xabar va bitta jo'natish urunishi. */
export async function dispatchNotification(message: NotificationMessage) {
  const existing = await prisma.notification.findUnique({ where: { dedupeKey: message.dedupeKey } })
  if (existing) return { created: false, deliveries: [] as DeliveryResult[] }

  const created = await prisma.notification.create({
    data: {
      title: message.title,
      body: message.body,
      type: 'PAYMENT',
      channel: 'IN_APP',
      orderId: message.orderId,
      userId: message.userId,
      dedupeKey: message.dedupeKey,
    },
  })

  const deliveries: DeliveryResult[] = []
  if (!message.userId) {
    deliveries.push(await sms.send(message))
    deliveries.push(await telegram.send(message))

    await prisma.activityLog.create({
      data: {
        action: 'NOTIFICATION_DISPATCH',
        entity: 'Notification',
        entityId: created.id,
        details: JSON.stringify(deliveries),
      },
    })
  }

  return { created: true, deliveries }
}

export function notificationStatus() {
  return {
    smsConfigured: config.sms.provider !== 'none' && Boolean(config.sms.apiUrl && config.sms.adminPhone),
    smsProvider: config.sms.provider,
    telegramConfigured: Boolean(config.telegram.botToken && config.telegram.adminChatId),
    clickConfigured: Boolean(config.payment.clickMerchantId && config.payment.clickSecretKey),
    paymeConfigured: Boolean(config.payment.paymeMerchantId && config.payment.paymeSecretKey),
    storageDriver: config.storageDriver,
  }
}
