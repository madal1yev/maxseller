import { Router } from 'express'
import { createOrderSchema, reviewSchema, allowedReceiptMimes, allowedReceiptExt } from '@maxseller/validation'
import { prisma } from '../prisma.js'
import { storage } from '../storage.js'
import { config } from '../config.js'
import { requireUser } from '../auth.js'
import { uploadSingle } from '../middleware/upload.js'
import { dispatchNotification } from '../notifications.js'
import { emitEvent } from '../events.js'
import {
  pagination, paginated, serializeOrder, serializeProduct, serializeDownload,
  serializeReview, randomOrderNumber, orderInclude,
} from '../utils.js'

export const ordersRouter = Router()
// mijoz yo'llari alohida requireUser bilan himoyalangan

const receiptUpload = uploadSingle('receipt', {
  maxBytes: config.maxReceiptBytes,
  mimes: allowedReceiptMimes,
  extensions: allowedReceiptExt,
})

ordersRouter.post('/orders', requireUser, async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Buyurtma ma\'lumotlari noto\'g\'ri', details: parsed.error.flatten() })

  const ids = parsed.data.items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'PUBLISHED' },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  })
  if (products.length !== ids.length) {
    return res.status(400).json({ error: 'Ba\'zi mahsulotlar mavjud emas yoki nashr qilinmagan' })
  }

  const subtotal = products.reduce((sum, product) => {
    const qty = parsed.data.items.find((i) => i.productId === product.id)?.quantity ?? 1
    return sum + product.price * qty
  }, 0)

  let discount = 0
  let couponId: string | null = null
  if (parsed.data.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: parsed.data.couponCode.toUpperCase() } })
    if (!coupon || !coupon.isActive) return res.status(400).json({ error: 'Kupon kodi noto\'g\'ri' })
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ error: 'Kupon muddati tugagan' })
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Kupon ishlatilgan' })
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: `Kupon uchun minimal summa ${coupon.minOrder}` })
    discount = coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value
    discount = Math.min(discount, subtotal)
    couponId = coupon.id
  }

  const total = Math.max(0, subtotal - discount)
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: randomOrderNumber(),
        userId: req.auth!.sub,
        subtotal,
        discount,
        total,
        couponId,
        customerNote: parsed.data.customerNote || null,
        items: {
          create: products.map((product) => {
            const quantity = parsed.data.items.find((i) => i.productId === product.id)?.quantity ?? 1
            return {
              productId: product.id,
              productTitle: product.title,
              productSlug: product.slug,
              productImage: product.images[0]?.url || null,
              unitPrice: product.price,
              quantity,
              totalPrice: product.price * quantity,
            }
          }),
        },
        payment: {
          create: {
            amount: total,
            currency: 'so\'m',
            status: 'PENDING',
          },
        },
      },
      include: orderInclude,
    })

    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } })
      await tx.couponUsage.create({
        data: { couponId, userId: req.auth!.sub, orderId: created.id },
      })
    }
    return created
  })

  emitEvent('orders', { orderId: order.id })
  res.status(201).json(serializeOrder(order))
})

ordersRouter.get('/orders/my', requireUser, async (req, res) => {
  const rows = await prisma.order.findMany({
    where: { userId: req.auth!.sub },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map((o) => serializeOrder(o)))
})

ordersRouter.get('/orders/my/:id', requireUser, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.auth!.sub },
    include: orderInclude,
  })
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  res.json(serializeOrder(order))
})

ordersRouter.post('/orders/:id/receipt', requireUser, receiptUpload, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Chek fayli yuborilmadi' })

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.auth!.sub },
    include: orderInclude,
  })
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  // REJECTED ham qayta yuborishga ruxsat: mijoz tuzatilgan chekni yuborishi mumkin
  if (!['PENDING_PAYMENT', 'RECEIPT_SUBMITTED', 'PAYMENT_REVIEW', 'REJECTED'].includes(order.status)) {
    return res.status(400).json({ error: 'Bu buyurtmaga chek yuborib bo\'lmaydi' })
  }

  const stored = await storage.put({
    buffer: req.file.buffer,
    folder: 'receipts',
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  })

  const receipt = await prisma.$transaction(async (tx) => {
    await tx.paymentReceipt.updateMany({
      where: { orderId: order.id, isLatest: true },
      data: { isLatest: false },
    })
    const created = await tx.paymentReceipt.create({
      data: {
        orderId: order.id,
        fileName: req.file!.originalname,
        mimeType: req.file!.mimetype,
        size: req.file!.size,
        storagePath: stored.key,
        uploadedById: req.auth!.sub,
        isLatest: true,
      },
    })
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_REVIEW', paymentStatus: 'PENDING_REVIEW' },
    })
    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: 'PENDING_REVIEW' },
    })
    return created
  })

  const amount = new Intl.NumberFormat('uz-UZ').format(Number(order.total))
  await dispatchNotification({
    to: config.sms.adminPhone,
    title: 'Yangi to\'lov tekshiruvi',
    body: `MaxSeller: Yangi to'lov tekshiruvi. Buyurtma: #${order.orderNumber}. Summa: ${amount} UZS. Admin panelda tekshiring.`,
    dedupeKey: `receipt:${receipt.id}`,
    orderId: order.id,
  })

  emitEvent('orders', { orderId: order.id, status: 'PAYMENT_REVIEW' })
  const updated = await prisma.order.findUnique({ where: { id: order.id }, include: orderInclude })
  res.json(serializeOrder(updated))
})

ordersRouter.post('/orders/:id/cancel', requireUser, async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, userId: req.auth!.sub } })
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  if (!['PENDING_PAYMENT', 'RECEIPT_SUBMITTED'].includes(order.status)) {
    return res.status(400).json({ error: 'Bu buyurtma bekor qilinmaydi' })
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED' },
    include: orderInclude,
  })
  emitEvent('orders', { orderId: order.id, status: 'CANCELLED' })
  res.json(serializeOrder(updated))
})

ordersRouter.get('/downloads', requireUser, async (req, res) => {
  const rows = await prisma.download.findMany({
    where: { userId: req.auth!.sub },
    include: { product: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map(serializeDownload))
})

ordersRouter.get('/downloads/:id/file', requireUser, async (req, res) => {
  const download = await prisma.download.findUnique({
    where: { id: req.params.id },
    include: { order: { include: { payment: true, items: true } } },
  })

  // Barcha tekshiruvlar server tomonda: egalik, buyurtma holati, to'lov, mahsulot tegishliligi
  if (!download || download.userId !== req.auth!.sub) {
    return res.status(404).json({ error: 'Fayl topilmadi' })
  }
  if (!['PAID', 'COMPLETED'].includes(download.order.status) || download.order.payment?.status !== 'PAID') {
    return res.status(403).json({ error: 'To\'lov tasdiqlanmagan. Fayl mavjud emas' })
  }
  if (!download.order.items.some((item) => item.productId === download.productId)) {
    return res.status(403).json({ error: 'Mahsulot buyurtmaga tegishli emas' })
  }

  const file = await prisma.productFile.findUnique({ where: { id: download.fileId } })
  if (!file) return res.status(404).json({ error: 'Fayl topilmadi' })

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  storage.readStream(file.storagePath).on('error', () => res.end()).pipe(res)
})

ordersRouter.get('/favorites', requireUser, async (req, res) => {
  const rows = await prisma.favorite.findMany({
    where: { userId: req.auth!.sub },
    include: {
      product: {
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { reviews: { where: { isApproved: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(rows.map((f) => serializeProduct(f.product)))
})

ordersRouter.post('/favorites/:productId', requireUser, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.productId } })
  if (!product || product.status !== 'PUBLISHED') return res.status(404).json({ error: 'Mahsulot topilmadi' })

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: req.auth!.sub, productId: product.id } },
  })
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } })
    return res.json({ favorited: false })
  }
  await prisma.favorite.create({ data: { userId: req.auth!.sub, productId: product.id } })
  res.json({ favorited: true })
})

ordersRouter.post('/reviews', requireUser, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Sharh ma\'lumotlari noto\'g\'ri' })

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  const review = await prisma.review.create({
    data: {
      productId: parsed.data.productId,
      userId: req.auth!.sub,
      userName: user?.name || 'Mijoz',
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      isApproved: false,
    },
  })
  res.status(201).json(serializeReview(review))
})

// Admin tomonidan yaratilgan qo'shimcha endpointlar uchun pagination eksporti (testlarda ishlatiladi)
export const customerPagination = pagination
export const customerPaginated = paginated
