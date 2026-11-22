import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-brand-500 text-ink-950 shadow-glow hover:bg-brand-400 hover:shadow-glow-lg active:scale-[.98]',
        secondary:
          'border border-white/10 bg-white/[0.05] text-white hover:border-white/20 hover:bg-white/[0.09]',
        outline:
          'border border-brand-500/30 bg-transparent text-brand-300 hover:border-brand-500/60 hover:bg-brand-500/10',
        ghost: 'text-[#9db4a8] hover:bg-white/[0.06] hover:text-white',
        destructive:
          'border border-red-500/25 bg-red-500/10 text-red-300 hover:border-red-500/50 hover:bg-red-500/20',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        type={asChild ? undefined : type ?? 'button'}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
