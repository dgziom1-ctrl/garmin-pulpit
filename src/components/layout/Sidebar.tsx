import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Settings, Sparkles, Target, TrendingUp } from 'lucide-react'
import type { Route } from '../../hooks/useHashRoute'
import { ROUTE_META } from '../../hooks/useHashRoute'
import { cn } from '../../lib/cn'
import { fmtRelative } from '../../lib/format'
import { useHealthData } from '../../context/HealthDataContext'
import { Logo } from './Logo'

export const NAV_ITEMS: Array<{ route: Route; label: string; icon: LucideIcon }> = [
  { route: 'pulpit', label: 'Pulpit', icon: LayoutDashboard },
  { route: 'analityka', label: 'Analityka', icon: TrendingUp },
  { route: 'predykcje', label: 'Predykcje', icon: Target },
  { route: 'trener', label: 'Trener AI', icon: Sparkles },
  { route: 'ustawienia', label: 'Ustawienia', icon: Settings },
]

export function Sidebar({
  route,
  navigate,
}: {
  route: Route
  navigate: (route: Route) => void
}) {
  const { source, updatedAt, loading } = useHealthData()
  const connecting = loading && !updatedAt

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800/70 bg-ink-950/80 px-4 py-5 backdrop-blur lg:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-8 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = route === item.route
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={cn('nav-item w-full', active && 'nav-item-active')}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-emerald-300' : 'text-slate-500')} />
              {item.label}
              {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" /> : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                connecting ? 'bg-slate-400' : source === 'live' ? 'bg-emerald-400' : 'bg-amber-400',
              )}
            />
            <span className="font-medium text-slate-300">
              {connecting ? 'Łączenie z API…' : source === 'live' ? 'Dane na żywo' : 'Tryb demo'}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            {ROUTE_META[route].label} · aktualizacja {fmtRelative(updatedAt)}
          </p>
        </div>
        <p className="px-1 text-[10px] leading-relaxed text-slate-600">
          Dane z Garmin Connect. Aplikacja nie zastępuje porady medycznej.
        </p>
      </div>
    </aside>
  )
}
