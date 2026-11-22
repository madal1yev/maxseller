import type {
  Category, Product, ProductImage, ProductFileMeta, Order, OrderItem,
  Payment, Receipt, Verification, User, Admin, Review, FAQ, Coupon,
  PaymentMethod, Notification, ActivityLog, Download,
} from '@maxseller/shared'

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

export function pagination(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 12))
  return { page, limit, skip: (page - 1) * limit }
}

export function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
}

export function serializeCategory(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    nameUz: c.nameUz,
    slug: c.slug,
    description: c.description || '',
    imageUrl: c.imageUrl || null,
    icon: c.icon || null,
    sortOrder: c.sortOrder ?? 0,
    isActive: Boolean(c.isActive),
    productCount: c._count?.products,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  }
}

export function serializeProduct(p: any): Product {
  const images: ProductImage[] = (p.images || [])
    .slice()
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i: any) => ({
      id: i.id,
      url: i.url || `/api/media/${i.id}`,
      alt: i.alt || '',
      sortOrder: i.sortOrder ?? 0,
    }))

  const files: ProductFileMeta[] = (p.files || []).map((f: any) => ({
    id: f.id,
    fileName: f.fileName,
    mimeType: f.mimeType,
    size: f.size,
    createdAt: iso(f.createdAt),
  }))

  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription || '',
    description: p.description || '',
    price: Number(p.price),
    oldPrice: Number(p.oldPrice || 0),
    currency: p.currency || 'so\'m',
    status: p.status,
    featured: Boolean(p.featured),
    bestSeller: Boolean(p.bestSeller),
    views: Number(p.views || 0),
    sales: Number(p.sales || 0),
    categoryId: p.categoryId,
    category: p.category ? serializeCategory(p.category) : undefined,
    images,
    files,
    features: Array.isArray(p.features) ? p.features : [],
    requirements: p.requirements || '',
    compatibility: p.compatibility || '',
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
    rating: p.rating !== undefined ? Number(p.rating) : undefined,
    reviewsCount: p._count?.reviews,
  }
}

export function serializeUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    avatarUrl: u.avatarUrl || null,
    role: u.role,
    createdAt: iso(u.createdAt),
  }
}

export function serializeAdmin(a: any): Admin {
  return { id: a.id, name: a.name, email: a.email, role: a.role, createdAt: iso(a.createdAt) }
}

export function serializeOrder(o: any, forAdmin = false): Order {
  const items: OrderItem[] = (o.items || []).map((i: any) => ({
    id: i.id,
    productId: i.productId,
    productTitle: i.productTitle,
    productSlug: i.productSlug,
    productImage: i.productImage || null,
    unitPrice: Number(i.unitPrice),
    quantity: Number(i.quantity),
    totalPrice: Number(i.totalPrice),
  }))

  const payment: Payment | null = o.payment ? {
    id: o.payment.id,
    orderId: o.payment.orderId,
    methodId: o.payment.methodId || null,
    methodName: o.payment.methodName || null,
    amount: Number(o.payment.amount),
    currency: o.payment.currency,
    status: o.payment.status,
    transactionId: o.payment.transactionId || null,
    createdAt: iso(o.payment.createdAt),
    updatedAt: iso(o.payment.updatedAt),
  } : null

  const receipts: Receipt[] = (o.receipts || []).map((r: any) => ({
    id: r.id,
    fileName: r.fileName,
    mimeType: r.mimeType,
    size: Number(r.size),
    createdAt: iso(r.createdAt),
    ...(forAdmin ? { previewUrl: `/api/admin/orders/${o.id}/receipt/${r.id}` } : {}),
  }))

  const lastVerification = (o.verifications || [])[0]

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    user: o.user ? serializeUser(o.user) : undefined,
    items,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount || 0),
    total: Number(o.total),
    status: o.status,
    paymentStatus: o.paymentStatus,
    payment,
    receipt: receipts[0] || null,
    verification: lastVerification ? {
      id: lastVerification.id,
      action: lastVerification.action,
      adminId: lastVerification.adminId,
      adminName: lastVerification.admin?.name || null,
      reason: lastVerification.reason || null,
      createdAt: iso(lastVerification.createdAt),
    } as Verification : null,
    customerNote: o.customerNote || null,
    adminNote: o.adminNote || null,
    createdAt: iso(o.createdAt),
    updatedAt: iso(o.updatedAt),
  }
}

export function serializeReview(r: any): Review {
  return {
    id: r.id,
    productId: r.productId,
    userId: r.userId || undefined,
    userName: r.userName,
    rating: Number(r.rating),
    comment: r.comment,
    isApproved: Boolean(r.isApproved),
    createdAt: iso(r.createdAt),
  }
}

export function serializeFaq(f: any): FAQ {
  return { id: f.id, question: f.question, answer: f.answer, sortOrder: f.sortOrder ?? 0 }
}

export function serializeCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value),
    minOrder: Number(c.minOrder || 0),
    isActive: Boolean(c.isActive),
    expiresAt: c.expiresAt ? iso(c.expiresAt) : null,
    usageLimit: c.usageLimit ?? null,
    usedCount: Number(c.usedCount || 0),
  }
}

export function serializePaymentMethod(m: any): PaymentMethod {
  return {
    id: m.id,
    name: m.name,
    code: m.code,
    instructions: m.instructions,
    recipientDetails: m.recipientDetails,
    qrUrl: m.qrUrl || null,
    linkUrl: m.linkUrl || null,
    isActive: Boolean(m.isActive),
    sortOrder: m.sortOrder ?? 0,
  }
}

export function serializeNotification(n: any): Notification {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    isRead: Boolean(n.isRead),
    createdAt: iso(n.createdAt),
  }
}

export function serializeActivity(a: any): ActivityLog {
  return {
    id: a.id,
    adminId: a.adminId || null,
    adminName: a.adminName || a.admin?.name || null,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId || null,
    details: a.details || null,
    createdAt: iso(a.createdAt),
  }
}

export function serializeDownload(d: any): Download {
  return {
    id: d.id,
    orderId: d.orderId,
    productId: d.productId,
    productTitle: d.product?.title || d.fileName,
    fileName: d.fileName,
    size: Number(d.size),
    createdAt: iso(d.createdAt),
  }
}

export function randomOrderNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `MS-${year}${Date.now().toString().slice(-5)}${random}`
}

export const orderInclude = {
  user: true,
  items: true,
  payment: true,
  receipts: { orderBy: { createdAt: 'desc' as const } },
  verifications: { orderBy: { createdAt: 'desc' as const }, include: { admin: true } },
}
