import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyHealth } from '../../types'
import { fmtDateShort, fmtNumber } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function Vo2maxChart({ history, height = 210 }: { history: DailyHealth[]; height?: number }) {
  const data = history
    .slice(-90)
    .filter((day) => day.vo2max !== null && day.vo2max !== undefined)
    .map((day) => ({ label: fmtDateShort(day.date), vo2max: day.vo2max }))

  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Za mało danych, aby pokazać trend VO2max.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={30} interval="preserveStartEnd" />
          <YAxis
            {...AXIS_PROPS}
            width={42}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(value) => fmtNumber(Number(value), 0)}
          />
          <Tooltip content={<ChartTooltip formatter={(value) => fmtNumber(value, 1)} />} />
          <Line
            type="monotone"
            dataKey="vo2max"
            name="VO2max"
            stroke="#a78bfa"
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
