import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Loader2,
  Moon,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { PlanDay, PlanDayType, TrainingPlan } from '../../types'
import { fmtDateShort, fmtDurationHuman } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { NoKeyCard } from './NoKeyCard'

const TYPE_META: Record<
  PlanDayType,
  { label: string; color: string; icon: LucideIcon }
> = {
  running: { label: 'Bieganie', color: '#34d399', icon: Footprints },
  strength: { label: 'FBW', color: '#818cf8', icon: Dumbbell },
  racket: { label: 'Rakietowe', color: '#22d3ee', icon: Trophy },
  cycling: { label: 'Rower', color: '#fbbf24', icon: Bike },
  rest: { label: 'Wolne', color: '#64748b', icon: Moon },
  mobility: { label: 'Mobilność', color: '#a78bfa', icon: Activity },
}

function intensityTone(intensity: string): 'emerald' | 'cyan' | 'amber' | 'slate' {
  const value = intensity.toLowerCase()
  if (value.includes('mocn') || value.includes('moc')) return 'amber'
  if (value.includes('śred') || value.includes('sred')) return 'cyan'
  if (value.includes('łatw') || value.includes('latw')) return 'emerald'
  return 'slate'
}

function PlanDayCard({ day }: { day: PlanDay }) {
  const meta = TYPE_META[day.type] ?? TYPE_META.rest
  const Icon = meta.icon
  const rest = day.type === 'rest'

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition',
        rest
          ? 'border-slate-800/60 bg-slate-900/30'
          : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: `${meta.color}14`,
              borderColor: `${meta.color}33`,
              color: meta.color,
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold capitalize text-slate-200">{day.day}</p>
            <p className="text-[10px] text-slate-500">{fmtDateShort(day.date)}</p>
          </div>
        </div>
        <Badge tone={intensityTone(day.intensity)}>{day.intensity}</Badge>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white">{day.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{day.details}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800/70 pt-2.5 text-[11px] text-slate-500">
        <span>{meta.label}</span>
        {day.durationMin > 0 ? <span>{fmtDurationHuman(day.durationMin)}</span> : null}
        {day.load > 0 ? <span>obc. {day.load}</span> : null}
      </div>
    </div>
  )
}

function PlanSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="skeleton h-40" />
      ))}
    </div>
  )
}

export function PlanView({
  plan,
  loading,
  error,
  hasKey,
  correction,
  onCorrectionChange,
  onGenerate,
  onOpenSettings,
}: {
  plan: TrainingPlan | null
  loading: boolean
  error: string | null
  hasKey: boolean
  correction: string
  onCorrectionChange: (value: string) => void
  onGenerate: () => void
  onOpenSettings: () => void
}) {
  if (!hasKey) return <NoKeyCard onOpenSettings={onOpenSettings} />

  const activeDays = plan?.days.filter((day) => day.type !== 'rest') ?? []
  const totalMinutes = plan?.days.reduce((sum, day) => sum + day.durationMin, 0) ?? 0
  const totalLoad = plan?.days.reduce((sum, day) => sum + day.load, 0) ?? 0

  return (
    <div className="space-y-4">
      <Card className="card-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/80">
              Plan na bieżący tydzień
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {plan?.focus ?? 'Dopasuj plan do aktualnej formy'}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              {plan?.summary ??
                'Wygeneruj 7-dniowy plan na podstawie gotowości, HRV, snu, ACR i TSB. Plan uwzględnia bieganie, FBW i sporty rakietowe.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="btn-primary shrink-0 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {plan ? (correction.trim() ? 'Skoryguj plan' : 'Wygeneruj ponownie') : 'Wygeneruj plan'}
          </button>
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="plan-correction">
            Korekta planu (opcjonalnie)
          </label>
          <textarea
            id="plan-correction"
            value={correction}
            onChange={(event) => onCorrectionChange(event.target.value)}
            rows={2}
            placeholder="np. przełóż długie wybieganie na sobotę, w piątek tylko mobilność, mniej obciążenia w nogach"
            className="input resize-none text-xs"
          />
          <p className="mt-1 text-[10px] text-slate-500">
            Wskazówki trafiają do trenera przy kolejnym generowaniu planu.
          </p>
        </div>

        {plan ? (
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-800/70 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Sesje</p>
              <p className="text-lg font-semibold text-white">{activeDays.length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Objętość</p>
              <p className="text-lg font-semibold text-white">{fmtDurationHuman(totalMinutes)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Suma obciążenia</p>
              <p className="text-lg font-semibold text-white">{totalLoad}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </p>
        ) : null}
      </Card>

      {loading && !plan ? (
        <PlanSkeleton />
      ) : plan ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plan.days.map((day) => (
            <PlanDayCard key={`${day.date}-${day.title}`} day={day} />
          ))}
        </div>
      ) : (
        <Card className="card-pad">
          <EmptyState
            icon={Sparkles}
            title="Brak wygenerowanego planu"
            description="Kliknij „Wygeneruj plan”, aby trener AI przygotował tydzień na podstawie Twoich metryk."
          />
        </Card>
      )}
    </div>
  )
}
