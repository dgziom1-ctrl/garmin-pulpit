import type { Route } from '../../hooks/useHashRoute'
import { cn } from '../../lib/cn'
import { NAV_ITEMS } from './Sidebar'

export function BottomNav({
  route,
  navigate,
}: {
  route: Route
  navigate: (route: Route) => void
}) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-ink-950/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = route === item.route
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition',
                active ? 'text-emerald-300' : 'text-slate-500',
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-12 items-center justify-center rounded-full transition',
                  active && 'bg-emerald-400/10',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
