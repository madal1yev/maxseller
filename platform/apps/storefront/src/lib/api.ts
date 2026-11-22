export const TOKEN_KEY = 'maxseller_token'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status = 0, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

function normalizePath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const clean = path.replace(/^\/+/, '')
  return clean.startsWith('api/') ? `/${clean}` : `/api/${clean}`
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
    window.dispatchEvent(new Event('maxseller:auth'))
  } catch {
    /* storage disabled */
  }
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event('maxseller:auth'))
  } catch {
    /* storage disabled */
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  const body = init.body
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (!isForm && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

function networkError(): ApiError {
  return new ApiError(
    "Server bilan bog'lanib bo'lmadi. Internet ulanishini tekshirib, qaytadan urinib ko'ring.",
    0,
  )
}

/** JSON javob qaytaradigan barcha /api chaqiruvlari uchun yagona client. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = buildHeaders(init)
  let response: Response
  try {
    response = await fetch(normalizePath(path), { ...init, headers, cache: 'no-store' })
  } catch {
    throw networkError()
  }

  let payload: unknown = null
  const raw = await response.text()
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      if (!response.ok) throw new ApiError('Serverdan noto\'g\'ri javob olindi.', response.status)
    }
  }

  if (!response.ok) {
    const obj = payload as { error?: unknown; message?: unknown; details?: unknown } | null
    const message =
      typeof obj?.error === 'string'
        ? obj.error
        : typeof obj?.message === 'string'
          ? obj.message
          : `So'rov bajarilmadi (${response.status}).`
    throw new ApiError(message, response.status, obj?.details)
  }

  return payload as T
}

/** Himoyalangan fayllarni blob sifatida yuklab olish uchun. */
export async function apiFetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const headers = buildHeaders(init)
  headers.delete('Content-Type')
  let response: Response
  try {
    response = await fetch(normalizePath(path), { ...init, headers, cache: 'no-store' })
  } catch {
    throw networkError()
  }
  if (!response.ok) {
    let message = `Faylni yuklab bo'lmadi (${response.status}).`
    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status)
  }
  return response.blob()
}
