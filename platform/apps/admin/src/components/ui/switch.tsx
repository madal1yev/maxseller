'use client'

import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  className?: string
}

export function Switch({ checked, onCheckedChange, disabled, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? 'O\'zgartirish'}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-brand-500/60 bg-brand-500/80' : 'border-white/15 bg-white/10',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  )
}
