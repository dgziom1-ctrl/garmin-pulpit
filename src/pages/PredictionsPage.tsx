import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, Target, TrendingUp } from 'lucide-react'
import { useHealthData } from '../context/HealthDataContext'
import { useSettings } from '../context/SettingsContext'
import { predictRaces } from '../lib/metrics'
import {
  fmtNumber,
  fmtPace,
  fmtRaceTime,
  parseTimeToSeconds,
} from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ChartTooltip } from '../components/charts/ChartTooltip'
import { Vo2maxChart } from '../components/charts/Vo2maxChart'
import { AXIS_PROPS, GRID_PROPS } from '../components/charts/theme'
import { cn } from '../lib/cn'

function confidenceTone(confidence: 'wysoka' | 'średnia' | 'niska') {
  return confidence === 'wysoka' ? 'emerald' : confidence === 'średnia' ? 'cyan' : 'amber'
}

export function PredictionsPage() {
  const { summary, history, activities } = useHealthData()
  const { settings, updateGoal } = useSettings()

  const predictions = useMemo(
    () => predictRaces(summary?.vo2max, activities),
    [summary?.vo2max, activities],
  )

  const chartData = predictions.map((prediction) => {
    const goalSeconds = parseTimeToSeconds(settings.goals[prediction.key] ?? '')
    return {
      label: prediction.label,
      prognoza: prediction.seconds ? Math.round((prediction.seconds / 60) * 10) / 10 : null,
      cel: goalSeconds ? Math.round((goalSeconds / 60) * 10) / 10 : null,
    }
  })

  const hasGoals = predictions.some((prediction) => parseTimeToSeconds(settings.goals[prediction.key] ?? ''))

  return (
    <>
      <PageHeader
        eyebrow="Predykcje"
        title="Predykcje i cele"
        subtitle="Szacowane czasy na podstawie najlepszych biegów i VO2max. Wpisz cel, aby zobaczyć różnicę."
        actions={
          <Badge tone="violet" dot>
            VO2max {summary?.vo2max !== null && summary?.vo2max !== undefined ? fmtNumber(summary.vo2max, 1) : '—'}
          </Badge>
        }
      />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {predictions.map((prediction) => {
            const goalRaw = settings.goals[prediction.key] ?? ''
            const goalSeconds = parseTimeToSeconds(goalRaw)
            const invalid = goalRaw.trim().length > 0 && goalSeconds === null
            const delta = goalSeconds !== null && prediction.seconds !== null ? prediction.seconds - goalSeconds : null
            const deltaTone =
              delta === null
                ? 'slate'
                : delta <= 0
                  ? 'emerald'
                  : delta <= 120
                    ? 'cyan'
                    : delta <= 300
                      ? 'amber'
                      : 'rose'

            return (
              <Card key={prediction.key} className="card-pad flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {prediction.label}
                  </span>
                  <Badge tone={confidenceTone(prediction.confidence)}>{prediction.confidence}</Badge>
                </div>

                <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {prediction.seconds ? fmtRaceTime(prediction.seconds) : '—'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {prediction.paceSecPerKm ? `${fmtPace(prediction.paceSecPerKm)} · ` : ''}
                  {prediction.source === 'activity'
                    ? 'na bazie aktywności'
                    : prediction.source === 'vo2max'
                      ? 'model VO2max'
                      : 'brak danych'}
                </p>

                <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-600">
                  {prediction.basis}
                </p>

                <div className="mt-auto pt-4">
                  <label className="label" htmlFor={`goal-${prediction.key}`}>
                    Twój cel
                  </label>
                  <input
                    id={`goal-${prediction.key}`}
                    type="text"
                    inputMode="numeric"
                    placeholder={`np. ${prediction.placeholder}`}
                    value={goalRaw}
                    onChange={(event) => updateGoal(prediction.key, event.target.value)}
                    className={cn('input', invalid && 'border-rose-500/60 focus:border-rose-400')}
                  />
                  {invalid ? (
                    <p className="mt-1 text-[10px] text-rose-300">
                      Format: mm:ss lub hh:mm:ss (np. 1:45:00).
                    </p>
                  ) : delta !== null ? (
                    <p className="mt-1.5 text-[11px]">
                      <span
                        className={cn(
                          'font-medium',
                          deltaTone === 'emerald'
                            ? 'text-emerald-300'
                            : deltaTone === 'cyan'
                              ? 'text-cyan-300'
                              : deltaTone === 'amber'
                                ? 'text-amber-300'
                                : 'text-rose-300',
                        )}
                      >
                        {delta <= 0
                          ? `${fmtRaceTime(Math.abs(delta))} zapasu`
                          : `${fmtRaceTime(delta)} do celu`}
                      </span>
                      <span className="text-slate-600"> · tempo {fmtPace(prediction.paceSecPerKm)}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[10px] text-slate-600">Brak prognozy dla tej odległości.</p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-pad lg:col-span-2">
            <CardHeader
              title="Prognoza vs cel"
              hint="Porównanie szacowanego czasu z wpisanym celem (w minutach)"
              icon={<Target className="h-4 w-4" />}
              action={
                <Badge tone={hasGoals ? 'emerald' : 'slate'}>
                  {hasGoals ? 'cele aktywne' : 'wpisz cel'}
                </Badge>
              }
            />
            <div className="mt-3" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis dataKey="label" {...AXIS_PROPS} />
                  <YAxis
                    {...AXIS_PROPS}
                    width={52}
                    tickFormatter={(value) => `${Math.round(Number(value))} min`}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value) => fmtRaceTime(Math.round(value * 60))}
                      />
                    }
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
                  />
                  <Bar dataKey="prognoza" name="Prognoza" fill="#34d399" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="cel" name="Cel" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="card-pad">
            <CardHeader
              title="VO2max — trend"
              hint="Ostatnie 90 dni"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <div className="mt-3">
              <Vo2maxChart history={history} height={260} />
            </div>
          </Card>
        </div>

        <Card className="card-pad">
          <CardHeader
            title="Jak liczone są predykcje?"
            hint="Metodyka i ograniczenia"
            icon={<Info className="h-4 w-4" />}
          />
          <div className="mt-3 grid gap-4 text-xs leading-relaxed text-slate-400 sm:grid-cols-2">
            <div className="space-y-2">
              <p>
                <span className="font-medium text-slate-200">Model Danielsa (VO2max).</span> Z
                aktualnego VO2max wyznaczamy tempo, które teoretycznie utrzymasz na dystansie —
                z uwzględnieniem spadku intensywności w czasie.
              </p>
              <p>
                <span className="font-medium text-slate-200">Wzór Riegla (aktywności).</span> Dla
                ostatnich biegów 2–50 km przeliczamy czas na docelowy dystans ze współczynnikiem
                1.06. Im bliżej siebie dystanse, tym wyższa wiarygodność.
              </p>
            </div>
            <div className="space-y-2">
              <p>
                <span className="font-medium text-slate-200">Priorytet danych.</span> Jeśli jest
                świeży bieg w podobnym zakresie (do 2× dystansu), używamy go zamiast modelu VO2max.
                Stare wyniki (&gt; 150 dni) obniżają pewność.
              </p>
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-amber-200/80">
                Predykcje to szacunek treningowy, nie gwarancja wyniku. Na czas startu wpływają
                trasa, pogoda, temperatura i taktyka. Najlepszą kalibrację daje start kontrolny na
                5 km lub 10 km.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
