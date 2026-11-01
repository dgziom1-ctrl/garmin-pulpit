import type { ReactNode } from 'react'
import { AlertTriangle, Settings, Sparkles } from 'lucide-react'
import type { Route } from '../../hooks/useHashRoute'
import { useHealthData } from '../../context/HealthDataContext'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'

function DemoBanner({ navigate }: { navigate: (route: Route) => void }) {
  const { error } = useHealthData()
  const authError = Boolean(error && /\b(401|403)\b/.test(error))

  if (!error) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/60 bg-slate-800/30 px-3.5 py-2.5 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          Tryb demonstracyjny — dane są przykładowe.
        </span>
        <button
          type="button"
          onClick={() => navigate('ustawienia')}
          className="inline-flex items-center gap-1 font-medium text-emerald-300 hover:text-emerald-200"
        >
          <Settings className="h-3 w-3" />
          Wyłącz w ustawieniach
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
      <span className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          {authError
            ? 'API wymaga klucza dostępu — wyświetlam dane demonstracyjne.'
            : 'Brak połączenia z API — wyświetlam dane demonstracyjne.'}
          <span className="mt-0.5 block text-[11px] text-amber-300/70">{error}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={() => navigate('ustawienia')}
        className="inline-flex items-center gap-1 font-medium text-amber-100 hover:text-white"
      >
        <Settings className="h-3 w-3" />
        {authError ? 'Wpisz klucz API' : 'Sprawdź połączenie'}
      </button>
    </div>
  )
}

export function AppShell({
  route,
  navigate,
  children,
}: {
  route: Route
  navigate: (route: Route) => void
  children: ReactNode
}) {
  const { source } = useHealthData()

  return (
    <div className="min-h-screen">
      <Sidebar route={route} navigate={navigate} />

      <div className="lg:pl-64">
        <TopBar route={route} navigate={navigate} />
        <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {source === 'demo' ? <DemoBanner navigate={navigate} /> : null}
          <main>{children}</main>
          <footer className="mt-10 hidden border-t border-slate-800/60 pt-4 text-[11px] text-slate-600 lg:block">
            Garmin Pulpit · dane pochodzą z Garmin Connect · aplikacja nie zastępuje porady
            medycznej.
          </footer>
        </div>
      </div>

      <BottomNav route={route} navigate={navigate} />
    </div>
  )
}
