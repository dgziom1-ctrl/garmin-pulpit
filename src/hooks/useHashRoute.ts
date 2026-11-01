import { useCallback, useEffect, useState } from 'react'

export const ROUTES = ['pulpit', 'analityka', 'predykcje', 'trener', 'ustawienia'] as const
export type Route = (typeof ROUTES)[number]

export const ROUTE_META: Record<Route, { label: string; title: string; subtitle: string }> = {
  pulpit: {
    label: 'Pulpit',
    title: 'Pulpit zdrowia',
    subtitle: 'Gotowość, regeneracja i obciążenie z ostatniej nocy.',
  },
  analityka: {
    label: 'Analityka',
    title: 'Progresja i analityka',
    subtitle: 'Model TSB, obciążenie, objętość i strefy tętna.',
  },
  predykcje: {
    label: 'Predykcje',
    title: 'Predykcje i cele',
    subtitle: 'Szacowane czasy na 5 km, 10 km, półmaraton i maraton.',
  },
  trener: {
    label: 'Trener AI',
    title: 'Trener AI',
    subtitle: 'Plan tygodnia i czat oparty na Twoich danych z Garmina.',
  },
  ustawienia: {
    label: 'Ustawienia',
    title: 'Ustawienia',
    subtitle: 'Połączenie z API, klucz Gemini i instalacja PWA.',
  },
}

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  return (ROUTES as readonly string[]).includes(raw) ? (raw as Route) : 'pulpit'
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    const target = `#/${next}`
    if (window.location.hash !== target) {
      window.location.hash = target
    } else {
      setRoute(next)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { route, navigate }
}
