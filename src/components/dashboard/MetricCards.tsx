import { BatteryCharging, Moon, ShieldAlert, TrendingUp } from 'lucide-react'
import type { BodyBatterySample, DailyHealth, HealthSummary } from '../../types'
import { acrZone, hrvZone, sleepQualityLabel, trainingStatusLabel } from '../../lib/metrics'
import { fmtDurationHuman, fmtNumber } from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { BodyBatteryChart } from '../charts/BodyBatteryChart'
import { cn } from '../../lib/cn'

function batteryTone(level: number | null): 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' {
  if (level === null) return 'slate'
  if (level >= 60) return 'emerald'
  if (level >= 35) return 'cyan'
  if (level >= 20) return 'amber'
  return 'rose'
}

export function BodyBatteryCard({
  summary,
  samples,
  history,
}: {
  summary: HealthSummary
  samples: BodyBatterySample[]
  history: DailyHealth[]
}) {
  const current = summary.bodyBattery?.current ?? null
  const intraday = samples.length >= 2

  return (
    <Card className="card-pad">
      <CardHeader
        title="Body Battery"
        hint={intraday ? 'Przebieg dnia (24 h)' : 'Trend z ostatnich 14 dni'}
        icon={<BatteryCharging className="h-4 w-4" />}
        action={
          <Badge tone={batteryTone(current)} dot>
            {current !== null ? `${fmtNumber(current, 0)}/100` : 'brak danych'}
          </Badge>
        }
      />
      <div className="mt-3">
        <BodyBatteryChart samples={samples} history={history} height={190} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span>Min: {summary.bodyBattery?.min ?? '—'}</span>
        <span>Max: {summary.bodyBattery?.max ?? '—'}</span>
        <span>Naładowano: {summary.bodyBattery?.charged ?? '—'}</span>
        <span>Zużyto: {summary.bodyBattery?.drained ?? '—'}</span>
      </div>
    </Card>
  )
}

const STAGE_COLORS = {
  deep: '#6366f1',
  rem: '#22d3ee',
  light: '#334155',
  awake: '#f43f5e',
} as const

export function SleepCard({ summary }: { summary: HealthSummary }) {
  const sleep = summary.sleep
  const total =
    (sleep?.deepMin ?? 0) + (sleep?.remMin ?? 0) + (sleep?.lightMin ?? 0) + (sleep?.awakeMin ?? 0)
  const stages = [
    { key: 'deep', label: 'Głęboki', value: sleep?.deepMin ?? 0 },
    { key: 'rem', label: 'REM', value: sleep?.remMin ?? 0 },
    { key: 'light', label: 'Lekki', value: sleep?.lightMin ?? 0 },
    { key: 'awake', label: 'Czuwanie', value: sleep?.awakeMin ?? 0 },
  ] as const

  const score = sleep?.score ?? null

  return (
    <Card className="card-pad flex flex-col">
      <CardHeader
        title="Sen"
        hint="Ostatnia noc"
        icon={<Moon className="h-4 w-4" />}
        action={
          <Badge
            tone={score === null ? 'slate' : score >= 80 ? 'emerald' : score >= 60 ? 'cyan' : 'amber'}
          >
            {score !== null ? `${fmtNumber(score, 0)}/100` : 'brak'}
          </Badge>
        }
      />

      <div className="mt-4 flex items-end gap-3">
        <span className="text-3xl font-semibold tracking-tight text-white">
          {sleep?.durationMin ? fmtDurationHuman(sleep.durationMin) : '—'}
        </span>
        {sleep?.quality ? (
          <span className="pb-1 text-xs text-slate-500">{sleepQualityLabel(sleep.quality)}</span>
        ) : null}
      </div>

      {total > 0 ? (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-800">
            {stages.map((stage) =>
              stage.value > 0 ? (
                <div
                  key={stage.key}
                  style={{
                    width: `${(stage.value / total) * 100}%`,
                    backgroundColor: STAGE_COLORS[stage.key],
                  }}
                  title={`${stage.label}: ${fmtDurationHuman(stage.value)}`}
                />
              ) : null,
            )}
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {stages.map((stage) => (
              <li key={stage.key} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[stage.key] }}
                  />
                  {stage.label}
                </span>
                <span className="text-slate-300">{fmtDurationHuman(stage.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-xs text-slate-500">Brak szczegółów faz snu z Garmina.</p>
      )}
    </Card>
  )
}

export function AcrCard({ summary }: { summary: HealthSummary }) {
  const acr = summary.acr
  const zone = acrZone(acr)
  const position =
    acr === null ? null : Math.min(100, Math.max(0, ((acr - 0.5) / (1.8 - 0.5)) * 100))

  return (
    <Card className="card-pad">
      <CardHeader
        title="ACR"
        hint="Stosunek obciążenia"
        icon={<ShieldAlert className="h-4 w-4" />}
        action={<Badge tone={zone.tone}>{zone.label}</Badge>}
      />

      <div className="mt-4 flex items-end gap-2">
        <span className="text-3xl font-semibold tracking-tight text-white">
          {acr !== null ? fmtNumber(acr, 2) : '—'}
        </span>
        <span className="pb-1 text-xs text-slate-500">stosunek</span>
      </div>

      <div className="mt-4">
        <div className="relative h-2.5 overflow-hidden rounded-full">
          <div className="absolute inset-0 flex">
            <div className="h-full bg-slate-600/60" style={{ width: '23%' }} />
            <div className="h-full bg-emerald-500/70" style={{ width: '38.5%' }} />
            <div className="h-full bg-amber-500/70" style={{ width: '15.5%' }} />
            <div className="h-full bg-rose-500/70" style={{ width: '23%' }} />
          </div>
          {position !== null ? (
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: `calc(${position}% - 2px)` }}
            />
          ) : null}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-slate-600">
          <span>0.5</span>
          <span>0.8</span>
          <span>1.3</span>
          <span>1.5</span>
          <span>1.8</span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">{zone.description}</p>

      <div className="mt-3 flex gap-4 border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
        <span>
          Ostre: <span className="text-slate-300">{summary.acuteLoad ?? '—'}</span>
        </span>
        <span>
          Chroniczne: <span className="text-slate-300">{summary.chronicLoad ?? '—'}</span>
        </span>
      </div>
    </Card>
  )
}

export function PhysiologyCard({ summary }: { summary: HealthSummary }) {
  const hrv = hrvZone(summary.hrv?.status)
  const rows = [
    { label: 'VO2max', value: summary.vo2max !== null ? fmtNumber(summary.vo2max, 1) : '—', unit: 'ml/kg/min' },
    { label: 'RHR', value: summary.restingHr !== null ? fmtNumber(summary.restingHr, 0) : '—', unit: 'uderzeń/min' },
    { label: 'Status', value: trainingStatusLabel(summary.trainingStatus), unit: 'Garmin' },
    { label: 'Status HRV', value: hrv.label, unit: 'baza' },
  ]

  return (
    <Card className="card-pad">
      <CardHeader
        title="Fizjologia"
        hint="Wskaźniki bazowe"
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <dl className="mt-3 divide-y divide-slate-800/70">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-xs text-slate-500">{row.label}</dt>
            <dd className={cn('text-right text-sm font-medium text-slate-200')}>
              {row.value}
              <span className="ml-1.5 text-[10px] font-normal text-slate-600">{row.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
