import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        'relative overflow-hidden rounded-lg bg-white/[0.06] after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/[0.07] after:to-transparent',
        className,
      )}
    />
  )
}
