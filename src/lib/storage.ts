import type { Settings } from '../types'

const PREFIX = 'garmin-pulpit:'
const SETTINGS_KEY = `${PREFIX}settings.v1`

export const DEFAULT_SETTINGS: Settings = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').trim(),
  apiKey: '',
  demoMode: false,
  autoRefresh: true,
  geminiApiKey: (import.meta.env.VITE_GEMINI_API_KEY ?? '').trim(),
  geminiModel: (import.meta.env.VITE_GEMINI_MODEL ?? '').trim() || 'auto',
  athleteName: '',
  goals: { '5k': '', '10k': '', half: '', marathon: '' },
}

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    // Wycofane modele (1.x / 2.x) zastępujemy trybem „auto” — najnowszym dostępnym Flash.
    if (typeof parsed.geminiModel === 'string' && /^gemini-(1|2)\./.test(parsed.geminiModel.trim())) {
      parsed.geminiModel = 'auto'
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      goals: { ...DEFAULT_SETTINGS.goals, ...(parsed.goals ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage może być zablokowany (tryb prywatny) — aplikacja działa dalej.
  }
}

export function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${key}`)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeCache(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    // ignorujemy limit storage
  }
}

export function removeCache(key: string): void {
  try {
    window.localStorage.removeItem(`${PREFIX}${key}`)
  } catch {
    // ignorujemy
  }
}

export function clearAppCache(): void {
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(PREFIX))
    keys.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // ignorujemy
  }
}
