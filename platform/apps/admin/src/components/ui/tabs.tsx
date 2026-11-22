'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: string
  count?: number
  content: ReactNode
}

export interface TabsProps {
  items: TabItem[]
  value?: string
  onValueChange?: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onValueChange, className }: TabsProps) {
  const [internal, setInternal] = useState(items[0]?.value ?? '')
  const active = value ?? internal
  const current = items.find((item) => item.value === active) ?? items[0]

  return (
    <div className={className}>
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setInternal(item.value)
              onValueChange?.(item.value)
            }}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-semibold transition-all',
              active === item.value
                ? 'bg-brand-500/15 text-brand-300 shadow-[inset_0_0_0_1px_rgba(0,230,118,.22)]'
                : 'text-[#8ba397] hover:bg-white/[0.05] hover:text-white',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{item.count}</span>
            )}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  )
}
