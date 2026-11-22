export type CabinetTab = 'orders' | 'purchases' | 'payments' | 'receipts' | 'downloads' | 'activity' | 'profile'

export const CABINET_TABS: CabinetTab[] = ['orders', 'purchases', 'payments', 'receipts', 'downloads', 'activity', 'profile']

export type Route =
  | { page: 'home'; anchor?: string }
  | { page: 'product'; id: string }
  | { page: 'checkout'; mode: 'instant' | 'custom' }
  | { page: 'order'; id: string; token?: string }
  | { page: 'success'; id: string }
  | { page: 'track' }
  | { page: 'auth'; mode: 'login' | 'register'; token?: string }
  | { page: 'cabinet'; tab: CabinetTab }

export function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  if (!raw.startsWith('/')) return { page: 'home', anchor: raw }

  const [pathname, search = ''] = raw.split('?')
  const params = new URLSearchParams(search)
  const parts = pathname.split('/').filter(Boolean)

  if (parts[0] === 'catalog') return { page: 'home', anchor: 'katalog' }
  if (parts[0] === 'product' && parts[1]) return { page: 'product', id: parts[1] }
  if (parts[0] === 'checkout') {
    return { page: 'checkout', mode: params.get('mode') === 'custom' ? 'custom' : 'instant' }
  }
  if (parts[0] === 'order' && parts[1]) {
    return { page: 'order', id: parts[1], token: params.get('token') || undefined }
  }
  if (parts[0] === 'success' && parts[1]) return { page: 'success', id: parts[1] }
  if (parts[0] === 'track') return { page: 'track' }
  if (parts[0] === 'register' || parts[0] === 'login') {
    return {
      page: 'auth',
      mode: parts[0] === 'register' ? 'register' : 'login',
      token: params.get('token') || undefined,
    }
  }
  if (parts[0] === 'cabinet') {
    const tab = params.get('tab')
    return { page: 'cabinet', tab: CABINET_TABS.find((item) => item === tab) || 'orders' }
  }
  return { page: 'home' }
}

export function go(path: string) {
  const next = path.startsWith('#') ? path : `#${path}`
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = next
}

export function orderPath(id: string, token?: string) {
  return `/order/${encodeURIComponent(id)}${token ? `?token=${encodeURIComponent(token)}` : ''}`
}

export function successPath(id: string) {
  return `/success/${encodeURIComponent(id)}`
}

/**
 * Checkout is auth-only. The exact intended path (including ?mode=custom) is kept
 * so OTP auth can return the customer to where they left off, cart intact.
 */
const INTENDED_KEY = 'maxseller_intended_path'

export function currentPath(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

export function rememberIntended(path: string = currentPath()) {
  if (path.startsWith('/login') || path.startsWith('/register')) return
  try { localStorage.setItem(INTENDED_KEY, path) } catch { /* storage unavailable */ }
}

export function consumeIntended(): string | null {
  try {
    const path = localStorage.getItem(INTENDED_KEY)
    localStorage.removeItem(INTENDED_KEY)
    return path && path.startsWith('/') ? path : null
  } catch {
    return null
  }
}
