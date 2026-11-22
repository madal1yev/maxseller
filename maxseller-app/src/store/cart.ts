export interface CartItem {
  productId: string
  quantity: number
}

const CART_KEY = 'maxseller_cart'

export function loadCart(): CartItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    if (!Array.isArray(value)) return []
    return value
      .filter((item) => item && typeof item.productId === 'string')
      .map((item) => ({ productId: item.productId, quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)) }))
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

const ORDER_TOKENS_KEY = 'maxseller_order_tokens'

export function getOrderToken(id: string): string {
  try {
    const map = JSON.parse(localStorage.getItem(ORDER_TOKENS_KEY) || '{}')
    return String(map[id] || '')
  } catch {
    return ''
  }
}

export function setOrderToken(id: string, token: string) {
  if (!token) return
  try {
    const map = JSON.parse(localStorage.getItem(ORDER_TOKENS_KEY) || '{}')
    map[id] = token
    localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify(map))
  } catch {
    localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify({ [id]: token }))
  }
}
