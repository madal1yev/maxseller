import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-emerald/30 bg-emerald/15 text-emerald',
        secondary: 'border-white/15 bg-white/[0.06] text-foreground/80',
        outline: 'border-white/20 bg-transparent text-muted',
        success: 'border-emerald/40 bg-emerald/20 text-emerald',
        warning: 'border-amber-400/30 bg-amber-400/15 text-amber-300',
        destructive: 'border-red-400/30 bg-red-400/15 text-red-300',
        info: 'border-sky-400/30 bg-sky-400/15 text-sky-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
