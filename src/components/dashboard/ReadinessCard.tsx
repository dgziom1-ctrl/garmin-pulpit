import { Gauge } from 'lucide-react'
import type { HealthSummary } from '../../types'
import { acrZone, hrvZone, readinessZone } from '../../lib/metrics'
import { fmtNumber } from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Ring } from '../ui/Ring'
import { cn } from '../../lib/cn'
import { TONE_TEXT } from '../ui/tone'

function MiniStat({
  label,
  value,
  hint,
  tone = 'slate',
}: {
  label: string
  value: string
  hint: string
  tone?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'indigo' | 'violet'
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-0.5 truncate text-sm font-semibold', TONE_TEXT[tone])}>{value}</p>
      <p className="truncate text-[10px] text-slate-500">{hint}</p>
    </div>
  )
}

export function ReadinessCard({ summary }: { summary: HealthSummary }) {
  const zone = readinessZone(summary.readiness, summary.readinessLabel)
  const hrv = summary.hrv
  const hrvInfo = hrvZone(hrv?.status)
  const acrInfo = acrZone(summary.acr)

  return (
    <Card className="card-pad flex flex-col">
      <CardHeader
        title="Gotowość treningowa"
        hint="Ocena gotowości Garmin"
        icon={<Gauge className="h-4 w-4" />}
        action={<Badge tone={zone.tone}>{zone.label}</Badge>}
      />

      <div className="flex flex-1 items-center justify-center py-5">
        <Ring
          value={summary.readiness}
          tone={zone.tone}
          size={172}
          stroke={11}
          label={
            <span className="text-4xl font-semibold tracking-tight text-white">
              {summary.readiness ?? '—'}
            </span>
          }
          sublabel={<span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">/ 100</span>}
        />
      </div>

      <p className="text-center text-xs leading-relaxed text-slate-400">{zone.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3">
        <MiniStat
          label="HRV"
          value={hrv?.nightlyAvg ? `${fmtNumber(hrv.nightlyAvg, 0)} ms` : '—'}
          hint={hrvInfo.label}
          tone={hrvInfo.tone}
        />
        <MiniStat
          label="Sen"
          value={summary.sleep?.score ? `${fmtNumber(summary.sleep.score, 0)}` : '—'}
          hint="ocena snu"
          tone={
            (summary.sleep?.score ?? 0) >= 80
              ? 'emerald'
              : (summary.sleep?.score ?? 0) >= 60
                ? 'cyan'
                : 'amber'
          }
        />
        <MiniStat
          label="ACR"
          value={summary.acr !== null ? fmtNumber(summary.acr, 2) : '—'}
          hint={acrInfo.label}
          tone={acrInfo.tone}
        />
      </div>
    </Card>
  )
}
