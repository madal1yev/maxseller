'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Product, User } from '@maxseller/shared'
import {
  getMe,
  getFavorites as fetchFavorites,
  toggleFavorite as apiToggleFavorite,
} from '@/lib/api-queries'
import { getToken, removeToken, setToken } from '@/lib/api'
import { ToastProvider, useToast } from '@/components/ui/toast'

/* ------------------------------- Auth ------------------------------ */

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  favoriteIds: string[]
  isFavorite: (productId: string) => boolean
  login: (token: string, user: User) => void
  logout: () => void
  refresh: () => Promise<void>
  toggleFavorite: (productId: string) => Promise<boolean>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [token, setCurrentToken] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [favoriteIds, setFavoriteIds] = React.useState<string[]>([])
  const { toast } = useToast()

  const refresh = React.useCallback(async () => {
    const current = getToken()
    if (!current) {
      setCurrentToken(null)
      setUser(null)
      setFavoriteIds([])
      setIsLoading(false)
      return
    }
    setCurrentToken(current)
    try {
      const [{ user: me }, favorites] = await Promise.all([getMe(), fetchFavorites()])
      setUser(me)
      setFavoriteIds(favorites.map((product) => product.id))
    } catch {
      removeToken()
      setCurrentToken(null)
      setUser(null)
      setFavoriteIds([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const login = React.useCallback((nextToken: string, nextUser: User) => {
    setToken(nextToken)
    setCurrentToken(nextToken)
    setUser(nextUser)
    setIsLoading(false)
  }, [])

  const logout = React.useCallback(() => {
    removeToken()
    setCurrentToken(null)
    setUser(null)
    setFavoriteIds([])
    toast({ title: "Tizimdan chiqdingiz", variant: 'info' })
  }, [toast])

  const isFavorite = React.useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds],
  )

  const toggleFavoriteItem = React.useCallback(
    async (productId: string) => {
      if (!getToken()) {
        toast({
          title: 'Avval tizimga kiring',
          description: 'Sevimlilar ro\'yxatiga qo\'shish uchun akkaunt kerak.',
          variant: 'error',
        })
        return false
      }
      try {
        const { favorited } = await apiToggleFavorite(productId)
        setFavoriteIds((prev) =>
          favorited ? [...new Set([...prev, productId])] : prev.filter((id) => id !== productId),
        )
        toast({
          title: favorited ? 'Sevimlilarga qo\'shildi' : 'Sevimlilardan olib tashlandi',
          variant: 'success',
        })
        return favorited
      } catch (error) {
        toast({
          title: 'Xatolik',
          description: error instanceof Error ? error.message : 'Qaytadan urinib ko\'ring.',
          variant: 'error',
        })
        return false
      }
    },
    [toast],
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token),
      favoriteIds,
      isFavorite,
      login,
      logout,
      refresh,
      toggleFavorite: toggleFavoriteItem,
    }),
    [user, token, isLoading, favoriteIds, isFavorite, login, logout, refresh, toggleFavoriteItem],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth Providers ichida ishlatilishi kerak')
  return ctx
}

/* ------------------------------- Cart ------------------------------ */

const CART_KEY = 'maxseller_cart'

export interface CartItem {
  productId: string
  slug: string
  title: string
  image: string | null
  price: number
  oldPrice: number
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  isReady: boolean
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = React.createContext<CartContextValue | null>(null)

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([])
  const [isReady, setIsReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (item): item is CartItem =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as CartItem).productId === 'string' &&
                typeof (item as CartItem).price === 'number' &&
                typeof (item as CartItem).quantity === 'number',
            ),
          )
        }
      }
    } catch {
      /* ignore corrupted storage */
    }
    setIsReady(true)
  }, [])

  React.useEffect(() => {
    if (!isReady) return
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* storage disabled */
    }
  }, [items, isReady])

  const addItem = React.useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(10, item.quantity + quantity) }
            : item,
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          title: product.title,
          image: product.images?.[0]?.url ?? null,
          price: product.price,
          oldPrice: product.oldPrice ?? 0,
          quantity: Math.min(10, Math.max(1, quantity)),
        },
      ]
    })
  }, [])

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId))
  }, [])

  const updateQuantity = React.useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.min(10, Math.max(1, Math.round(quantity))) }
          : item,
      ),
    )
  }, [])

  const clearCart = React.useCallback(() => setItems([]), [])

  const value = React.useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return {
      items,
      count,
      subtotal,
      isReady,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }
  }, [items, isReady, addItem, removeItem, updateQuantity, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = React.useContext(CartContext)
  if (!ctx) throw new Error('useCart Providers ichida ishlatilishi kerak')
  return ctx
}

/* ------------------------------- Theme ----------------------------- */

type Theme = 'dark' | 'light'
const THEME_KEY = 'maxseller_theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>('dark')

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY)
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {
      /* ignore */
    }
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
    try {
      window.localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const value = React.useMemo(
    () => ({ theme, toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')) }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme Providers ichida ishlatilishi kerak')
  return ctx
}

/* ----------------------------- Providers --------------------------- */

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>{children}</CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
