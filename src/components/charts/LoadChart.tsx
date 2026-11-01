import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyHealth } from '../../types'
import { fmtDateShort, fmtNumber } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function LoadChart({ history, height = 230 }: { history: DailyHealth[]; height?: number }) {
  const data = history.slice(-30).map((day) => ({
    label: fmtDateShort(day.date),
    acute: day.acuteLoad ?? 0,
    chronic: day.chronicLoad ?? 0,
    acr: day.acr ?? null,
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak danych obciążenia.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={24} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={42} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) => fmtNumber(value, 0)}
              />
            }
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
          <Bar
            dataKey="acute"
            name="Obciążenie ostre (7 dni)"
            fill="#fbbf24"
            fillOpacity={0.65}
            radius={[3, 3, 0, 0]}
            barSize={12}
          />
          <Line
            type="monotone"
            dataKey="chronic"
            name="Obciążenie chroniczne (42 dni)"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
