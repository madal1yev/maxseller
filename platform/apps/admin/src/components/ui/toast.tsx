'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastData {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

const icons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastVariant, string> = {
  success: 'border-brand-500/30 text-brand-300',
  error: 'border-red-400/30 text-red-300',
  warning: 'border-amber-400/30 text-amber-300',
  info: 'border-sky-400/30 text-sky-300',
}

export function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = icons[toast.variant]
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 30, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-ink-900/95 p-4 shadow-glow-lg backdrop-blur-xl',
                styles[toast.variant],
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 break-words text-xs leading-relaxed text-[#9db4a8]">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Bildirishnomani yopish"
                className="rounded p-0.5 text-[#8ba397] transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
