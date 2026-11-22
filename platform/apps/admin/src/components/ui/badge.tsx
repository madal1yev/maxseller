import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
  {
    variants: {
      variant: {
        default: 'border-brand-500/25 bg-brand-500/10 text-brand-300',
        secondary: 'border-white/10 bg-white/[0.05] text-[#b9cec3]',
        success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
        warning: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
        danger: 'border-red-400/25 bg-red-400/10 text-red-300',
        info: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
        outline: 'border-white/15 bg-transparent text-[#b9cec3]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
