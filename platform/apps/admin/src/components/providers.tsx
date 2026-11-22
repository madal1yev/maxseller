'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Admin } from '@maxseller/shared'
import {
  UNAUTHORIZED_EVENT,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from '@/lib/api'
import { adminApi } from '@/lib/api-queries'
import { ToastViewport, type ToastData, type ToastVariant } from '@/components/ui/toast'
import { AdminShell } from '@/components/layout/admin-shell'

interface AdminAuthContextValue {
  admin: Admin | null
  isAuthenticated: boolean
  authLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

interface ToastContextValue {
  toast: (input: {
    title: string
    description?: string
    variant?: ToastVariant
    duration?: number
  }) => void
  dismiss: (id: string) => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)
const ToastContext = createContext<ToastContextValue | null>(null)

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth Providers ichida ishlatilishi kerak')
  return context
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast Providers ichida ishlatilishi kerak')
  return context
}

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-ping rounded-full border border-brand-500/30" />
          <div className="absolute inset-2 rounded-full bg-brand-500 shadow-glow" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7f998b]">MaxSeller Admin</p>
      </div>
    </div>
  )
}

/** Token yo'q bo'lsa barcha himoyalangan sahifalarga /login ga yo'naltiradi. */
function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { admin, isAuthenticated, authLoading, logout } = useAdminAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || authLoading) return
    if (!isAuthenticated && pathname !== '/login') router.replace('/login')
  }, [mounted, authLoading, isAuthenticated, pathname, router])

  if (!mounted || authLoading) return <AppLoader />
  if (!isAuthenticated) return <>{children}</>

  return (
    <AdminShell admin={admin} onLogout={logout}>
      {children}
    </AdminShell>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      }),
  )
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [hasToken, setHasToken] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timers = useRef<number[]>([])

  const logout = useCallback(() => {
    clearAdminToken()
    setHasToken(false)
    setAdmin(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = getAdminToken()
    if (!token) {
      setAuthLoading(false)
      return
    }
    setHasToken(true)
    adminApi
      .me()
      .then(({ admin: current }) => {
        if (!cancelled) setAdmin(current)
      })
      .catch(() => {
        if (!cancelled) logout()
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [logout])

  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
      if (window.location.pathname !== '/login') router.replace('/login')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [logout, router])

  useEffect(() => {
    const active = timers.current
    return () => active.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, variant = 'info', duration = 4800 }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((current) => [...current.slice(-4), { id, title, description, variant }])
      const timer = window.setTimeout(() => dismiss(id), duration)
      timers.current.push(timer)
    },
    [dismiss],
  )

  const login = useCallback(async (email: string, password: string) => {
    const response = await adminApi.login({ email, password })
    setAdminToken(response.token)
    setHasToken(true)
    setAdmin(response.admin)
  }, [])

  const authValue = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      isAuthenticated: hasToken || Boolean(admin),
      authLoading,
      login,
      logout,
    }),
    [admin, authLoading, login, logout, hasToken],
  )

  const toastValue = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthContext.Provider value={authValue}>
        <ToastContext.Provider value={toastValue}>
          <RouteFrame>{children}</RouteFrame>
          <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
      </AdminAuthContext.Provider>
    </QueryClientProvider>
  )
}
