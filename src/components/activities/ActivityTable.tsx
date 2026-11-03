import type { Activity } from '../../types'
import { activityPace, SPORT_META } from '../../lib/metrics'
import {
  fmtClock,
  fmtDateShort,
  fmtDistanceShort,
  fmtDuration,
  fmtNumber,
  fmtPace,
  fmtSpeed,
} from '../../lib/format'
import { SPORT_ICON } from './sportIcon'

export function ActivityTable({ activities }: { activities: Activity[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-3 font-medium">Data</th>
            <th className="py-2 pr-3 font-medium">Godz.</th>
            <th className="py-2 pr-3 font-medium">Aktywność</th>
            <th className="py-2 pr-3 font-medium">Dystans</th>
            <th className="py-2 pr-3 font-medium">Czas</th>
            <th className="py-2 pr-3 font-medium">Tempo</th>
            <th className="py-2 pr-3 font-medium">HR</th>
            <th className="py-2 text-right font-medium">Obc.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {activities.map((activity) => {
            const meta = SPORT_META[activity.sport]
            const Icon = SPORT_ICON[activity.sport]
            const pace = activity.sport === 'running' ? activityPace(activity) : null
            const speed =
              activity.sport === 'cycling' && activity.distanceM && activity.durationSec > 0
                ? (activity.distanceM / 1000) / (activity.durationSec / 3600)
                : null
            return (
              <tr key={activity.id} className="text-slate-300 transition hover:bg-slate-800/30">
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-500">
                  {fmtDateShort(activity.startTime)}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-500">
                  {fmtClock(activity.startTime)}
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: meta.color }}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="max-w-[200px] truncate">{activity.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">
                  {activity.distanceM ? fmtDistanceShort(activity.distanceM) : '—'}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">
                  {fmtDuration(activity.durationSec)}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">
                  {pace ? fmtPace(pace) : speed ? fmtSpeed(speed) : '—'}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-slate-400">
                  {activity.avgHr ? `${fmtNumber(activity.avgHr, 0)} bpm` : '—'}
                </td>
                <td className="whitespace-nowrap py-2.5 text-right font-medium text-slate-300">
                  {activity.trainingLoad ? fmtNumber(activity.trainingLoad, 0) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
