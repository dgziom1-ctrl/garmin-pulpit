import { Activity } from 'lucide-react'
import { cn } from '../../lib/cn'

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950 shadow-glow',
        className,
      )}
    >
      <Activity className="h-5 w-5" strokeWidth={2.4} />
    </div>
  )
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-white">Garmin Pulpit</p>
        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">zdrowie i trening</p>
      </div>
    </div>
  )
}
