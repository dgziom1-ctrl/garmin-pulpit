import { RefreshCw, Settings } from 'lucide-react'
import type { Route } from '../../hooks/useHashRoute'
import { ROUTE_META } from '../../hooks/useHashRoute'
import { useHealthData } from '../../context/HealthDataContext'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { fmtDateLong, fmtRelative } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { InstallPWAButton } from '../InstallPWAButton'
import { LogoMark } from './Logo'

function ConnectionStatus() {
  const { source, error, loading, updatedAt } = useHealthData()
  const online = useOnlineStatus()

  if (!online) {
    return (
      <Badge tone="slate" dot>
        Offline
      </Badge>
    )
  }
  if (loading && !updatedAt) {
    return (
      <Badge tone="slate" dot>
        Łączenie…
      </Badge>
    )
  }
  if (source === 'demo') {
    return (
      <span title={error ?? 'Tryb demonstracyjny'}>
        <Badge tone="amber" dot>
          Demo
        </Badge>
      </span>
    )
  }
  return (
    <Badge tone="emerald" dot>
      Online
    </Badge>
  )
}

export function TopBar({
  route,
  navigate,
}: {
  route: Route
  navigate: (route: Route) => void
}) {
  const { sync, syncing, updatedAt } = useHealthData()
  const meta = ROUTE_META[route]

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-slate-800/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
          <LogoMark className="h-8 w-8 rounded-lg" />
          <span className="truncate text-sm font-semibold text-white">{meta.label}</span>
        </div>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-medium text-slate-200 first-letter:uppercase">
            {fmtDateLong(new Date())}
          </p>
          <p className="text-[11px] text-slate-500">
            {meta.label} · aktualizacja {fmtRelative(updatedAt)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ConnectionStatus />
          <InstallPWAButton compact variant="ghost" className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="btn-ghost h-9 w-9 p-0"
            title="Synchronizuj z Garminem"
            aria-label="Synchronizuj z Garminem"
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          </button>
          <button
            type="button"
            onClick={() => navigate('ustawienia')}
            className="btn-ghost h-9 w-9 p-0"
            title="Ustawienia"
            aria-label="Ustawienia"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
