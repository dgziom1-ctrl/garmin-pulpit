import { useMemo, useState } from 'react'
import { Flame, Info, ListChecks, Moon, ShieldAlert, TrendingUp, Zap } from 'lucide-react'
import { useHealthData } from '../context/HealthDataContext'
import {
  acrZone,
  aggregateHrZones,
  computeTsb,
  loadSummary,
  sleepSeries,
  sportSplit,
  tsbZone,
  weeklyVolume,
} from '../lib/metrics'
import { addDays, fmtNumber, parseLocalDate } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { EmptyState } from '../components/ui/EmptyState'
import { TsbChart } from '../components/charts/TsbChart'
import { LoadChart } from '../components/charts/LoadChart'
import { VolumeChart } from '../components/charts/VolumeChart'
import { SportSplitChart } from '../components/charts/SportSplitChart'
import { HrZoneChart } from '../components/charts/HrZoneChart'
import { SleepChart } from '../components/charts/SleepChart'
import { ActivityTable } from '../components/activities/ActivityTable'
import { cn } from '../lib/cn'

const RANGES = [14, 30, 90] as const
type Range = (typeof RANGES)[number]

const TSB_ZONES = [
  { label: 'Przeciążenie', tone: 'rose' as const, range: '< −30' },
  { label: 'Zmęczenie', tone: 'amber' as const, range: '−30…−10' },
  { label: 'Neutralna', tone: 'slate' as const, range: '−10…+5' },
  { label: 'Optymalna', tone: 'emerald' as const, range: '+5…+25' },
  { label: 'Świeży', tone: 'cyan' as const, range: '> +25' },
]

export function AnalyticsPage() {
  const { summary, history, activities, tsb } = useHealthData()
  const [range, setRange] = useState<Range>(30)

  const tsbSeries = useMemo(() => {
    const source = tsb?.history?.length ? tsb.history : computeTsb(activities, 120)
    return source.slice(-range)
  }, [tsb, activities, range])

  const current = tsbSeries[tsbSeries.length - 1] ?? null
  const load = loadSummary(summary, current)
  const acrInfo = acrZone(load.acr)
  const formInfo = tsbZone(load.tsb)

  const rangeActivities = useMemo(() => {
    const cutoff = addDays(new Date(), -range)
    return activities.filter((activity) => parseLocalDate(activity.startTime) >= cutoff)
  }, [activities, range])

  const weeks = useMemo(
    () => weeklyVolume(rangeActivities, Math.min(12, Math.max(4, Math.round(range / 7)))),
    [rangeActivities, range],
  )
  const split = useMemo(() => sportSplit(rangeActivities), [rangeActivities])
  const zones = useMemo(() => aggregateHrZones(rangeActivities), [rangeActivities])
  const nights = useMemo(() => sleepSeries(history, Math.min(range, 30)), [history, range])

  return (
    <>
      <PageHeader
        eyebrow="Model TSB"
        title="Progresja i analityka"
        subtitle="Kondycja (CTL), zmęczenie (ATL), forma (TSB) oraz rozkład objętości i intensywności."
        actions={
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {RANGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRange(option)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  range === option
                    ? 'bg-slate-700/80 text-white'
                    : 'text-slate-400 hover:text-slate-200',
                )}
              >
                {option} dni
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={TrendingUp}
            label="Kondycja (CTL)"
            value={load.ctl !== null ? fmtNumber(load.ctl, 1) : '—'}
            tone="indigo"
            hint="42-dniowa średnia obciążenia"
          />
          <StatCard
            icon={Flame}
            label="Zmęczenie (ATL)"
            value={load.atl !== null ? fmtNumber(load.atl, 1) : '—'}
            tone="amber"
            hint="7-dniowa średnia obciążenia"
          />
          <StatCard
            icon={Zap}
            label="Forma (TSB)"
            value={
              load.tsb !== null ? `${load.tsb > 0 ? '+' : ''}${fmtNumber(load.tsb, 1)}` : '—'
            }
            tone={formInfo.tone}
            hint={formInfo.label}
          />
          <StatCard
            icon={ShieldAlert}
            label="ACR"
            value={load.acr !== null ? fmtNumber(load.acr, 2) : '—'}
            tone={acrInfo.tone}
            hint={acrInfo.label}
          />
        </div>

        <Card className="card-pad">
          <CardHeader
            title="Forma, zmęczenie i kondycja"
            hint="TSB = CTL − ATL. Wartości ujemne oznaczają chwilowe zmęczenie, dodatnie — rezerwy formy."
            icon={<TrendingUp className="h-4 w-4" />}
            action={
              <Badge tone={formInfo.tone} dot>
                {formInfo.label}
              </Badge>
            }
          />
          <div className="mt-3">
            <TsbChart series={tsbSeries} height={300} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800/70 pt-3">
            {TSB_ZONES.map((zone) => (
              <span
                key={zone.label}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px]',
                  zone.tone === 'rose'
                    ? 'border-rose-500/20 bg-rose-500/5 text-rose-300/80'
                    : zone.tone === 'amber'
                      ? 'border-amber-500/20 bg-amber-500/5 text-amber-300/80'
                      : zone.tone === 'emerald'
                        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300/80'
                        : zone.tone === 'cyan'
                          ? 'border-cyan-500/20 bg-cyan-500/5 text-cyan-300/80'
                          : 'border-slate-600/30 bg-slate-700/10 text-slate-400',
                )}
              >
                {zone.label}
                <span className="text-slate-500">{zone.range}</span>
              </span>
            ))}
          </div>
        </Card>

        <Card className="card-pad">
          <CardHeader
            title="Jak czytać: forma, zmęczenie i kondycja"
            hint="Trzy liczby, jedna decyzja treningowa"
            icon={<Info className="h-4 w-4" />}
          />
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
              <p className="font-semibold text-indigo-200">
                Kondycja (CTL) · {load.ctl !== null ? fmtNumber(load.ctl, 1) : '—'}
              </p>
              <p className="mt-1.5 leading-relaxed text-slate-400">
                Baza wytrenowania: średnie obciążenie z ostatnich 42 dni. Rośnie powoli i
                pokazuje, ile pracy organizm jest w stanie „unieść” na co dzień.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="font-semibold text-amber-200">
                Zmęczenie (ATL) · {load.atl !== null ? fmtNumber(load.atl, 1) : '—'}
              </p>
              <p className="mt-1.5 leading-relaxed text-slate-400">
                Krótkotrwałe zmęczenie: średnie obciążenie z ostatnich 7 dni. Reaguje szybko —
                rośnie po ciężkich dniach i spada po odpoczynku.
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-3',
                formInfo.tone === 'emerald'
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : formInfo.tone === 'cyan'
                    ? 'border-cyan-500/20 bg-cyan-500/5'
                    : formInfo.tone === 'amber'
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : formInfo.tone === 'rose'
                        ? 'border-rose-500/20 bg-rose-500/5'
                        : 'border-slate-700/40 bg-slate-800/20',
              )}
            >
              <p className="font-semibold text-slate-100">
                Forma (TSB) · {load.tsb !== null ? `${load.tsb > 0 ? '+' : ''}${fmtNumber(load.tsb, 1)}` : '—'}
              </p>
              <p className="mt-1.5 leading-relaxed text-slate-400">
                Różnica: kondycja minus zmęczenie. Ujemna = jesteś zmęczony, dodatnia = masz
                świeżość. Zakresy: poniżej −30 przeciążenie, −30…−10 zmęczenie, −10…+5
                neutralnie, +5…+25 optymalnie, powyżej +25 świeży.
              </p>
            </div>
          </div>
          <p className="mt-3 border-t border-slate-800/70 pt-3 text-[11px] leading-relaxed text-slate-500">
            Praktycznie: przy mocno ujemnym TSB nie dokładaj intensywności — postaw na sen i
            spokojny trening. Przy dodatnim TSB możesz zrobić akcent jakościowy. ACR (ostre /
            chroniczne) w zakresie 0,8–1,3 oznacza bezpieczne tempo progresji.
          </p>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-pad">
            <CardHeader
              title="Obciążenie ostre vs chroniczne"
              hint="Ostatnie 30 dni"
              icon={<Flame className="h-4 w-4" />}
            />
            <div className="mt-3">
              <LoadChart history={history.slice(-30)} height={240} />
            </div>
          </Card>

          <Card className="card-pad">
            <CardHeader
              title="Objętość tygodniowa"
              hint="Minuty według dyscypliny"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <div className="mt-3">
              <VolumeChart weeks={weeks} height={240} />
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-pad">
            <CardHeader title="Podział dyscyplin" hint={`Ostatnie ${range} dni`} />
            <div className="mt-3">
              <SportSplitChart split={split} height={190} />
            </div>
          </Card>

          <Card className="card-pad">
            <CardHeader title="Strefy tętna" hint="Udział czasu w strefach" />
            <div className="mt-3">
              <HrZoneChart zones={zones} height={210} />
            </div>
          </Card>
        </div>

        <Card className="card-pad">
          <CardHeader
            title="Sen — fazy"
            hint={`Ostatnie ${Math.min(range, 30)} nocy`}
            icon={<Moon className="h-4 w-4" />}
          />
          <div className="mt-3">
            <SleepChart nights={nights} height={240} />
          </div>
        </Card>

        <Card className="card-pad">
          <CardHeader
            title="Aktywności"
            hint={`${rangeActivities.length} sesji w wybranym okresie`}
            icon={<ListChecks className="h-4 w-4" />}
          />
          {rangeActivities.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Brak aktywności w tym okresie"
              description="Zmień zakres lub zsynchronizuj dane z Garminem."
            />
          ) : (
            <div className="mt-3">
              <ActivityTable activities={rangeActivities.slice(0, 30)} />
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
