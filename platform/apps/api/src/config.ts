import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'maxseller-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
    .split(',').map((s) => s.trim()).filter(Boolean),
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  storageDir: path.resolve(process.env.STORAGE_DIR || path.resolve(process.cwd(), '../../storage')),
  maxReceiptBytes: num(process.env.MAX_RECEIPT_MB, 5) * 1024 * 1024,
  maxProductFileBytes: num(process.env.MAX_PRODUCT_FILE_MB, 200) * 1024 * 1024,
  maxImageBytes: num(process.env.MAX_IMAGE_MB, 5) * 1024 * 1024,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@maxseller.uz',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!',
  adminName: process.env.ADMIN_NAME || 'MaxSeller Admin',
  sms: {
    provider: process.env.SMS_PROVIDER || 'none',
    apiUrl: process.env.SMS_API_URL || '',
    apiKey: process.env.SMS_API_KEY || '',
    from: process.env.SMS_FROM || '',
    adminPhone: process.env.ADMIN_PHONE || '',
    retries: num(process.env.SMS_RETRY_ATTEMPTS, 3),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  },
  payment: {
    clickMerchantId: process.env.CLICK_MERCHANT_ID || '',
    clickSecretKey: process.env.CLICK_SECRET_KEY || '',
    paymeMerchantId: process.env.PAYME_MERCHANT_ID || '',
    paymeSecretKey: process.env.PAYME_SECRET_KEY || '',
  },
}
