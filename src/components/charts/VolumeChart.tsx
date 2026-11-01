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
import type { WeekVolume } from '../../lib/metrics'
import { fmtDurationHuman } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function VolumeChart({ weeks, height = 230 }: { weeks: WeekVolume[]; height?: number }) {
  if (weeks.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak danych o objętości treningu.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={8} />
          <YAxis {...AXIS_PROPS} width={42} tickFormatter={(value) => `${Math.round(value / 60)}h`} />
          <Tooltip content={<ChartTooltip formatter={(value) => fmtDurationHuman(value)} />} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
          <Bar dataKey="running" name="Bieganie" stackId="vol" fill="#34d399" />
          <Bar dataKey="strength" name="FBW" stackId="vol" fill="#818cf8" />
          <Bar dataKey="racket" name="Rakietowe" stackId="vol" fill="#22d3ee" />
          <Bar dataKey="cycling" name="Rower" stackId="vol" fill="#fbbf24" />
          <Bar dataKey="other" name="Inne" stackId="vol" fill="#64748b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
