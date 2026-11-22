'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import type {
  ActivityLog,
  Admin,
  Category,
  Coupon,
  DashboardStats,
  FAQ,
  Notification,
  Order,
  OrderStatus,
  Paginated,
  PaymentMethod,
  Product,
  ProductStatus,
  Receipt,
  Review,
  SiteSettings,
  User,
  VerificationAction,
} from '@maxseller/shared'
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  uploadImage,
  uploadProductFile,
  type UploadedFile,
  type UploadedImage,
} from './api'

/* -------------------------------------------------------------------------- */
/* Query keys                                                                 */
/* -------------------------------------------------------------------------- */

export const adminKeys = {
  all: ['admin'] as const,
  me: () => [...adminKeys.all, 'me'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  products: (params?: Record<string, unknown>) => [...adminKeys.all, 'products', params ?? {}] as const,
  product: (id: string) => [...adminKeys.all, 'product', id] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
  orders: (params?: Record<string, unknown>) => [...adminKeys.all, 'orders', params ?? {}] as const,
  order: (id: string) => [...adminKeys.all, 'order', id] as const,
  receipts: (orderId: string) => [...adminKeys.all, 'receipts', orderId] as const,
  customers: (params?: Record<string, unknown>) => [...adminKeys.all, 'customers', params ?? {}] as const,
  customer: (id: string) => [...adminKeys.all, 'customer', id] as const,
  paymentMethods: () => [...adminKeys.all, 'payment-methods'] as const,
  coupons: () => [...adminKeys.all, 'coupons'] as const,
  reviews: (params?: Record<string, unknown>) => [...adminKeys.all, 'reviews', params ?? {}] as const,
  faq: () => [...adminKeys.all, 'faq'] as const,
  notifications: () => [...adminKeys.all, 'notifications'] as const,
  activity: (page?: number) => [...adminKeys.all, 'activity', page ?? 1] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
}

/* -------------------------------------------------------------------------- */
/* Shared request helpers                                                     */
/* -------------------------------------------------------------------------- */

type QueryParam = string | number | boolean | null | undefined

function qs(params: Record<string, QueryParam> = {}): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const result = search.toString()
  return result ? `?${result}` : ''
}

export interface OkResponse {
  ok: boolean
}

export interface AdminCustomerDetail extends User {
  isActive?: boolean
  orderCount: number
  totalSpent: number
  orders: Order[]
}

export interface AdminOrderDetail extends Order {
  verifications?: Array<{
    id: string
    action: VerificationAction
    adminId: string
    adminName: string | null
    reason: string | null
    createdAt: string
  }>
}

export interface ProductListParams {
  q?: string
  status?: ProductStatus | ''
  page?: number
  limit?: number
}

export interface OrderListParams {
  q?: string
  status?: OrderStatus | ''
  page?: number
  limit?: number
}

export interface CustomerListParams {
  q?: string
  page?: number
  limit?: number
}

export function receiptUrl(orderId: string, receiptId: string): string {
  return `/api/admin/orders/${encodeURIComponent(orderId)}/receipt/${encodeURIComponent(receiptId)}`
}

/* -------------------------------------------------------------------------- */
/* Endpoint functions — barcha admin endpointlari                             */
/* -------------------------------------------------------------------------- */

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    apiPost<{ admin: Admin; token: string }>('/api/admin/auth/login', body),
  me: () => apiGet<{ admin: Admin }>('/api/admin/me'),
  dashboard: () => apiGet<DashboardStats>('/api/admin/dashboard'),

  products: (params: ProductListParams = {}) =>
    apiGet<Paginated<Product>>(`/api/admin/products${qs({ ...params })}`),
  product: (id: string) => apiGet<Product>(`/api/admin/products/${encodeURIComponent(id)}`),
  createProduct: (body: Record<string, unknown>) => apiPost<Product>('/api/admin/products', body),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    apiPatch<Product>(`/api/admin/products/${encodeURIComponent(id)}`, body),
  deleteProduct: (id: string) =>
    apiDelete<OkResponse>(`/api/admin/products/${encodeURIComponent(id)}`),

  categories: () => apiGet<Category[]>('/api/admin/categories'),
  createCategory: (body: Record<string, unknown>) => apiPost<Category>('/api/admin/categories', body),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiPatch<Category>(`/api/admin/categories/${encodeURIComponent(id)}`, body),
  deleteCategory: (id: string) =>
    apiDelete<OkResponse>(`/api/admin/categories/${encodeURIComponent(id)}`),

  orders: (params: OrderListParams = {}) =>
    apiGet<Paginated<Order>>(`/api/admin/orders${qs({ ...params })}`),
  order: (id: string) => apiGet<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (id: string, status: OrderStatus) =>
    apiPatch<Order>(`/api/admin/orders/${encodeURIComponent(id)}/status`, { status }),
  verifyOrder: (id: string, action: VerificationAction, reason?: string) =>
    apiPost<Order>(`/api/admin/orders/${encodeURIComponent(id)}/verify`, { action, reason: reason ?? '' }),
  receipts: (orderId: string) =>
    apiGet<Receipt[]>(`/api/admin/orders/${encodeURIComponent(orderId)}/receipts`),
  updateOrderNote: (id: string, adminNote: string) =>
    apiPatch<Order>(`/api/admin/orders/${encodeURIComponent(id)}/note`, { adminNote }),

  customers: (params: CustomerListParams = {}) =>
    apiGet<Paginated<User & { orderCount: number; totalSpent: number }>>(
      `/api/admin/customers${qs({ ...params })}`,
    ),
  customer: (id: string) =>
    apiGet<AdminCustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`),
  updateCustomer: (id: string, isActive: boolean) =>
    apiPatch<User & { isActive?: boolean }>(`/api/admin/customers/${encodeURIComponent(id)}`, { isActive }),

  paymentMethods: () => apiGet<PaymentMethod[]>('/api/admin/payment-methods'),
  createPaymentMethod: (body: Record<string, unknown>) =>
    apiPost<PaymentMethod>('/api/admin/payment-methods', body),
  updatePaymentMethod: (id: string, body: Record<string, unknown>) =>
    apiPatch<PaymentMethod>(`/api/admin/payment-methods/${encodeURIComponent(id)}`, body),
  deletePaymentMethod: (id: string) =>
    apiDelete<OkResponse>(`/api/admin/payment-methods/${encodeURIComponent(id)}`),

  coupons: () => apiGet<Coupon[]>('/api/admin/coupons'),
  createCoupon: (body: Record<string, unknown>) => apiPost<Coupon>('/api/admin/coupons', body),
  updateCoupon: (id: string, body: Record<string, unknown>) =>
    apiPatch<Coupon>(`/api/admin/coupons/${encodeURIComponent(id)}`, body),
  deleteCoupon: (id: string) =>
    apiDelete<OkResponse>(`/api/admin/coupons/${encodeURIComponent(id)}`),

  reviews: (approved?: boolean | '') =>
    apiGet<Review[]>(`/api/admin/reviews${qs({ approved: approved === '' ? undefined : approved })}`),
  moderateReview: (id: string, isApproved: boolean) =>
    apiPatch<Review>(`/api/admin/reviews/${encodeURIComponent(id)}/moderate`, { isApproved }),

  faq: () => apiGet<FAQ[]>('/api/admin/faq'),
  createFaq: (body: Record<string, unknown>) => apiPost<FAQ>('/api/admin/faq', body),
  updateFaq: (id: string, body: Record<string, unknown>) =>
    apiPatch<FAQ>(`/api/admin/faq/${encodeURIComponent(id)}`, body),
  deleteFaq: (id: string) => apiDelete<OkResponse>(`/api/admin/faq/${encodeURIComponent(id)}`),

  notifications: () => apiGet<Notification[]>('/api/admin/notifications'),
  markNotificationRead: (id: string) =>
    apiPatch<Notification>(`/api/admin/notifications/${encodeURIComponent(id)}/read`),

  activity: (page = 1) => apiGet<Paginated<ActivityLog>>(`/api/admin/activity${qs({ page })}`),

  settings: () => apiGet<SiteSettings>('/api/admin/settings'),
  updateSettings: (body: Record<string, unknown>) => apiPut<SiteSettings>('/api/admin/settings', body),

  uploads: {
    image: uploadImage,
    productFile: uploadProductFile,
  },
}

/* -------------------------------------------------------------------------- */
/* Mutation helper                                                            */
/* -------------------------------------------------------------------------- */

function useInvalidatingMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  keys: QueryKey[],
  onSuccess?: (data: TData, variables: TVariables) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      keys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }))
      onSuccess?.(data, variables)
    },
  })
}

const allProductKeys: QueryKey[] = [adminKeys.products(), adminKeys.dashboard(), adminKeys.all]
const allOrderKeys: QueryKey[] = [adminKeys.orders(), adminKeys.dashboard(), adminKeys.all]

/* -------------------------------------------------------------------------- */
/* Hooks                                                                      */
/* -------------------------------------------------------------------------- */

export function useAdminLogin() {
  return useMutation({
    mutationFn: adminApi.login,
  })
}

export function useAdminMe() {
  return useQuery({
    queryKey: adminKeys.me(),
    queryFn: adminApi.me,
    enabled: typeof window !== 'undefined' && Boolean(window.localStorage.getItem('maxseller_admin_token')),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminDashboard() {
  return useQuery({ queryKey: adminKeys.dashboard(), queryFn: adminApi.dashboard })
}

export function useAdminProducts(params: ProductListParams) {
  return useQuery({
    queryKey: adminKeys.products(params as Record<string, unknown>),
    queryFn: () => adminApi.products(params),
  })
}

export function useAdminProduct(id: string) {
  return useQuery({
    queryKey: adminKeys.product(id),
    queryFn: () => adminApi.product(id),
    enabled: Boolean(id),
  })
}

export function useCreateProduct() {
  return useInvalidatingMutation(adminApi.createProduct, allProductKeys)
}

export function useUpdateProduct(id: string) {
  return useInvalidatingMutation(
    (body: Record<string, unknown>) => adminApi.updateProduct(id, body),
    [...allProductKeys, adminKeys.product(id)],
  )
}

export function usePatchProduct() {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updateProduct(id, body),
    allProductKeys,
  )
}

export function useDeleteProduct() {
  return useInvalidatingMutation(adminApi.deleteProduct, allProductKeys)
}

export function useAdminCategories() {
  return useQuery({ queryKey: adminKeys.categories(), queryFn: adminApi.categories })
}

export function useCreateCategory() {
  return useInvalidatingMutation(adminApi.createCategory, [adminKeys.categories()])
}

export function useUpdateCategory() {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updateCategory(id, body),
    [adminKeys.categories()],
  )
}

export function useDeleteCategory() {
  return useInvalidatingMutation(adminApi.deleteCategory, [adminKeys.categories()])
}

export function useAdminOrders(params: OrderListParams) {
  return useQuery({
    queryKey: adminKeys.orders(params as Record<string, unknown>),
    queryFn: () => adminApi.orders(params),
  })
}

export function useAdminOrder(id: string) {
  return useQuery({
    queryKey: adminKeys.order(id),
    queryFn: () => adminApi.order(id),
    enabled: Boolean(id),
  })
}

export function useAdminReceipts(orderId: string) {
  return useQuery({
    queryKey: adminKeys.receipts(orderId),
    queryFn: () => adminApi.receipts(orderId),
    enabled: Boolean(orderId),
  })
}

export function useUpdateOrderStatus(id: string) {
  return useInvalidatingMutation(
    (status: OrderStatus) => adminApi.updateOrderStatus(id, status),
    [...allOrderKeys, adminKeys.order(id)],
  )
}

export function useVerifyOrder(id: string) {
  return useInvalidatingMutation(
    ({ action, reason }: { action: VerificationAction; reason?: string }) =>
      adminApi.verifyOrder(id, action, reason),
    [...allOrderKeys, adminKeys.order(id), adminKeys.receipts(id)],
  )
}

export function useVerifyAnyOrder() {
  return useInvalidatingMutation(
    ({ id, action, reason }: { id: string; action: VerificationAction; reason?: string }) =>
      adminApi.verifyOrder(id, action, reason),
    allOrderKeys,
  )
}

export function useUpdateOrderNote(id: string) {
  return useInvalidatingMutation(
    (adminNote: string) => adminApi.updateOrderNote(id, adminNote),
    [...allOrderKeys, adminKeys.order(id)],
  )
}

export function useAdminCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: adminKeys.customers(params as Record<string, unknown>),
    queryFn: () => adminApi.customers(params),
  })
}

export function useAdminCustomer(id: string) {
  return useQuery({
    queryKey: adminKeys.customer(id),
    queryFn: () => adminApi.customer(id),
    enabled: Boolean(id),
  })
}

export function useUpdateCustomer() {
  return useInvalidatingMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.updateCustomer(id, isActive),
    [adminKeys.customers(), adminKeys.all],
  )
}

export function useAdminPaymentMethods() {
  return useQuery({ queryKey: adminKeys.paymentMethods(), queryFn: adminApi.paymentMethods })
}

export function useCreatePaymentMethod() {
  return useInvalidatingMutation(adminApi.createPaymentMethod, [adminKeys.paymentMethods()])
}

export function useUpdatePaymentMethod() {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updatePaymentMethod(id, body),
    [adminKeys.paymentMethods()],
  )
}

export function useDeletePaymentMethod() {
  return useInvalidatingMutation(adminApi.deletePaymentMethod, [adminKeys.paymentMethods()])
}

export function useAdminCoupons() {
  return useQuery({ queryKey: adminKeys.coupons(), queryFn: adminApi.coupons })
}

export function useCreateCoupon() {
  return useInvalidatingMutation(adminApi.createCoupon, [adminKeys.coupons()])
}

export function useUpdateCoupon() {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updateCoupon(id, body),
    [adminKeys.coupons()],
  )
}

export function useDeleteCoupon() {
  return useInvalidatingMutation(adminApi.deleteCoupon, [adminKeys.coupons()])
}

export function useAdminReviews(approved?: boolean | '') {
  return useQuery({
    queryKey: adminKeys.reviews({ approved: approved ?? '' }),
    queryFn: () => adminApi.reviews(approved),
  })
}

export function useModerateReview() {
  return useInvalidatingMutation(
    ({ id, isApproved }: { id: string; isApproved: boolean }) => adminApi.moderateReview(id, isApproved),
    [adminKeys.reviews(), adminKeys.all],
  )
}

export function useAdminFaq() {
  return useQuery({ queryKey: adminKeys.faq(), queryFn: adminApi.faq })
}

export function useCreateFaq() {
  return useInvalidatingMutation(adminApi.createFaq, [adminKeys.faq()])
}

export function useUpdateFaq() {
  return useInvalidatingMutation(
    ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updateFaq(id, body),
    [adminKeys.faq()],
  )
}

export function useDeleteFaq() {
  return useInvalidatingMutation(adminApi.deleteFaq, [adminKeys.faq()])
}

export function useAdminNotifications() {
  return useQuery({ queryKey: adminKeys.notifications(), queryFn: adminApi.notifications })
}

export function useMarkNotificationRead() {
  return useInvalidatingMutation(adminApi.markNotificationRead, [adminKeys.notifications()])
}

export function useAdminActivity(page = 1) {
  return useQuery({
    queryKey: adminKeys.activity(page),
    queryFn: () => adminApi.activity(page),
  })
}

export function useAdminSettings() {
  return useQuery({ queryKey: adminKeys.settings(), queryFn: adminApi.settings })
}

export function useUpdateSettings() {
  return useInvalidatingMutation(adminApi.updateSettings, [adminKeys.settings(), adminKeys.all])
}

export function useUploadImage() {
  return useMutation({ mutationFn: uploadImage })
}

export function useUploadProductFile() {
  return useMutation({ mutationFn: uploadProductFile })
}

export type { UploadedFile, UploadedImage }
