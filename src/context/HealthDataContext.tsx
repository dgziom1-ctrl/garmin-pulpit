import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type {
  Activity,
  BodyBatterySample,
  DailyHealth,
  HealthSummary,
  TsbResponse,
} from '../types'
import { loadSnapshot, triggerSync } from '../lib/api'
import { getDemoSnapshot } from '../lib/demo'
import { useSettings } from './SettingsContext'

export type DataSource = 'live' | 'demo'

interface HealthDataState {
  summary: HealthSummary | null
  history: DailyHealth[]
  activities: Activity[]
  tsb: TsbResponse | null
  bodyBattery: BodyBatterySample[]
  source: DataSource
  loading: boolean
  syncing: boolean
  error: string | null
  updatedAt: string | null
}

interface HealthDataContextValue extends HealthDataState {
  refresh: (options?: { silent?: boolean }) => Promise<void>
  sync: () => Promise<void>
}

const initialState: HealthDataState = {
  summary: null,
  history: [],
  activities: [],
  tsb: null,
  bodyBattery: [],
  source: 'live',
  loading: true,
  syncing: false,
  error: null,
  updatedAt: null,
}

const HealthDataContext = createContext<HealthDataContextValue | null>(null)

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Nieznany błąd pobierania danych.'
}

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const [state, setState] = useState<HealthDataState>(initialState)
  const requestRef = useRef(0)

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId
      if (!options?.silent) {
        setState((current) => ({ ...current, loading: true }))
      }

      if (settings.demoMode) {
        const snapshot = getDemoSnapshot()
        if (requestRef.current !== requestId) return
        setState({
          ...snapshot,
          source: 'demo',
          loading: false,
          syncing: false,
          error: null,
          updatedAt: new Date().toISOString(),
        })
        return
      }

      try {
        const snapshot = await loadSnapshot(settings.apiBaseUrl, settings.apiKey, 120)
        if (requestRef.current !== requestId) return
        setState({
          ...snapshot,
          source: 'live',
          loading: false,
          syncing: false,
          error: null,
          updatedAt: new Date().toISOString(),
        })
      } catch (error) {
        if (requestRef.current !== requestId) return
        const snapshot = getDemoSnapshot()
        setState({
          ...snapshot,
          source: 'demo',
          loading: false,
          syncing: false,
          error: errorMessage(error),
          updatedAt: new Date().toISOString(),
        })
      }
    },
    [settings.apiBaseUrl, settings.apiKey, settings.demoMode],
  )

  const sync = useCallback(async () => {
    if (settings.demoMode) {
      await refresh()
      return
    }
    setState((current) => ({ ...current, syncing: true, error: null }))
    try {
      await triggerSync(settings.apiBaseUrl, settings.apiKey)
      await refresh({ silent: true })
    } catch (error) {
      setState((current) => ({ ...current, syncing: false, error: errorMessage(error) }))
    }
  }, [refresh, settings.apiBaseUrl, settings.apiKey, settings.demoMode])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!settings.autoRefresh) return undefined

    const interval = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void refresh({ silent: true })
      },
      5 * 60 * 1000,
    )

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh({ silent: true })
    }
    const onOnline = () => void refresh({ silent: true })

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [settings.autoRefresh, refresh])

  const value = useMemo<HealthDataContextValue>(
    () => ({ ...state, refresh, sync }),
    [state, refresh, sync],
  )

  return <HealthDataContext.Provider value={value}>{children}</HealthDataContext.Provider>
}

export function useHealthData(): HealthDataContextValue {
  const context = useContext(HealthDataContext)
  if (!context) throw new Error('useHealthData musi być użyte wewnątrz HealthDataProvider')
  return context
}
