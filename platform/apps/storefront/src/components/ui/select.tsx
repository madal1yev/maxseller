'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<React.ComponentProps<'select'>, 'children'> {
  options?: SelectOption[]
  placeholder?: string
}

/** Native select asosidagi, shadcn uslubidagi tanlov maydoni. */
export function Select({ className, options = [], placeholder, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn('field cursor-pointer appearance-none pr-10', className)} {...props}>
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald" />
    </div>
  )
}
