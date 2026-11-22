export const ADMIN_TOKEN_KEY = 'maxseller_admin_token'
export const UNAUTHORIZED_EVENT = 'admin:unauthorized'

export class ApiRequestError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.details = details
  }
}

export interface UploadedImage {
  id: string
  url: string
  name: string
  size: number
  mime: string
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  mime: string
}

type ApiBody = BodyInit | Record<string, unknown> | null | undefined

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: ApiBody
  headers?: HeadersInit
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  } catch {
    /* storage disabled */
  }
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* storage disabled */
  }
}

function authHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers)
  const token = getAdminToken()
  if (token) result.set('Authorization', `Bearer ${token}`)
  return result
}

function isRawBody(body: ApiBody): body is BodyInit {
  if (body == null || typeof body === 'string') return true
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return true
  return false
}

function handleUnauthorized(status: number): void {
  if (status !== 401 || typeof window === 'undefined') return
  clearAdminToken()
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
}

function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return response.json().catch(() => null)
  return response.text().catch(() => '')
}

function errorFromPayload(payload: unknown, status: number): ApiRequestError {
  let message = `Xatolik (${status})`
  let details: unknown
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (typeof obj.error === 'string') message = obj.error
    details = obj.details
  } else if (typeof payload === 'string' && payload.trim()) {
    message = payload.slice(0, 300)
  }
  return new ApiRequestError(message, status, details)
}

/** Barcha admin so'rovlari uchun yagona fetch qatlami. */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options
  const requestHeaders = authHeaders(headers)
  let serialized: BodyInit | undefined

  if (body == null) {
    serialized = undefined
  } else if (isRawBody(body)) {
    serialized = body
  } else {
    if (!requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json')
    serialized = JSON.stringify(body)
  }

  const response = await fetch(path, {
    ...rest,
    headers: requestHeaders,
    body: serialized,
    cache: 'no-store',
  })

  handleUnauthorized(response.status)
  const payload = await parsePayload(response)
  if (!response.ok) throw errorFromPayload(payload, response.status)
  return payload as T
}

/** Chek kabi himoyalangan fayllarni Blob sifatida olish (Authorization header bilan). */
export async function apiFetchBlob(path: string): Promise<{ blob: Blob; mime: string }> {
  const response = await fetch(path, {
    headers: authHeaders(),
    cache: 'no-store',
  })

  handleUnauthorized(response.status)
  if (!response.ok) {
    const payload = await parsePayload(response)
    throw errorFromPayload(payload, response.status)
  }
  return {
    blob: await response.blob(),
    mime: response.headers.get('content-type') ?? 'application/octet-stream',
  }
}

export function apiGet<T>(path: string) {
  return apiFetch<T>(path)
}

export function apiPost<T>(path: string, body?: ApiBody) {
  return apiFetch<T>(path, { method: 'POST', body })
}

export function apiPatch<T>(path: string, body?: ApiBody) {
  return apiFetch<T>(path, { method: 'PATCH', body })
}

export function apiPut<T>(path: string, body?: ApiBody) {
  return apiFetch<T>(path, { method: 'PUT', body })
}

export function apiDelete<T>(path: string) {
  return apiFetch<T>(path, { method: 'DELETE' })
}

export function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file)
  return apiPost<UploadedImage>('/api/admin/uploads/image', form)
}

export function uploadProductFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  return apiPost<UploadedFile>('/api/admin/uploads/product-file', form)
}
