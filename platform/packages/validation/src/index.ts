import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 belgi').max(80),
  email: z.string().trim().toLowerCase().email('To\'g\'ri email kiriting'),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8, 'Parol kamida 8 belgi').max(128),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const adminLoginSchema = loginSchema

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
})

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  nameUz: z.string().trim().min(2).max(80).optional(),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Faqat kichik harf, raqam va chiziqcha'),
  description: z.string().trim().max(1000).optional().default(''),
  icon: z.string().trim().max(60).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
})

export const createProductSchema = z.object({
  title: z.string().trim().min(3, 'Nomi kamida 3 belgi').max(160),
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+$/, 'Faqat kichik harf, raqam va chiziqcha').optional(),
  shortDescription: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(20000).optional().default(''),
  price: z.number().nonnegative('Narx manfiy bo\'lmasligi kerak'),
  oldPrice: z.number().nonnegative().optional().default(0),
  categoryId: z.string().min(1, 'Kategoriya tanlang'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']).optional().default('DRAFT'),
  featured: z.boolean().optional().default(false),
  bestSeller: z.boolean().optional().default(false),
  features: z.array(z.string().trim().min(1)).max(30).optional().default([]),
  requirements: z.string().trim().max(2000).optional().default(''),
  compatibility: z.string().trim().max(2000).optional().default(''),
  imageIds: z.array(z.string()).max(20).optional().default([]),
  fileIds: z.array(z.string()).max(20).optional().default([]),
})

export const updateProductSchema = createProductSchema.partial()

export const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive().max(10).default(1),
  })).min(1, 'Kamida bitta mahsulot tanlang').max(30),
  couponCode: z.string().trim().max(40).optional().or(z.literal('')),
  customerNote: z.string().trim().max(1000).optional().default(''),
})

export const verifyPaymentSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_RECEIPT']),
  reason: z.string().trim().max(500).optional().default(''),
})

export const createPaymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  instructions: z.string().trim().min(5).max(3000),
  recipientDetails: z.string().trim().min(2).max(2000),
  qrUrl: z.string().trim().max(500).optional().or(z.literal('')),
  linkUrl: z.string().trim().max(500).optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export const settingsSchema = z.object({
  siteName: z.string().trim().min(2).max(80).optional(),
  slogan: z.string().trim().max(200).optional(),
  telegramChannel: z.string().trim().max(100).optional(),
  instagram: z.string().trim().max(100).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(40).optional(),
  aboutText: z.string().trim().max(5000).optional(),
  footerText: z.string().trim().max(1000).optional(),
  currency: z.string().trim().max(10).optional(),
})

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().positive(),
  minOrder: z.number().nonnegative().optional().default(0),
  isActive: z.boolean().optional().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
})

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(2000),
})

export const faqSchema = z.object({
  question: z.string().trim().min(3).max(300),
  answer: z.string().trim().min(3).max(5000),
  sortOrder: z.number().int().min(0).optional().default(0),
})

export const allowedReceiptMimes = ['image/jpeg', 'image/png', 'application/pdf'] as const
export const allowedReceiptExt = ['.jpg', '.jpeg', '.png', '.pdf'] as const
export const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'] as const
export const allowedProductMimes = [
  'application/zip', 'application/x-zip-compressed', 'application/pdf',
  'application/x-7z-compressed', 'application/octet-stream',
] as const

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
}

export const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'To\'lov kutilmoqda',
  RECEIPT_SUBMITTED: 'Chek yuborildi',
  PAYMENT_REVIEW: 'To\'lov tekshirilmoqda',
  PAID: 'To\'lov tasdiqlandi',
  COMPLETED: 'Buyurtma bajarildi',
  REJECTED: 'Rad etildi',
  CANCELLED: 'Bekor qilindi',
  REFUNDED: 'Qaytarildi',
}
