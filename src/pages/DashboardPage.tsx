import { BatteryCharging, HeartPulse, Moon, RefreshCw, Stethoscope } from 'lucide-react'
import type { Route } from '../hooks/useHashRoute'
import { useHealthData } from '../context/HealthDataContext'
import { acrZone, hrvZone, trainingStatusLabel } from '../lib/metrics'
import { fmtDurationHuman, fmtNumber, fmtRelative } from '../lib/format'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { ReadinessCard } from '../components/dashboard/ReadinessCard'
import { AcrCard, BodyBatteryCard, PhysiologyCard, SleepCard } from '../components/dashboard/MetricCards'
import { AiInsightCard } from '../components/dashboard/AiInsightCard'
import { RecentActivities } from '../components/activities/RecentActivities'
import { HrvTrendChart } from '../components/charts/HrvTrendChart'
import { InstallPWAButton } from '../components/InstallPWAButton'

export function DashboardPage({ navigate }: { navigate: (route: Route) => void }) {
  const { summary, history, activities, bodyBattery, loading, refresh, updatedAt, error } =
    useHealthData()

  if (loading && !summary) {
    return (
      <>
        <PageHeader
          title="Pulpit zdrowia"
          eyebrow="Dziś"
          subtitle="Ładowanie danych z Garmina…"
        />
        <DashboardSkeleton />
      </>
    )
  }

  if (!summary) {
    return (
      <Card className="card-pad">
        <EmptyState
          icon={HeartPulse}
          title="Brak danych zdrowotnych"
          description={error ?? 'Nie udało się pobrać danych. Sprawdź połączenie z API w ustawieniach.'}
          action={
            <button type="button" onClick={() => void refresh()} className="btn-primary text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Spróbuj ponownie
            </button>
          }
        />
      </Card>
    )
  }

  const hrvInfo = hrvZone(summary.hrv?.status)
  const acrInfo = acrZone(summary.acr)
  const sleep = summary.sleep
  const battery = summary.bodyBattery
  const hrv = summary.hrv
  const today = history[history.length - 1]
  const batteryLevel = battery?.current ?? null
  const batteryTone =
    batteryLevel === null
      ? 'slate'
      : batteryLevel >= 60
        ? 'emerald'
        : batteryLevel >= 35
          ? 'cyan'
          : batteryLevel >= 20
            ? 'amber'
            : 'rose'

  return (
    <>
      <PageHeader
        eyebrow={`Aktualizacja ${fmtRelative(updatedAt)}`}
        title="Pulpit zdrowia"
        subtitle="Gotowość, regeneracja i obciążenie na podstawie ostatniej nocy oraz historii treningu."
        actions={<InstallPWAButton compact variant="outline" />}
      />

      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <ReadinessCard summary={summary} />

          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <StatCard
              icon={BatteryCharging}
              label="Body Battery"
              value={battery?.current !== null && battery?.current !== undefined ? fmtNumber(battery.current, 0) : '—'}
              unit="/ 100"
              tone={batteryTone}
              hint={
                battery
                  ? `Zakres dnia ${battery.min ?? '—'}–${battery.max ?? '—'} · naładowano ${battery.charged ?? '—'}`
                  : 'Brak danych'
              }
            />
            <StatCard
              icon={HeartPulse}
              label="HRV noc"
              value={hrv?.nightlyAvg !== null && hrv?.nightlyAvg !== undefined ? fmtNumber(hrv.nightlyAvg, 0) : '—'}
              unit="ms"
              tone={hrvInfo.tone}
              hint={`${hrvInfo.label} · średnia 7 dni ${hrv?.weeklyAvg ?? '—'} ms`}
            />
            <StatCard
              icon={Moon}
              label="Sen"
              value={sleep?.score !== null && sleep?.score !== undefined ? fmtNumber(sleep.score, 0) : '—'}
              unit="/ 100"
              tone={(sleep?.score ?? 0) >= 80 ? 'emerald' : (sleep?.score ?? 0) >= 60 ? 'cyan' : 'amber'}
              hint={
                sleep?.durationMin
                  ? `${fmtDurationHuman(sleep.durationMin)} · głęboki ${sleep.deepMin ?? '—'} min`
                  : 'Brak danych o śnie'
              }
            />
            <StatCard
              icon={Stethoscope}
              label="RHR"
              value={summary.restingHr !== null ? fmtNumber(summary.restingHr, 0) : '—'}
              unit="bpm"
              tone="indigo"
              hint={`VO2max ${summary.vo2max !== null ? fmtNumber(summary.vo2max, 1) : '—'} · ${acrInfo.label}`}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <BodyBatteryCard summary={summary} samples={bodyBattery} history={history} />
          <SleepCard summary={summary} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="card-pad lg:col-span-2">
            <CardHeader
              title="HRV — trend"
              hint="Nocny HRV vs średnia 7 dni i zakres bazowy"
              icon={<HeartPulse className="h-4 w-4" />}
              action={<Badge tone={hrvInfo.tone}>{hrvInfo.label}</Badge>}
            />
            <div className="mt-3">
              <HrvTrendChart history={history} height={220} />
            </div>
          </Card>
          <AcrCard summary={summary} />
          <PhysiologyCard summary={summary} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RecentActivities activities={activities} onShowAll={() => navigate('analityka')} />
          <AiInsightCard onOpenSettings={() => navigate('ustawienia')} />
        </div>

        {today ? (
          <p className="text-center text-[11px] text-slate-600">
            Dane z {today.date} · Status: {trainingStatusLabel(summary.trainingStatus)} ·{' '}
            {summary.steps ? `${fmtNumber(summary.steps, 0)} kroków` : 'brak kroków'}
          </p>
        ) : null}
      </div>
    </>
  )
}
