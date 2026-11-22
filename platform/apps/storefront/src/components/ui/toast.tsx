'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (input: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const icons: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const styles: Record<ToastVariant, string> = {
  success: 'text-emerald',
  error: 'text-red-400',
  info: 'text-sky-400',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback(
    (input: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2)
      setItems((prev) => [...prev, { ...input, id }])
      if (typeof window !== 'undefined') {
        window.setTimeout(() => dismiss(id), 5000)
      }
    },
    [dismiss],
  )

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => {
          const Icon = icons[item.variant]
          return (
            <div
              key={item.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-card/95 p-4 shadow-glow-lg backdrop-blur-xl"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles[item.variant])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Yopish"
                className="rounded p-0.5 text-muted transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast ToastProvider ichida ishlatilishi kerak')
  return ctx
}
