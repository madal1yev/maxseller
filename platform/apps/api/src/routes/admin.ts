import { Router } from 'express'
import type { Request } from 'express'
import {
  createProductSchema, updateProductSchema, createCategorySchema,
  verifyPaymentSchema, settingsSchema, slugify,
} from '@maxseller/validation'
import { prisma } from '../prisma.js'
import { requireAdmin, hashPassword, verifyPassword, signToken } from '../auth.js'
import { config } from '../config.js'
import { emitEvent } from '../events.js'
import { dispatchNotification, notificationStatus } from '../notifications.js'
import { getPublicSettings } from './public.js'
import {
  pagination, paginated, serializeProduct, serializeCategory, serializeOrder,
  serializeUser, serializeAdmin, serializeNotification, orderInclude,
} from '../utils.js'

export const adminAuthRouter = Router()

adminAuthRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  let admin = await prisma.admin.findUnique({ where: { email } })

  // Birinchi ishga tushirishda env'dan admin yaratiladi
  if (!admin && email === config.adminEmail.toLowerCase() && password === config.adminPassword) {
    admin = await prisma.admin.create({
      data: {
        name: config.adminName,
        email: config.adminEmail.toLowerCase(),
        passwordHash: hashPassword(config.adminPassword),
        role: 'SUPER_ADMIN',
        roleRef: { connectOrCreate: { where: { name: 'SUPER_ADMIN' }, create: { name: 'SUPER_ADMIN', description: 'Bosh administrator' } } },
      },
    })
  }

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' })
  }
  if (!admin.isActive) return res.status(403).json({ error: 'Admin hisobi faol emas' })

  const token = signToken({ sub: admin.id, role: admin.role, kind: 'ADMIN' })
  res.cookie('maxseller_admin_token', token, {
    httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
  res.json({ admin: serializeAdmin(admin), token })
})

export const adminRouter = Router()
adminRouter.use(requireAdmin)

adminRouter.get('/me', async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.auth!.sub } })
  if (!admin) return res.status(404).json({ error: 'Admin topilmadi' })
  res.json({ admin: serializeAdmin(admin) })
})

async function logActivity(req: Request, action: string, entity: string, entityId?: string | null, details?: unknown) {
  await prisma.activityLog.create({
    data: {
      adminId: req.auth!.sub,
      adminName: req.auth!.role,
      action,
      entity,
      entityId: entityId || null,
      details: details === undefined ? null : JSON.stringify(details),
      ipAddress: req.ip || null,
    },
  })
}

/* ---------------- DASHBOARD ---------------- */
adminRouter.get('/dashboard', async (_req, res) => {
  const [
    totalProducts, publishedProducts, totalOrders, newOrders, pendingReview,
    completedOrders, totalCustomers, revenueAgg, recentOrders, topGroups, salesRaw,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'PUBLISHED' } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'RECEIPT_SUBMITTED'] } } }),
    prisma.order.count({ where: { status: 'PAYMENT_REVIEW' } }),
    prisma.order.count({ where: { status: { in: ['PAID', 'COMPLETED'] } } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.order.findMany({ include: orderInclude, orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true, total: true },
    }),
  ])

  const productIds = topGroups.map((g) => g.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true } })
  const titleMap = new Map(products.map((p) => [p.id, p.title]))

  const salesMap = new Map<string, { date: string; orders: number; revenue: number }>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    salesMap.set(key, { date: key, orders: 0, revenue: 0 })
  }
  for (const row of salesRaw) {
    const key = row.createdAt.toISOString().slice(0, 10)
    const entry = salesMap.get(key)
    if (entry) {
      entry.orders += 1
      entry.revenue += Number(row.total)
    }
  }

  res.json({
    totalProducts,
    publishedProducts,
    totalOrders,
    newOrders,
    pendingReview,
    completedOrders,
    totalRevenue: Number(revenueAgg._sum.amount || 0),
    totalCustomers,
    recentOrders: recentOrders.map((o) => serializeOrder(o, true)),
    bestSellers: topGroups.map((g) => ({
      productId: g.productId,
      title: titleMap.get(g.productId) || 'Mahsulot',
      units: g._sum.quantity || 0,
      revenue: Number(g._sum.totalPrice || 0),
    })),
    salesChart: [...salesMap.values()],
  })
})

/* ---------------- PRODUCTS ---------------- */
const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  files: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { reviews: true, orderItems: true } },
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base || 'mahsulot'
  let counter = 1
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (!existing || existing.id === excludeId) return slug
    counter += 1
    slug = `${base}-${counter}`
  }
}

adminRouter.get('/products', async (req, res) => {
  const { page, limit, skip } = pagination(req.query)
  const q = String(req.query.q || '').trim()
  const status = String(req.query.status || '')
  const where = {
    ...(status ? { status: status as any } : {}),
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.product.count({ where }),
  ])
  res.json(paginated(rows.map(serializeProduct), total, page, limit))
})

adminRouter.post('/products', async (req, res) => {
  const parsed = createProductSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Mahsulot ma\'lumotlari noto\'g\'ri', details: parsed.error.flatten() })

  const slug = await uniqueSlug(parsed.data.slug || slugify(parsed.data.title))
  const product = await prisma.product.create({
    data: {
      title: parsed.data.title,
      slug,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      price: parsed.data.price,
      oldPrice: parsed.data.oldPrice,
      categoryId: parsed.data.categoryId,
      status: parsed.data.status,
      featured: parsed.data.featured,
      bestSeller: parsed.data.bestSeller,
      features: parsed.data.features,
      requirements: parsed.data.requirements,
      compatibility: parsed.data.compatibility,
      images: { connect: parsed.data.imageIds.map((id) => ({ id })) },
      files: { connect: parsed.data.fileIds.map((id) => ({ id })) },
    },
    include: productInclude,
  })
  await logActivity(req, 'PRODUCT_CREATE', 'Product', product.id, { title: product.title })
  emitEvent('products')
  res.status(201).json(serializeProduct(product))
})

adminRouter.get('/products/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude })
  if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' })
  res.json(serializeProduct(product))
})

adminRouter.patch('/products/:id', async (req, res) => {
  const parsed = updateProductSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Mahsulot ma\'lumotlari noto\'g\'ri', details: parsed.error.flatten() })
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ error: 'Mahsulot topilmadi' })

  const data = parsed.data
  const slug = data.slug ? await uniqueSlug(data.slug, existing.id) : undefined

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(slug ? { slug } : {}),
      ...(data.shortDescription !== undefined ? { shortDescription: data.shortDescription } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.oldPrice !== undefined ? { oldPrice: data.oldPrice } : {}),
      ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.featured !== undefined ? { featured: data.featured } : {}),
      ...(data.bestSeller !== undefined ? { bestSeller: data.bestSeller } : {}),
      ...(data.features !== undefined ? { features: data.features } : {}),
      ...(data.requirements !== undefined ? { requirements: data.requirements } : {}),
      ...(data.compatibility !== undefined ? { compatibility: data.compatibility } : {}),
      ...(data.imageIds !== undefined ? { images: { set: data.imageIds.map((id) => ({ id })) } } : {}),
      ...(data.fileIds !== undefined ? { files: { set: data.fileIds.map((id) => ({ id })) } } : {}),
    },
    include: productInclude,
  })
  await logActivity(req, 'PRODUCT_UPDATE', 'Product', product.id, { title: product.title, status: product.status })
  emitEvent('products')
  res.json(serializeProduct(product))
})

adminRouter.delete('/products/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' })
  // Soft delete: buyurtma tarixi saqlanadi
  await prisma.product.update({ where: { id: product.id }, data: { status: 'ARCHIVED' } })
  await logActivity(req, 'PRODUCT_ARCHIVE', 'Product', product.id, { title: product.title })
  emitEvent('products')
  res.json({ ok: true })
})

/* ---------------- CATEGORIES ---------------- */
adminRouter.get('/categories', asyncHandler(async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  })
  res.json(rows.map(serializeCategory))
}))

adminRouter.post('/categories', async (req, res) => {
  const parsed = createCategorySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Kategoriya ma\'lumotlari noto\'g\'ri' })
  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      nameUz: parsed.data.nameUz || parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      icon: parsed.data.icon || null,
      imageUrl: parsed.data.imageUrl || null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
    include: { _count: { select: { products: true } } },
  })
  await logActivity(req, 'CATEGORY_CREATE', 'Category', category.id, { name: category.name })
  emitEvent('products')
  res.status(201).json(serializeCategory(category))
})

adminRouter.patch('/categories/:id', async (req, res) => {
  const parsed = createCategorySchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Kategoriya ma\'lumotlari noto\'g\'ri' })
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.nameUz !== undefined ? { nameUz: parsed.data.nameUz } : {}),
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon || null } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    include: { _count: { select: { products: true } } },
  })
  await logActivity(req, 'CATEGORY_UPDATE', 'Category', category.id)
  emitEvent('products')
  res.json(serializeCategory(category))
})

adminRouter.delete('/categories/:id', async (req, res) => {
  const count = await prisma.product.count({ where: { categoryId: req.params.id } })
  if (count > 0) return res.status(400).json({ error: 'Bu kategoriyada mahsulot bor. Avval ularni boshqa kategoriyaga o\'tkazing' })
  await prisma.category.delete({ where: { id: req.params.id } })
  await logActivity(req, 'CATEGORY_DELETE', 'Category', req.params.id)
  emitEvent('products')
  res.json({ ok: true })
})

/* ---------------- ORDERS ---------------- */
adminRouter.get('/orders', async (req, res) => {
  const { page, limit, skip } = pagination(req.query)
  const status = String(req.query.status || '')
  const q = String(req.query.q || '').trim()
  const where = {
    ...(status ? { status: status as any } : {}),
    ...(q ? {
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' as const } },
        { user: { email: { contains: q, mode: 'insensitive' as const } } },
        { user: { name: { contains: q, mode: 'insensitive' as const } } },
        { user: { phone: { contains: q, mode: 'insensitive' as const } } },
        { customerNote: { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.order.count({ where }),
  ])
  res.json(paginated(rows.map((o) => serializeOrder(o, true)), total, page, limit))
})

adminRouter.get('/orders/:id', async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude })
  if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' })
  res.json(serializeOrder(order, true))
})

adminRouter.patch('/orders/:id/status', async (req, res) => {
  const allowed = ['PENDING_PAYMENT', 'RECEIPT_SUBMITTED', 'PAYMENT_REVIEW', 'PAID', 'COMPLETED', 'REJECTED', 'CANCELLED', 'REFUNDED']
  const status = String(req.body?.status || '')
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Noto\'g\'ri holat' })

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: status as any },
    include: orderInclude,
  })
  await logActivity(req, 'ORDER_STATUS', 'Order', order.id, { status })
  emitEvent('orders', { orderId: order.id, status })
  res.json(serializeOrder(order, true))
})

adminRouter.patch('/orders/:id/note', async (req, res) => {
  const adminNote = String(req.body?.adminNote || '').slice(0, 1000)
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { adminNote },
    include: orderInclude,
  })
  await logActivity(req, 'ORDER_NOTE', 'Order', order.id)
  res.json(serializeOrder(order, true))
})

adminRouter.get('/orders/:id/receipts', async (req, res) => {
  const receipts = await prisma.paymentReceipt.findMany({
    where: { orderId: req.params.id }, orderBy: { createdAt: 'desc' },
  })
  res.json(receipts.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    size: r.size,
    createdAt: r.createdAt.toISOString(),
    previewUrl: `/api/admin/orders/${r.orderId}/receipt/${r.id}`,
  })))
})

adminRouter.get('/orders/:id/receipt/:receiptId', async (req, res) => {
  const receipt = await prisma.paymentReceipt.findFirst({
    where: { id: req.params.receiptId, orderId: req.params.id },
  })
  if (!receipt) return res.status(404).json({ error: 'Chek topilmadi' })
  res.setHeader('Content-Type', receipt.mimeType)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(receipt.fileName)}`)
  const { storage } = await import('../storage.js')
  storage.readStream(receipt.storagePath).on('error', () => res.end()).pipe(res)
})

/**
 * CRITICAL: faqat bu yerda to'lov tasdiqlanadi.
 * Chek yuklash hech qachon PAID holatiga olib kelmaydi.
 * SELECT ... FOR UPDATE + idempotent tekshiruv duplicate approval oldini oladi.
 */
adminRouter.post('/orders/:id/verify', async (req, res) => {
  const parsed = verifyPaymentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Noto\'g\'ri harakat' })
  const { action, reason } = parsed.data
  if (action === 'REJECT' && !reason) return res.status(400).json({ error: 'Rad etish sababi majburiy' })

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${req.params.id} FOR UPDATE`
    const order = await tx.order.findUnique({
      where: { id: req.params.id },
      include: { payment: true, items: true, user: true },
    })
    if (!order) return { error: 'Buyurtma topilmadi', status: 404 } as const

    const alreadyPaid = order.paymentStatus === 'PAID' || ['PAID', 'COMPLETED'].includes(order.status)
    if (action === 'APPROVE' && alreadyPaid) {
      // Idempotent: ikkinchi tasdiqlash hech narsa o'zgartirmaydi
      return { orderId: order.id, unchanged: true } as const
    }

    if (action === 'APPROVE') {
      const files = await tx.productFile.findMany({
        where: { productId: { in: order.items.map((i) => i.productId) } },
      })
      for (const item of order.items) {
        for (const file of files.filter((f) => f.productId === item.productId)) {
          const exists = await tx.download.findFirst({
            where: { orderId: order.id, fileId: file.id, userId: order.userId },
          })
          if (exists) continue
          await tx.download.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              userId: order.userId,
              fileId: file.id,
              fileName: file.fileName,
              size: file.size,
              ipAddress: null,
            },
          })
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { sales: { increment: item.quantity } },
        })
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', paymentStatus: 'PAID' },
      })
      await tx.payment.update({
        where: { orderId: order.id },
        data: { status: 'PAID', verifiedAt: new Date() },
      })
      await tx.paymentVerification.create({
        data: { orderId: order.id, action: 'APPROVE', adminId: req.auth!.sub, reason: reason || null },
      })
      await tx.transaction.create({
        data: {
          orderId: order.id,
          type: 'PAYMENT_CAPTURE',
          amount: Number(order.total),
          status: 'SUCCESS',
          reference: order.orderNumber,
          details: 'Admin tomonidan mustaqil tasdiqlandi',
        },
      })
      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          title: 'To\'lov tasdiqlandi',
          body: `#${order.orderNumber} buyurtma tasdiqlandi. Faylni "Mening xaridlarim" bo'limidan yuklab oling.`,
          type: 'PAYMENT',
          channel: 'IN_APP',
          dedupeKey: `approval:${order.id}`,
        },
      })
      return { orderId: order.id, action } as const
    }

    if (action === 'REJECT') {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'REJECTED', paymentStatus: 'REJECTED' },
      })
      await tx.payment.update({ where: { orderId: order.id }, data: { status: 'REJECTED' } })
      await tx.paymentVerification.create({
        data: { orderId: order.id, action: 'REJECT', adminId: req.auth!.sub, reason },
      })
      await tx.notification.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          title: 'To\'lov rad etildi',
          body: `#${order.orderNumber} buyurtma rad etildi. Sabab: ${reason}`,
          type: 'PAYMENT',
          channel: 'IN_APP',
          dedupeKey: `rejection:${order.id}:${Date.now()}`,
        },
      })
      return { orderId: order.id, action } as const
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'RECEIPT_SUBMITTED', paymentStatus: 'PENDING' },
    })
    await tx.payment.update({ where: { orderId: order.id }, data: { status: 'PENDING' } })
    await tx.paymentVerification.create({
      data: { orderId: order.id, action: 'REQUEST_RECEIPT', adminId: req.auth!.sub, reason: reason || 'Yangi chek talab qilindi' },
    })
    await tx.notification.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        title: 'Yangi chek talab qilindi',
        body: `#${order.orderNumber} buyurtma uchun yangi to'lov chekini yuboring.`,
        type: 'PAYMENT',
        channel: 'IN_APP',
        dedupeKey: `receipt-request:${order.id}:${Date.now()}`,
      },
    })
    return { orderId: order.id, action } as const
  })

  if ('error' in result) return res.status(result.status ?? 400).json({ error: String(result.error) })

  await logActivity(req, `PAYMENT_${result.action}`, 'Order', result.orderId, { reason })
  emitEvent('orders', { orderId: result.orderId, action: result.action })

  const order = await prisma.order.findUnique({ where: { id: result.orderId }, include: orderInclude })
  res.json(serializeOrder(order, true))
})

/* ---------------- CUSTOMERS ---------------- */
adminRouter.get('/customers', async (req, res) => {
  const { page, limit, skip } = pagination(req.query)
  const q = String(req.query.q || '').trim()
  const where = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ])
  res.json(paginated(rows.map((u) => ({
    ...serializeUser(u),
    orderCount: u._count.orders,
    totalSpent: 0,
  })), total, page, limit))
})

adminRouter.get('/customers/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { orders: { include: orderInclude, orderBy: { createdAt: 'desc' } } },
  })
  if (!user) return res.status(404).json({ error: 'Mijoz topilmadi' })
  res.json({ ...serializeUser(user), orders: user.orders.map((o) => serializeOrder(o, true)) })
})

adminRouter.patch('/customers/:id', async (req, res) => {
  const isActive = Boolean(req.body?.isActive)
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive } })
  await logActivity(req, 'CUSTOMER_ACCESS', 'User', user.id, { isActive })
  res.json(serializeUser(user))
})

adminRouter.get('/settings', async (_req, res) => {
  res.json({ ...(await getPublicSettings()), integrations: notificationStatus() })
})

adminRouter.put('/settings', async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Sozlamalar noto\'g\'ri' })
  const current = await getPublicSettings()
  const next = { ...current, ...parsed.data }
  delete (next as any).integrations
  await prisma.storeSetting.upsert({
    where: { key: 'site' },
    create: { key: 'site', value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  })
  await logActivity(req, 'SETTINGS_UPDATE', 'StoreSetting', 'site')
  emitEvent('settings')
  res.json({ ...next, integrations: notificationStatus() })
})

adminRouter.get('/notifications', async (_req, res) => {
  const rows = await prisma.notification.findMany({
    where: { userId: null }, orderBy: { createdAt: 'desc' }, take: 100,
  })
  res.json(rows.map((n) => ({
    id: n.id, title: n.title, body: n.body, type: n.type,
    isRead: n.isRead, createdAt: n.createdAt.toISOString(),
  })))
})

adminRouter.patch('/notifications/:id/read', async (req, res) => {
  const row = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } })
  res.json(serializeNotification(row))
})

adminRouter.get('/activity', async (req, res) => {
  const { page, limit, skip } = pagination(req.query)
  const [rows, total] = await Promise.all([
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.activityLog.count(),
  ])
  res.json(paginated(rows.map((a) => ({
    id: a.id, adminId: a.adminId, adminName: a.adminName, action: a.action,
    entity: a.entity, entityId: a.entityId, details: a.details,
    createdAt: a.createdAt.toISOString(),
  })), total, page, limit))
})

// asyncHandler imported yordamchisi (pastda e'lon qilingan)
function asyncHandler(fn: (req: any, res: any) => Promise<unknown>) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next)
}

export { logActivity, dispatchNotification }
