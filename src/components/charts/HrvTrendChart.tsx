import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyHealth } from '../../types'
import { fmtDateShort } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function HrvTrendChart({ history, height = 210 }: { history: DailyHealth[]; height?: number }) {
  const data = history
    .slice(-21)
    .filter((day) => day.hrv?.nightlyAvg !== null && day.hrv?.nightlyAvg !== undefined)
    .map((day) => ({
      label: fmtDateShort(day.date),
      noc: day.hrv?.nightlyAvg ?? null,
      srednia: day.hrv?.weeklyAvg ?? null,
      dol: day.hrv?.baselineLow ?? null,
      gora: day.hrv?.baselineHigh ?? null,
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak danych HRV.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={18} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={42} domain={['dataMin - 6', 'dataMax + 6']} />
          <Tooltip content={<ChartTooltip formatter={(value) => `${value} ms`} />} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 6 }}
          />
          <Line
            type="monotone"
            dataKey="dol"
            name="Dolna granica"
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth={1}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="gora"
            name="Górna granica"
            stroke="#475569"
            strokeDasharray="4 4"
            strokeWidth={1}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="noc"
            name="HRV noc"
            stroke="#34d399"
            strokeWidth={2.2}
            dot={{ r: 2, strokeWidth: 0, fill: '#34d399' }}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="srednia"
            name="Średnia 7 dni"
            stroke="#22d3ee"
            strokeWidth={1.6}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
