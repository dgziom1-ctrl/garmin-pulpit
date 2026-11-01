import { useId } from 'react'
import type { ReactNode } from 'react'
import type { Tone } from '../../lib/metrics'
import { clamp } from '../../lib/format'
import { TONE_STROKE } from './tone'

interface RingProps {
  value: number | null
  max?: number
  size?: number
  stroke?: number
  tone?: Tone
  label?: ReactNode
  sublabel?: ReactNode
  className?: string
}

export function Ring({
  value,
  max = 100,
  size = 148,
  stroke = 10,
  tone = 'emerald',
  label,
  sublabel,
  className,
}: RingProps) {
  const gradientId = useId()
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const safeValue = value === null ? 0 : clamp(value, 0, max)
  const ratio = safeValue / max
  const [from, to] = TONE_STROKE[tone]

  return (
    <div className={className} style={{ width: size, height: size }}>
      <div className="relative h-full w-full">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(30, 41, 59, 0.9)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {label}
          {sublabel}
        </div>
      </div>
    </div>
  )
}
