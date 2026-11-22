import type {
  AccountStatus, AuthProviders, CartLine, CustomerSummaryData, OtpRequestResult,
  OtpRequestBody, OtpVerifyBody, OtpVerifyResult,
} from './types'

const ADMIN_KEY = 'maxseller_admin_token'
const USER_KEY = 'maxseller_customer_token'

export function getToken(): string | null {
  return localStorage.getItem(ADMIN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_KEY, token)
  else localStorage.removeItem(ADMIN_KEY)
}
export function getUserToken(): string | null {
  return localStorage.getItem(USER_KEY)
}
export function setUserToken(token: string | null) {
  if (token) localStorage.setItem(USER_KEY, token)
  else localStorage.removeItem(USER_KEY)
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
  const token = url.startsWith('/api/admin/') ? getToken() : getUserToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { ...options, headers })
  const type = response.headers.get('content-type') || ''
  const data = type.includes('json') ? await response.json() : await response.text()
  if (!response.ok) {
    const payload = typeof data === 'object' && data ? data as { error?: string; message?: string; code?: string } : null
    const message = payload ? payload.message || payload.error || 'Xatolik' : String(data)
    const error = new Error(message) as Error & { status?: number; code?: string }
    error.status = response.status
    error.code = payload ? payload.code || payload.error || message : message
    throw error
  }
  return data as T
}

async function requestBlob(url: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  const token = url.startsWith('/api/admin/') ? getToken() : getUserToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Faylni yuklab bo\'lmadi')
  }
  return response.blob()
}

const post = <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) })
const patch = <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T>(url: string, body: unknown) => request<T>(url, { method: 'PUT', body: JSON.stringify(body) })

export const api = {
  bootstrap: () => request<import('./types').Bootstrap>('/api/bootstrap'),
  health: () => request<import('./types').Bootstrap & { telegram: unknown }>('/api/health'),
  order: (id: string) => post<{ ok: boolean }>(`/api/products/${id}/order`),

  /* OTP is the primary customer auth flow. Legacy password endpoints remain available. */
  authProviders: () => request<AuthProviders>('/api/auth/providers'),
  otpRequest: (body: OtpRequestBody) => post<OtpRequestResult>('/api/auth/otp/request', body),
  otpVerify: (body: OtpVerifyBody) => post<OtpVerifyResult>('/api/auth/otp/verify', body),

  register: (body: unknown) => post<{ token: string; user: import('./types').User }>('/api/auth/register', body),
  loginCustomer: (body: unknown) => post<{ token: string; user: import('./types').User }>('/api/auth/login', body),
  me: () => request<{ user: import('./types').User }>('/api/auth/me'),
  updateProfile: (body: unknown) => put<{ user: import('./types').User }>('/api/auth/profile', body),
  changeCustomerPassword: (current: string, next: string) => post<{ ok: boolean }>('/api/auth/password', { current, next }),
  linkTelegram: (code: string) => post<{ ok: boolean; user: import('./types').User }>('/api/auth/telegram-link', { code }),
  unlinkTelegram: () => post<{ ok: boolean }>('/api/auth/telegram-unlink'),

  getCart: () => request<{ items: CartLine[] }>('/api/cart'),
  putCart: (items: CartLine[]) => put<{ items: CartLine[] }>('/api/cart', { items }),
  customerSummary: () => request<CustomerSummaryData>('/api/customer/summary'),
  customerPurchases: () => request<{ purchases: import('./types').Purchase[] }>('/api/customer/purchases'),
  customerReceipts: () => request<{ receipts: import('./types').Receipt[] }>('/api/customer/receipts'),
  customerActivity: () => request<{ activity: import('./types').ActivityItem[] }>('/api/customer/activity'),
  customerTransactions: () => request<{ transactions: import('./types').Payment[]; payments?: import('./types').Payment[] }>('/api/customer/transactions'),

  createOrder: (body: unknown) => post<{ order: import('./types').Order }>('/api/orders', body),
  trackOrder: (orderNumber: string, token: string) => post<{ order: import('./types').Order }>('/api/orders/track', { orderNumber, token }),
  myOrders: () => request<{ orders: import('./types').Order[] }>('/api/orders'),
  orderDetails: (id: string, token?: string) => request<import('./types').OrderDetail>(`/api/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`),
  cancelOrder: (id: string, token?: string) => post<{ order: import('./types').Order }>(`/api/orders/${id}/cancel`, token ? { token } : undefined),
  submitPayment: (id: string, body: unknown) => post<{ payment: import('./types').Payment }>(`/api/orders/${id}/payment`, body),
  downloadToken: (id: string, token?: string, productId?: string) => post<{ url: string; expiresInSeconds: number }>(
    `/api/orders/${id}/download-token`,
    token || productId ? { ...(token ? { token } : {}), ...(productId ? { productId } : {}) } : undefined,
  ),
  orderReceipt: (id: string, token?: string) => requestBlob(`/api/orders/${id}/receipt${token ? `?token=${encodeURIComponent(token)}` : ''}`),
  myPayments: () => request<{ payments: import('./types').Payment[] }>('/api/payments/my'),
  paymentMethods: () => request<{ methods: import('./types').PaymentMethod[] }>('/api/payments/methods'),

  login: (password: string) => post<{ token: string }>('/api/admin/login', { password }),
  logout: () => post<{ ok: boolean }>('/api/admin/logout'),
  adminData: () => request<import('./types').AdminData>('/api/admin/data'),
  adminStats: () => request<import('./types').Stats>('/api/admin/stats'),
  saveProduct: (product: unknown, isNew: boolean) => request<unknown>(
    isNew ? '/api/admin/products' : `/api/admin/products/${(product as { id: string }).id}`,
    { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(product) },
  ),
  toggleProduct: (id: string) => patch<unknown>(`/api/admin/products/${id}`, {}),
  deleteProduct: (id: string) => request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (id: string, imageData: string) => post<{ image: string }>(`/api/admin/products/${id}/image`, { imageData }),
  uploadProductFile: (id: string, fileData: string, fileName: string) => post<{ ok: boolean }>(`/api/admin/products/${id}/file`, { fileData, fileName }),
  saveSettings: (settings: unknown) => put<import('./types').Settings>('/api/admin/settings', settings),
  changePassword: (current: string, next: string) => post<{ ok: boolean }>('/api/admin/password', { current, next }),

  adminOrders: (params: { q?: string; status?: string } = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.status && params.status !== 'all') query.set('status', params.status)
    return request<{ orders: import('./types').Order[]; statuses: { id: string; label: string }[] }>(`/api/admin/orders?${query}`)
  },
  adminOrderDetail: (id: string) => request<import('./types').OrderDetail>(`/api/admin/orders/${id}`),
  confirmOrder: (id: string) => post<{ order: import('./types').Order }>(`/api/admin/orders/${id}/confirm`),
  rejectOrder: (id: string, reason: string) => post<{ order: import('./types').Order }>(`/api/admin/orders/${id}/reject`, { reason }),
  setOrderStatus: (id: string, status: string) => patch<{ order: import('./types').Order }>(`/api/admin/orders/${id}/status`, { status }),
  setOrderPrice: (id: string, body: unknown) => patch<{ order: import('./types').Order }>(`/api/admin/orders/${id}/price`, body),
  attachOrderFile: (id: string, fileData: string, fileName: string) => post<{ order: import('./types').Order }>(`/api/admin/orders/${id}/file`, { fileData, fileName }),
  completeOrder: (id: string) => post<{ order: import('./types').Order }>(`/api/admin/orders/${id}/complete`),
  adminPayments: (status = '') => request<{ payments: import('./types').Payment[]; labels: Record<string, string> }>(`/api/admin/payments${status ? `?status=${status}` : ''}`),
  verifyPayment: (id: string, approve: boolean, reason = '') => post<{ order: import('./types').Order; payment: import('./types').Payment }>(`/api/admin/payments/${id}/verify`, { approve, reason }),
  paymentReceipt: (id: string) => requestBlob(`/api/admin/payments/${id}/receipt`),
  adminOrderReceipt: (id: string) => requestBlob(`/api/admin/orders/${id}/receipt`),
  adminCustomers: () => request<{ customers: import('./types').CustomerSummary[] }>('/api/admin/customers'),
  adminCustomerDetail: (id: string) => request<import('./types').CustomerDetail>(`/api/admin/customers/${id}`),
  setCustomerStatus: (id: string, status: AccountStatus, reason?: string) => patch<{ ok?: boolean; customer: import('./types').User }>(
    `/api/admin/customers/${id}/status`,
    { status, ...(reason ? { reason } : {}) },
  ),
  notifications: () => request<{ notifications: import('./types').NotificationItem[] }>('/api/admin/notifications'),
  activity: () => request<{ activity: import('./types').ActivityItem[] }>('/api/admin/activity'),
  telegramStatus: () => request<import('./types').TelegramStatus>('/api/admin/telegram'),
  telegramTest: () => post<{ ok: boolean }>('/api/admin/telegram/test'),
}

export function receiptUrl(id: string, token?: string) {
  return `/api/orders/${id}/receipt${token ? `?token=${encodeURIComponent(token)}` : ''}`
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Faylni o\'qib bo\'lmadi'))
    reader.readAsDataURL(file)
  })
}

/** Human-readable, Uzbek messages for known backend error codes (never exposes test OTPs). */
export function describeApiError(error: unknown): string {
  if (!(error instanceof Error)) return 'Xatolik'
  const code = (error as Error & { code?: string }).code || error.message
  const messages: Record<string, string> = {
    PHONE_OTP_DISABLED: 'Telefon orqali kod yuborish o‘chirilgan. Email manzilingiz bilan kiring.',
    SMS_PROVIDER_NOT_CONFIGURED: 'SMS kanali o‘chirilgan. Email orqali kirishdan foydalaning.',
    EMAIL_PROVIDER_NOT_CONFIGURED: 'Email yuboruvchi sozlanmagan: .env da EMAIL_PROVIDER=gmail, GMAIL_USER va GMAIL_APP_PASSWORD kiriting (yoki smtp/resend).',
    OTP_PROVIDER_NOT_CONFIGURED: 'Xabar yuborish provayderi sozlanmagan. .env sozlamalarini tekshiring.',
    OTP_RESEND_TOO_SOON: 'Kod juda tez so‘raldi. Biroz kutib turing.',
    OTP_TOO_MANY_ATTEMPTS: 'Juda ko‘p urinish bo‘ldi. Biroz vaqt o‘tib qayta urining.',
    OTP_EXPIRED: 'Kod muddati tugagan. Yangi kod so‘rang.',
    OTP_INVALID: 'Kod noto‘g‘ri. Qayta tekshiring.',
    INVALID_OTP: 'Kod noto‘g‘ri. Qayta tekshiring.',
    INVALID_CODE: 'Kod noto‘g‘ri. Qayta tekshiring.',
    OTP_REQUEST_NOT_FOUND: 'Kod so‘rovi topilmadi. Qaytadan urining.',
    AUTH_REQUIRED: 'Avval tizimga kiring.',
  }
  return messages[code] || messages[error.message] || error.message || 'Xatolik'
}

export function money(value: number): string {
  return String(Math.round(value || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function date(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('uz-UZ') } catch { return iso }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function openBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
