import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-brand-600 text-white shadow-md shadow-emerald-900/10 hover:bg-brand-700',
      outline: 'border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700',
      secondary: 'bg-white text-brand-700 shadow-md hover:bg-brand-50',
      ghost: 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
      danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    },
    size: { default: 'h-11', sm: 'h-9 min-h-9 px-3 text-xs', lg: 'h-12 px-6' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ asChild, className, variant, size, ...props }, ref) => {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
})
Button.displayName = 'Button'
