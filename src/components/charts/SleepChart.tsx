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
import type { SleepNight } from '../../lib/metrics'
import { fmtDateShort, fmtDurationHuman } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function SleepChart({ nights, height = 220 }: { nights: SleepNight[]; height?: number }) {
  const data = nights.map((night) => ({
    label: fmtDateShort(night.date),
    deep: night.deep,
    rem: night.rem,
    light: night.light,
    awake: night.awake,
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak danych o fazach snu.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={14} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={42} tickFormatter={(value) => `${Math.round(value / 60)}h`} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) => fmtDurationHuman(value)}
              />
            }
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
          <Bar dataKey="deep" name="Głęboki" stackId="sen" fill="#6366f1" />
          <Bar dataKey="rem" name="REM" stackId="sen" fill="#22d3ee" />
          <Bar dataKey="light" name="Lekki" stackId="sen" fill="#334155" />
          <Bar dataKey="awake" name="Czuwanie" stackId="sen" fill="#f43f5e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
