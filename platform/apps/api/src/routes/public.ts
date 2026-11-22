import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { storage } from '../storage.js'
import { pagination, paginated, serializeCategory, serializeProduct, serializeReview, serializeFaq, serializePaymentMethod } from '../utils.js'

export const publicRouter = Router()

const DEFAULT_SETTINGS = {
  siteName: 'MaxSeller',
  slogan: 'Raqamli mahsulotlar bir joyda!',
  telegramChannel: 'maxseller_uz',
  instagram: 'maxseller_uz',
  email: 'info@maxseller.uz',
  phone: '+998 90 000 00 00',
  aboutText: 'MaxSeller — tayyor raqamli loyihalar, dizayn shablonlari, o\'quv va ilmiy materiallar do\'koni.',
  footerText: 'Sifat, qulaylik, zamonaviylik.',
  currency: 'so\'m',
}

export async function getPublicSettings() {
  const row = await prisma.storeSetting.findUnique({ where: { key: 'site' } })
  if (!row) return DEFAULT_SETTINGS
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

publicRouter.get('/health', (_req, res) => res.json({ ok: true }))

publicRouter.get('/settings/public', async (_req, res) => {
  res.json(await getPublicSettings())
})

publicRouter.get('/categories', async (_req, res) => {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
  })
  res.json(rows.map(serializeCategory))
})

const listInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  _count: { select: { reviews: { where: { isApproved: true } } } },
}

const detailInclude = {
  ...listInclude,
  files: { orderBy: { createdAt: 'asc' as const } },
}

async function productList(req: any, res: any, extra: Prisma.ProductWhereInput = {}) {
  const { page, limit, skip } = pagination(req.query)
  const q = String(req.query.q || '').trim()
  const category = String(req.query.category || '').trim()
  const sort = String(req.query.sort || 'new')

  const where: Prisma.ProductWhereInput = {
    status: 'PUBLISHED',
    ...extra,
    ...(category ? { category: { slug: category } } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'price_asc' ? { price: 'asc' }
      : sort === 'price_desc' ? { price: 'desc' }
        : sort === 'popular' ? { sales: 'desc' }
          : { createdAt: 'desc' }

  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, include: listInclude, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ])
  res.json(paginated(rows.map(serializeProduct), total, page, limit))
}

publicRouter.get('/products', (req, res) => void productList(req, res))

publicRouter.get('/products/featured', async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED', featured: true },
    include: listInclude, orderBy: { createdAt: 'desc' }, take: 8,
  })
  res.json(rows.map(serializeProduct))
})

publicRouter.get('/products/popular', async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED' }, include: listInclude, orderBy: { sales: 'desc' }, take: 8,
  })
  res.json(rows.map(serializeProduct))
})

publicRouter.get('/products/new', async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED' }, include: listInclude, orderBy: { createdAt: 'desc' }, take: 8,
  })
  res.json(rows.map(serializeProduct))
})

publicRouter.get('/products/best-sellers', async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED', bestSeller: true }, include: listInclude, orderBy: { sales: 'desc' }, take: 8,
  })
  res.json(rows.map(serializeProduct))
})

publicRouter.get('/products/:slug', async (req, res) => {
  const row = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: detailInclude,
  })
  if (!row || row.status !== 'PUBLISHED') return res.status(404).json({ error: 'Mahsulot topilmadi' })

  void prisma.product.update({ where: { id: row.id }, data: { views: { increment: 1 } } }).catch(() => undefined)

  const reviews = await prisma.review.findMany({
    where: { productId: row.id, isApproved: true }, orderBy: { createdAt: 'desc' }, take: 20,
  })
  const rating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const product = serializeProduct(row)
  res.json({ ...product, rating, reviewsCount: reviews.length })
})

publicRouter.get('/reviews', async (req, res) => {
  const productId = String(req.query.productId || '')
  const rows = await prisma.review.findMany({
    where: { isApproved: true, ...(productId ? { productId } : {}) },
    orderBy: { createdAt: 'desc' }, take: 50,
  })
  res.json(rows.map(serializeReview))
})

publicRouter.get('/faq', async (_req, res) => {
  const rows = await prisma.faq.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
  res.json(rows.map(serializeFaq))
})

publicRouter.get('/payment-methods', async (_req, res) => {
  const rows = await prisma.paymentMethod.findMany({
    where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  res.json(rows.map(serializePaymentMethod))
})

publicRouter.get('/media/:id', async (req, res) => {
  const image = await prisma.productImage.findUnique({ where: { id: req.params.id } })
  if (!image || !image.storagePath) return res.status(404).end()
  if (image.productId) {
    const product = await prisma.product.findUnique({ where: { id: image.productId }, select: { status: true } })
    if (!product || product.status !== 'PUBLISHED') return res.status(404).end()
  }
  res.setHeader('Content-Type', image.mimeType || 'image/jpeg')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  storage.readStream(image.storagePath).on('error', () => res.end()).pipe(res)
})
