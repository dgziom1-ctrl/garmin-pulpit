import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { RaceDistanceKey, Settings } from '../types'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../lib/storage'

interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  updateGoal: (key: RaceDistanceKey, value: string) => void
  reset: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const updateGoal = useCallback((key: RaceDistanceKey, value: string) => {
    setSettings((current) => ({
      ...current,
      goals: { ...current.goals, [key]: value },
    }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value = useMemo(
    () => ({ settings, update, updateGoal, reset }),
    [settings, update, updateGoal, reset],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings musi być użyte wewnątrz SettingsProvider')
  return context
}
