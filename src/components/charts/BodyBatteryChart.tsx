import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BodyBatterySample, DailyHealth } from '../../types'
import { fmtClock, fmtDateShort } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'
import { AXIS_PROPS, GRID_PROPS } from './theme'

interface BodyBatteryChartProps {
  samples: BodyBatterySample[]
  history: DailyHealth[]
  height?: number
}

export function BodyBatteryChart({ samples, history, height = 200 }: BodyBatteryChartProps) {
  const intraday = samples.length >= 2
  const data = intraday
    ? samples.map((sample) => ({
        label: fmtClock(sample.time),
        level: sample.level,
      }))
    : history.slice(-14).map((day) => ({
        label: fmtDateShort(day.date),
        level: day.bodyBattery?.current ?? 0,
      }))

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Brak danych Body Battery.
      </div>
    )
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="bodyBatteryFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="label"
            {...AXIS_PROPS}
            minTickGap={intraday ? 46 : 12}
            interval="preserveStartEnd"
          />
          <YAxis domain={[0, 100]} {...AXIS_PROPS} width={42} />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(value) => `${Math.round(value)}/100`}
                labelFormatter={(label) => (intraday ? `Godzina ${label}` : String(label))}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="level"
            name="Body Battery"
            stroke="#34d399"
            strokeWidth={2}
            fill="url(#bodyBatteryFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
