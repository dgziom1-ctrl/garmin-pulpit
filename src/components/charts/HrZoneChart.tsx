import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HrZoneEntry } from '../../lib/metrics'
import { fmtDuration } from '../../lib/format'
import { ChartTooltip } from './ChartTooltip'

export function HrZoneChart({ zones, height = 210 }: { zones: HrZoneEntry[]; height?: number }) {
  if (zones.every((zone) => zone.seconds === 0)) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-500">
        Garmin nie zwrócił stref tętna dla ostatnich aktywności.
      </div>
    )
  }

  const data = zones.map((zone) => ({
    zone: zone.zone,
    label: zone.label,
    percent: zone.percent,
    percentLabel: zone.percent > 0 ? `${zone.percent}%` : '',
    seconds: zone.seconds,
    color: zone.color,
  }))

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 42, left: 0, bottom: 0 }}
          barCategoryGap="26%"
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="zone"
            width={34}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }}
            content={
              <ChartTooltip
                formatter={(value, _name, entry) => {
                  const seconds = Number(entry.payload?.seconds ?? 0)
                  return `${value}% (${fmtDuration(seconds)})`
                }}
              />
            }
          />
          <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry) => (
              <Cell key={entry.zone} fill={entry.color} fillOpacity={0.85} />
            ))}
            <LabelList dataKey="percentLabel" position="right" fill="#94a3b8" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
