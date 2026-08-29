import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'soft' | 'outline'
}

export function Badge({ className, variant = 'soft', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        variant === 'soft' ? 'bg-brand-50 text-brand-700' : 'border border-slate-200 bg-white text-slate-500',
        className,
      )}
      {...props}
    />
  )
}
