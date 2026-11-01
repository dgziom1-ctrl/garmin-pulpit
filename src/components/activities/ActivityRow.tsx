import type { Activity } from '../../types'
import { activityPace, SPORT_META } from '../../lib/metrics'
import { fmtDateShort, fmtDistanceShort, fmtDuration, fmtNumber, fmtPace } from '../../lib/format'
import { cn } from '../../lib/cn'
import { SPORT_ICON } from './sportIcon'

export function ActivityRow({ activity, className }: { activity: Activity; className?: string }) {
  const meta = SPORT_META[activity.sport]
  const Icon = SPORT_ICON[activity.sport]
  const pace = activity.sport === 'running' ? activityPace(activity) : null

  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: `${meta.color}14`,
          borderColor: `${meta.color}33`,
          color: meta.color,
        }}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{activity.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {fmtDateShort(activity.startTime)} · {meta.label}
          {activity.distanceM ? ` · ${fmtDistanceShort(activity.distanceM)}` : ''}
          {pace ? ` · ${fmtPace(pace)}` : ''}
          {activity.avgHr ? ` · ${fmtNumber(activity.avgHr, 0)} bpm` : ''}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-slate-300">{fmtDuration(activity.durationSec)}</p>
        <p className="text-[10px] text-slate-600">
          {activity.trainingLoad ? `obc. ${activity.trainingLoad}` : '—'}
        </p>
      </div>
    </div>
  )
}
