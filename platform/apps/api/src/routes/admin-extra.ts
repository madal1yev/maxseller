import { Router } from 'express'
import crypto from 'node:crypto'
import {
  createPaymentMethodSchema, couponSchema, faqSchema,
  allowedImageMimes, allowedProductMimes,
} from '@maxseller/validation'
import { prisma } from '../prisma.js'
import { requireAdmin } from '../auth.js'
import { config } from '../config.js'
import { storage } from '../storage.js'
import { uploadSingle } from '../middleware/upload.js'
import { emitEvent } from '../events.js'
import { logActivity } from './admin.js'
import {
  pagination, paginated, serializePaymentMethod, serializeCoupon,
  serializeReview, serializeFaq,
} from '../utils.js'

export const adminExtraRouter = Router()
adminExtraRouter.use(requireAdmin)

/* ---------------- UPLOADS (private storage) ---------------- */
const imageUpload = uploadSingle('file', {
  maxBytes: config.maxImageBytes,
  mimes: allowedImageMimes,
  extensions: ['.jpg', '.jpeg', '.png', '.webp'],
})

adminExtraRouter.post('/uploads/image', imageUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Rasm yuborilmadi' })
  const stored = await storage.put({
    buffer: req.file.buffer,
    folder: 'images',
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  })
  const image = await prisma.productImage.create({
    data: {
      url: '',
      alt: req.file.originalname,
      storagePath: stored.key,
      mimeType: req.file.mimetype,
      sortOrder: 0,
    },
  })
  const url = `/api/media/${image.id}`
  await prisma.productImage.update({ where: { id: image.id }, data: { url } })
  res.status(201).json({ id: image.id, url, name: req.file.originalname, size: req.file.size, mime: req.file.mimetype })
})

const productFileUpload = uploadSingle('file', {
  maxBytes: config.maxProductFileBytes,
  mimes: allowedProductMimes,
  extensions: ['.zip', '.rar', '.7z', '.pdf', '.png', '.jpg', '.jpeg', '.mp4'],
})

adminExtraRouter.post('/uploads/product-file', productFileUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fayl yuborilmadi' })
  const stored = await storage.put({
    buffer: req.file.buffer,
    folder: 'products',
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  })
  const file = await prisma.productFile.create({
    data: {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: stored.key,
    },
  })
  await logActivity(req, 'FILE_UPLOAD', 'ProductFile', file.id, { name: file.fileName, size: file.size })
  res.status(201).json({ id: file.id, name: file.fileName, size: file.size, mime: file.mimeType })
})

// Faylni o'chirish (mahsulotga biriktirilmagan vaqtinchalik fayllar uchun)
adminExtraRouter.delete('/uploads/:kind/:id', async (req, res) => {
  const { kind, id } = req.params
  if (!['image', 'file'].includes(kind)) return res.status(400).json({ error: 'Noto\'g\'ri tur' })

  if (kind === 'image') {
    const image = await prisma.productImage.findUnique({ where: { id } })
    if (!image || image.productId) return res.status(400).json({ error: 'Fayl o\'chirilmaydi' })
    if (image.storagePath) await storage.delete(image.storagePath)
    await prisma.productImage.delete({ where: { id } })
  } else {
    const file = await prisma.productFile.findUnique({ where: { id } })
    if (!file || file.productId) return res.status(400).json({ error: 'Fayl o\'chirilmaydi' })
    await storage.delete(file.storagePath)
    await prisma.productFile.delete({ where: { id } })
  }
  res.json({ ok: true })
})

/* ---------------- PAYMENT METHODS ---------------- */
adminExtraRouter.get('/payment-methods', async (_req, res) => {
  const rows = await prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  res.json(rows.map(serializePaymentMethod))
})

adminExtraRouter.post('/payment-methods', async (req, res) => {
  const parsed = createPaymentMethodSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'To\'lov usuli ma\'lumotlari noto\'g\'ri' })
  const existing = await prisma.paymentMethod.findUnique({ where: { code: parsed.data.code } })
  if (existing) return res.status(409).json({ error: 'Bu kod allaqachon mavjud' })
  const row = await prisma.paymentMethod.create({
    data: {
      ...parsed.data,
      qrUrl: parsed.data.qrUrl || null,
      linkUrl: parsed.data.linkUrl || null,
    },
  })
  await logActivity(req, 'PAYMENT_METHOD_CREATE', 'PaymentMethod', row.id, { name: row.name })
  res.status(201).json(serializePaymentMethod(row))
})

adminExtraRouter.patch('/payment-methods/:id', async (req, res) => {
  const parsed = createPaymentMethodSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Ma\'lumotlar noto\'g\'ri' })
  const row = await prisma.paymentMethod.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.instructions !== undefined ? { instructions: parsed.data.instructions } : {}),
      ...(parsed.data.recipientDetails !== undefined ? { recipientDetails: parsed.data.recipientDetails } : {}),
      ...(parsed.data.qrUrl !== undefined ? { qrUrl: parsed.data.qrUrl || null } : {}),
      ...(parsed.data.linkUrl !== undefined ? { linkUrl: parsed.data.linkUrl || null } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
  })
  await logActivity(req, 'PAYMENT_METHOD_UPDATE', 'PaymentMethod', row.id)
  emitEvent('settings')
  res.json(serializePaymentMethod(row))
})

adminExtraRouter.delete('/payment-methods/:id', async (req, res) => {
  await prisma.paymentMethod.delete({ where: { id: req.params.id } })
  await logActivity(req, 'PAYMENT_METHOD_DELETE', 'PaymentMethod', req.params.id)
  res.json({ ok: true })
})

/* ---------------- COUPONS ---------------- */
adminExtraRouter.get('/coupons', async (_req, res) => {
  const rows = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(rows.map(serializeCoupon))
})

adminExtraRouter.post('/coupons', async (req, res) => {
  const parsed = couponSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Kupon ma\'lumotlari noto\'g\'ri' })
  const code = parsed.data.code.toUpperCase()
  const existing = await prisma.coupon.findUnique({ where: { code } })
  if (existing) return res.status(409).json({ error: 'Bu kupon mavjud' })
  const row = await prisma.coupon.create({
    data: {
      ...parsed.data,
      code,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  })
  await logActivity(req, 'COUPON_CREATE', 'Coupon', row.id, { code })
  res.status(201).json(serializeCoupon(row))
})

adminExtraRouter.patch('/coupons/:id', async (req, res) => {
  const parsed = couponSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Kupon ma\'lumotlari noto\'g\'ri' })
  const row = await prisma.coupon.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.code !== undefined ? { code: parsed.data.code.toUpperCase() } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.value !== undefined ? { value: parsed.data.value } : {}),
      ...(parsed.data.minOrder !== undefined ? { minOrder: parsed.data.minOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.expiresAt !== undefined ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null } : {}),
      ...(parsed.data.usageLimit !== undefined ? { usageLimit: parsed.data.usageLimit } : {}),
    },
  })
  res.json(serializeCoupon(row))
})

adminExtraRouter.delete('/coupons/:id', async (req, res) => {
  await prisma.coupon.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

/* ---------------- REVIEWS ---------------- */
adminExtraRouter.get('/reviews', async (req, res) => {
  const approved = String(req.query.approved || '')
  const rows = await prisma.review.findMany({
    where: approved === 'true' ? { isApproved: true } : approved === 'false' ? { isApproved: false } : {},
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(rows.map((r) => ({ ...serializeReview(r), productTitle: r.product.title })))
})

adminExtraRouter.patch('/reviews/:id/moderate', async (req, res) => {
  const isApproved = Boolean(req.body?.isApproved)
  const row = await prisma.review.update({ where: { id: req.params.id }, data: { isApproved } })
  await logActivity(req, 'REVIEW_MODERATE', 'Review', row.id, { isApproved })
  emitEvent('products')
  res.json(serializeReview(row))
})

/* ---------------- FAQ ---------------- */
adminExtraRouter.get('/faq', async (_req, res) => {
  const rows = await prisma.faq.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  res.json(rows.map(serializeFaq))
})

adminExtraRouter.post('/faq', async (req, res) => {
  const parsed = faqSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'FAQ ma\'lumotlari noto\'g\'ri' })
  const row = await prisma.faq.create({ data: parsed.data })
  res.status(201).json(serializeFaq(row))
})

adminExtraRouter.patch('/faq/:id', async (req, res) => {
  const parsed = faqSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'FAQ ma\'lumotlari noto\'g\'ri' })
  const row = await prisma.faq.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(serializeFaq(row))
})

adminExtraRouter.delete('/faq/:id', async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Tasodifiy ID generator (kelajakda import qilinadigan fayllar uchun)
export const generateId = () => crypto.randomUUID()

// pagination helperlari test va boshqa route'larda qayta ishlatiladi
export { pagination, paginated }
