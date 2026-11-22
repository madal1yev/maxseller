import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-xl bg-white/[0.07]', className)}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="panel overflow-hidden p-0">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}
