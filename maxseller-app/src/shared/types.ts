export type CategoryId = 'web' | 'design' | 'docs' | 'video'

export interface Product {
  id: string
  title: string
  cat: CategoryId
  desc: string
  price: number
  oldPrice: number
  tag: string
  image: string
  filePath?: string
  fileName?: string
  active: boolean
  orders: number
  createdAt: string
  updatedAt: string
}

export interface Settings {
  telegramChannel: string
  instagram: string
  currency: string
  heroAccent: string
  heroLead: string
  catalogText: string
  finalTitle: string
  finalText: string
  supportEmail?: string
  supportPhone?: string
}

export interface Bootstrap {
  products: Product[]
  settings: Settings
  paymentMethods: PaymentMethod[]
}

export interface AdminData {
  products: Product[]
  settings: Settings
  stats: Stats
  telegram: TelegramStatus
}

export type AccountStatus = 'active' | 'suspended' | 'blocked'

export interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'customer' | 'admin'
  telegramId?: number | null
  telegramUsername?: string
  telegramNotifications?: boolean
  customerNumber?: string
  emailVerified?: boolean
  phoneVerified?: boolean
  lastLoginAt?: string | null
  accountStatus?: AccountStatus
  createdAt: string
}

export interface OrderItem {
  productId: string
  title: string
  image: string
  price: number
  quantity: number
}

export type OrderStatus =
  | 'NEW' | 'PENDING_CONFIRMATION' | 'AWAITING_PAYMENT' | 'PAYMENT_PROCESSING' | 'PAID'
  | 'IN_PROGRESS' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

export type PaymentStatus = 'UNPAID' | 'REVIEW' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface Order {
  id: string
  orderNumber: string
  userId: string | null
  type: 'instant' | 'custom'
  items: OrderItem[]
  customer: { name: string; phone: string; telegramUsername?: string; notes?: string }
  requirements?: string
  projectType?: string
  budget?: number
  total: number
  discount: number
  deadline?: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
  rejectReason?: string
  files?: { id: string; fileName: string; at: string }[]
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  orderId: string
  orderNumber?: string
  method: string
  amount: number
  status: PaymentStatus
  transactionId?: string
  note?: string
  hasReceipt?: boolean
  createdAt: string
  verifiedAt?: string | null
  verifiedBy?: string | null
}

export interface Receipt {
  id: string
  orderId: string
  number: string
  total: number
  createdAt: string
  isFiscal: boolean
}

export interface StatusHistory {
  id: string
  orderId: string
  from: OrderStatus | null
  to: OrderStatus
  reason?: string
  actor: string
  at: string
}

export interface PaymentMethod {
  id: string
  name: string
  available: boolean
  instructions: string
}

export interface Stats {
  total: number
  today: number
  new: number
  inProgress: number
  completed: number
  cancelled: number
  unpaid: number
  revenue: number
  customers: number
  products: number
  paymentsPending: number
  topProducts: { title: string; count: number }[]
}

export interface TelegramStatus {
  adminBotConfigured: boolean
  customerBotConfigured: boolean
  adminChatConnected: boolean
  adminChatId: string
  adminUsername: string
  mode: string
}

/* ---------- Cart / OTP auth ---------- */

export interface CartLine {
  productId: string
  quantity: number
}

export type OtpChannel = 'email'
export type OtpPurpose = 'auth' | 'verify_contact'

export interface AuthProviderStatus {
  configured: boolean
  provider: string
}

export interface AuthProviders {
  sms: AuthProviderStatus
  email: AuthProviderStatus
}

export interface OtpRequestBody {
  channel: OtpChannel
  phone?: string
  email?: string
  name?: string
  cart?: CartLine[]
  guestToken?: string
  purpose?: OtpPurpose
}

export interface OtpVerifyBody {
  requestId: string
  code: string
  name?: string
  cart?: CartLine[]
  guestToken?: string
  purpose?: OtpPurpose
}

export interface OtpRequestResult {
  requestId: string
  expiresInSeconds: number
  resendAfterSeconds: number
  destinationMasked: string
  provider: string
}

/** Auth verify returns a session; contact verification returns { ok, user } instead. */
export interface OtpVerifyResult {
  token?: string
  user: User
  cart?: CartLine[]
  ok?: boolean
}

/* ---------- Customer cabinet ---------- */

export interface Purchase {
  id: string
  orderId?: string
  orderNumber?: string
  productId?: string
  title?: string
  productTitle?: string
  image?: string
  fileName?: string
  filePath?: string
  price?: number
  total?: number
  quantity?: number
  status?: string
  licenseKey?: string
  downloadCount?: number
  purchasedAt?: string
  createdAt?: string
}

export interface Delivery {
  id: string
  orderId?: string
  orderNumber?: string
  productId?: string
  title?: string
  productTitle?: string
  status?: string
  url?: string
  fileName?: string
  deliveredAt?: string
  createdAt?: string
}

export interface CustomerSummaryData {
  customer: User
  purchases: Purchase[]
  receipts: Receipt[]
  deliveries: Delivery[]
  transactions: Payment[]
  activity: ActivityItem[]
  orders?: Order[]
}

export interface CustomerSummaryUpdate {
  name?: string
  phone?: string
  email?: string
}

export interface CustomerSummary extends User {
  orderCount: number
  totalSpent: number
  lastOrder?: Order | null
  lastOrderAt?: string | null
}

export interface CustomerDetail {
  customer: User
  orders: Order[]
  payments: Payment[]
  purchases?: Purchase[]
  receipts?: Receipt[]
  activity?: ActivityItem[]
  deliveries?: Delivery[]
}

export interface NotificationItem {
  id: string
  event: string
  status: string
  title: string
  body?: string
  orderId?: string
  attempts?: number
  createdAt: string
  sentAt?: string | null
  error?: string
}

export interface ActivityItem {
  id: string
  actor: string
  action: string
  entity?: string
  at: string
  meta?: Record<string, unknown>
}

export interface OrderDetail {
  order: Order
  customer?: User | Order['customer']
  history: StatusHistory[]
  payments: Payment[]
  receipts: Receipt[]
  allowedStatuses?: OrderStatus[]
  deliveries?: unknown[]
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Yangi',
  PENDING_CONFIRMATION: 'Tasdiq kutilmoqda',
  AWAITING_PAYMENT: 'To\'lov kutilmoqda',
  PAYMENT_PROCESSING: 'To\'lov tekshirilmoqda',
  PAID: 'To\'langan',
  IN_PROGRESS: 'Ish jarayonida',
  READY_FOR_DELIVERY: 'Topshirishga tayyor',
  DELIVERED: 'Topshirildi',
  COMPLETED: 'Bajarildi',
  CANCELLED: 'Bekor qilindi',
  REFUNDED: 'Pullar qaytarildi',
}

export const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: 'To\'lanmagan',
  REVIEW: 'Tekshiruvda',
  PAID: 'To\'langan',
  FAILED: 'Rad etilgan',
  REFUNDED: 'Qaytarilgan',
}

export const CATEGORIES: { id: CategoryId; name: string; short: string }[] = [
  { id: 'web', name: 'Veb-saytlar va Landing Page', short: 'Veb-saytlar' },
  { id: 'design', name: 'Dizayn shablonlar', short: 'Dizayn' },
  { id: 'docs', name: 'Ilmiy ishlar va materiallar', short: 'Ilmiy ishlar' },
  { id: 'video', name: 'Video darsliklar', short: 'Video darslar' },
]

export const CAT_NAME: Record<CategoryId, string> = {
  web: 'Veb-saytlar va Landing Page',
  design: 'Dizayn shablonlar',
  docs: 'Ilmiy ishlar va materiallar',
  video: 'Video darsliklar',
}

export const CAT_SHORT: Record<CategoryId, string> = {
  web: 'Veb-saytlar',
  design: 'Dizayn',
  docs: 'Ilmiy ishlar',
  video: 'Video',
}

export const ICONS: Record<CategoryId, string> = {
  web: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  design: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.5-1.3.2-2.3 1.6-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>',
  docs: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg>',
  video: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>',
}
