'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn('field min-h-[110px] resize-y', className)} {...props} />
}
