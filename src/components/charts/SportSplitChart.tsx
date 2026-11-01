import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { SportSplitEntry } from '../../lib/metrics'
import { fmtDurationHuman } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'

export function SportSplitChart({
  split,
  height = 190,
}: {
  split: SportSplitEntry[]
  height?: number
}) {
  if (split.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak aktywności w wybranym okresie.
      </div>
    )
  }

  const totalMinutes = split.reduce((sum, entry) => sum + entry.minutes, 0)
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10

  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={split}
              dataKey="minutes"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              stroke="none"
            >
              {split.map((entry) => (
                <Cell key={entry.sport} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={<ChartTooltip formatter={(value) => fmtDurationHuman(value)} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-white">{totalHours}h</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">łącznie</span>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5">
        {split.map((entry) => (
          <li key={entry.sport} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.label}
              <span className="text-slate-600">· {entry.count}</span>
            </span>
            <span className="text-slate-300">
              {entry.percent}% <span className="text-slate-600">/ {fmtDurationHuman(entry.minutes)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
