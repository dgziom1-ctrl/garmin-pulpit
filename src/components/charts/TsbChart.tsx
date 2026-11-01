import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TsbPoint } from '../../types'
import { fmtDateShort, fmtNumber } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

export function TsbChart({ series, height = 280 }: { series: TsbPoint[]; height?: number }) {
  const data = series.map((point) => ({
    label: fmtDateShort(point.date),
    ctl: point.ctl,
    atl: point.atl,
    tsb: point.tsb,
  }))

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-500">
        Brak historii obciążenia do wyliczenia TSB.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="tsbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} minTickGap={26} interval="preserveStartEnd" />
          <YAxis {...AXIS_PROPS} width={42} />
          <Tooltip
            content={
              <ChartTooltip formatter={(value) => fmtNumber(value, 1)} />
            }
          />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 }}
          />
          <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="tsb"
            name="Forma (TSB)"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#tsbFill)"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ctl"
            name="Kondycja (CTL)"
            stroke="#818cf8"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="atl"
            name="Zmęczenie (ATL)"
            stroke="#fbbf24"
            strokeWidth={1.8}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
