import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('card', className)} {...props}>
      {children}
    </section>
  )
}

interface CardHeaderProps {
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function CardHeader({ title, hint, action, icon, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <div className="mt-0.5 text-slate-400">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
