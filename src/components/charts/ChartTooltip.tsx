export interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  formatter?: (value: number, name: string, entry: TooltipEntry) => string
  labelFormatter?: (label: string | number) => string
}

export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 shadow-2xl backdrop-blur">
      {label !== undefined ? (
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const numeric = typeof entry.value === 'number' ? entry.value : Number(entry.value)
          const name = String(entry.name ?? entry.dataKey ?? '')
          const value = formatter
            ? formatter(Number.isFinite(numeric) ? numeric : 0, name, entry)
            : String(entry.value ?? '—')
          return (
            <div key={index} className="flex items-center justify-between gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: entry.color ?? '#94a3b8' }}
                />
                {name}
              </span>
              <span className="font-medium text-slate-100">{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
