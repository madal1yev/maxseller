import { apiFetch, apiFetchBlob } from './api'
import type {
  Category,
  Download,
  FAQ,
  Order,
  Paginated,
  PaymentMethod,
  Product,
  Review,
  SiteSettings,
  User,
} from '@maxseller/shared'

export interface ProductListParams {
  category?: string
  q?: string
  sort?: 'new' | 'popular' | 'price_asc' | 'price_desc'
  page?: number
  limit?: number
}

function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

/** TanStack Query kalitlari — barcha invalidationlar shu yerdan. */
export const queryKeys = {
  settings: ['settings'] as const,
  categories: ['categories'] as const,
  category: (slug: string) => ['categories', slug] as const,
  products: (params: ProductListParams = {}) => ['products', params] as const,
  product: (slug: string) => ['product', slug] as const,
  featured: ['products', 'featured'] as const,
  popular: ['products', 'popular'] as const,
  newest: ['products', 'new'] as const,
  bestSellers: ['products', 'best-sellers'] as const,
  reviews: (productId: string) => ['reviews', productId] as const,
  faq: ['faq'] as const,
  paymentMethods: ['payment-methods'] as const,
  me: ['auth', 'me'] as const,
  favorites: ['favorites'] as const,
  orders: ['orders', 'my'] as const,
  order: (id: string) => ['orders', 'my', id] as const,
  downloads: ['downloads'] as const,
}

/* ----------------------------- Ommaviy ----------------------------- */

export const getPublicSettings = () => apiFetch<SiteSettings>('/settings/public')
export const getHealth = () => apiFetch<{ ok: boolean }>('/health')
export const getCategories = () => apiFetch<Category[]>('/categories')
export const getProducts = (params: ProductListParams = {}) =>
  apiFetch<Paginated<Product>>(
    withQuery('/products', {
      category: params.category,
      q: params.q,
      sort: params.sort,
      page: params.page,
      limit: params.limit,
    }),
  )
export const getFeaturedProducts = () => apiFetch<Product[]>('/products/featured')
export const getPopularProducts = () => apiFetch<Product[]>('/products/popular')
export const getNewProducts = () => apiFetch<Product[]>('/products/new')
export const getBestSellers = () => apiFetch<Product[]>('/products/best-sellers')
export const getProductBySlug = (slug: string) =>
  apiFetch<Product>(`/products/${encodeURIComponent(slug)}`)
export const getReviews = (productId: string) =>
  apiFetch<Review[]>(withQuery('/reviews', { productId }))
export const getFaq = () => apiFetch<FAQ[]>('/faq')
export const getPaymentMethods = () => apiFetch<PaymentMethod[]>('/payment-methods')

/* ------------------------- Autentifikatsiya ------------------------ */

export interface AuthResponse {
  user: User
  token: string
}

export const registerUser = (input: {
  name: string
  email: string
  phone?: string
  password: string
}) => apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) })

export const loginUser = (input: { email: string; password: string }) =>
  apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })

export const getMe = () => apiFetch<{ user: User }>('/auth/me')
export const updateProfile = (input: { name?: string; phone?: string }) =>
  apiFetch<{ user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) })

/* ------------------------ Buyurtma va to'lov ----------------------- */

export interface CreateOrderInput {
  items: { productId: string; quantity: number }[]
  couponCode?: string
  customerNote?: string
}

export const createOrder = (input: CreateOrderInput) =>
  apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(input) })

export const getMyOrders = () => apiFetch<Order[]>('/orders/my')
export const getMyOrder = (id: string) =>
  apiFetch<Order>(`/orders/my/${encodeURIComponent(id)}`)

export const uploadReceipt = (orderId: string, file: File) => {
  const form = new FormData()
  form.append('receipt', file)
  return apiFetch<Order>(`/orders/${encodeURIComponent(orderId)}/receipt`, {
    method: 'POST',
    body: form,
  })
}

export const cancelOrder = (id: string) =>
  apiFetch<Order>(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' })

export const getDownloads = () => apiFetch<Download[]>('/downloads')
export const downloadFile = (id: string) => apiFetchBlob(`/downloads/${encodeURIComponent(id)}/file`)

export const getFavorites = () => apiFetch<Product[]>('/favorites')
export const toggleFavorite = (productId: string) =>
  apiFetch<{ favorited: boolean }>(`/favorites/${encodeURIComponent(productId)}`, {
    method: 'POST',
  })

export const createReview = (input: { productId: string; rating: number; comment: string }) =>
  apiFetch<Review>('/reviews', { method: 'POST', body: JSON.stringify(input) })
