export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED'
export type OrderStatus =
  | 'PENDING_PAYMENT' | 'RECEIPT_SUBMITTED' | 'PAYMENT_REVIEW'
  | 'PAID' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PENDING_REVIEW' | 'PAID' | 'FAILED' | 'REFUNDED' | 'REJECTED'
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'
export type VerificationAction = 'APPROVE' | 'REJECT' | 'REQUEST_RECEIPT'
export type CouponType = 'PERCENT' | 'FIXED'

export interface Category {
  id: string
  name: string
  nameUz: string
  slug: string
  description: string
  imageUrl: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  productCount?: number
  createdAt: string
  updatedAt: string
}

export interface ProductImage {
  id: string
  url: string
  alt: string
  sortOrder: number
}

/** Fayl metadata — private storage yo'li hech qachon mijozga chiqmaydi */
export interface ProductFileMeta {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
}

export interface Product {
  id: string
  title: string
  slug: string
  shortDescription: string
  description: string
  price: number
  oldPrice: number
  currency: string
  status: ProductStatus
  featured: boolean
  bestSeller: boolean
  views: number
  sales: number
  categoryId: string
  category?: Category
  images: ProductImage[]
  files: ProductFileMeta[]
  features: string[]
  requirements: string
  compatibility: string
  createdAt: string
  updatedAt: string
  rating?: number
  reviewsCount?: number
}

export interface Review {
  id: string
  productId: string
  userId?: string
  userName: string
  rating: number
  comment: string
  isApproved: boolean
  createdAt: string
}

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: UserRole
  createdAt: string
}

export interface Admin {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface OrderItem {
  id: string
  productId: string
  productTitle: string
  productSlug: string
  productImage: string | null
  unitPrice: number
  quantity: number
  totalPrice: number
}

export interface Receipt {
  id: string
  fileName: string
  mimeType: string
  size: number
  createdAt: string
  previewUrl?: string
}

export interface Verification {
  id: string
  action: VerificationAction
  adminId: string
  adminName: string | null
  reason: string | null
  createdAt: string
}

export interface Payment {
  id: string
  orderId: string
  methodId: string | null
  methodName: string | null
  amount: number
  currency: string
  status: PaymentStatus
  transactionId: string | null
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  user?: User
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  payment?: Payment | null
  receipt?: Receipt | null
  verification?: Verification | null
  customerNote: string | null
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentMethod {
  id: string
  name: string
  code: string
  instructions: string
  recipientDetails: string
  qrUrl: string | null
  linkUrl: string | null
  isActive: boolean
  sortOrder: number
}

export interface Download {
  id: string
  orderId: string
  productId: string
  productTitle: string
  fileName: string
  size: number
  createdAt: string
}

export interface SiteSettings {
  siteName: string
  slogan: string
  telegramChannel: string
  instagram: string
  email: string
  phone: string
  aboutText: string
  footerText: string
  currency: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface DashboardStats {
  totalProducts: number
  publishedProducts: number
  totalOrders: number
  newOrders: number
  pendingReview: number
  completedOrders: number
  totalRevenue: number
  totalCustomers: number
  recentOrders: Order[]
  bestSellers: { productId: string; title: string; units: number; revenue: number }[]
  salesChart: { date: string; orders: number; revenue: number }[]
}

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

export interface ActivityLog {
  id: string
  adminId: string | null
  adminName: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  minOrder: number
  isActive: boolean
  expiresAt: string | null
  usageLimit: number | null
  usedCount: number
}

export interface FAQ {
  id: string
  question: string
  answer: string
  sortOrder: number
}

export interface ApiError {
  error: string
  details?: unknown
}
