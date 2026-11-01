import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Tone } from '../../lib/metrics'
import { cn } from '../../lib/cn'
import { TONE_TEXT } from './tone'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  tone?: Tone
  trend?: number | null
  onClick?: () => void
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  hint,
  tone = 'slate',
  trend,
  onClick,
  className,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon className={cn('h-4 w-4', TONE_TEXT[tone])} />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        {typeof trend === 'number' ? (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              trend > 0 ? 'text-emerald-300' : trend < 0 ? 'text-rose-300' : 'text-slate-400',
            )}
          >
            {trend > 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}
          </span>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
          {value}
        </span>
        {unit ? <span className="text-xs text-slate-500">{unit}</span> : null}
      </div>

      {hint ? <div className="text-xs leading-relaxed text-slate-500">{hint}</div> : null}
    </>
  )

  const classes = cn(
    'card card-pad flex flex-col gap-3 text-left',
    onClick && 'transition hover:border-slate-700 hover:bg-slate-900/80',
    className,
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }

  return <div className={classes}>{content}</div>
}
