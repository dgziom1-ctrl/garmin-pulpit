import type { ReactNode } from 'react'
import type { Tone } from '../../lib/metrics'
import { cn } from '../../lib/cn'
import { TONE_BADGE, TONE_DOT } from './tone'

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'slate', dot = false, className, children }: BadgeProps) {
  return (
    <span className={cn('chip', TONE_BADGE[tone], className)}>
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} /> : null}
      {children}
    </span>
  )
}
