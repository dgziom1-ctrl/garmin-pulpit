import type {
  BodyBatterySample,
  ConnectionTestResult,
  HealthSnapshot,
  HealthSummary,
} from '../types'
import {
  normalizeActivities,
  normalizeBodyBatterySamples,
  normalizeHistory,
  normalizeSummary,
  normalizeTsb,
} from './normalize'

const DEFAULT_TIMEOUT = 15000
const SYNC_TIMEOUT = 90000

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

export function normalizeBaseUrl(raw: string): string {
  let value = raw.trim().replace(/\/+$/, '')
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`
  return value.replace(/\/+$/, '')
}

function buildUrl(baseUrl: string, path: string): string {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) return path
  const root = normalized.replace(/\/api\/v1$/i, '')
  return `${root}${path}`
}

/** Nagłówek X-API-Key wysyłamy tylko wtedy, gdy użytkownik podał klucz. */
function authHeaders(apiKey: string): Record<string, string> {
  const key = apiKey.trim()
  return key ? { 'X-API-Key': key } : {}
}

async function request<T>(
  baseUrl: string,
  apiKey: string,
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(buildUrl(baseUrl, path), {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(apiKey),
        ...options.headers,
      },
    })

    if (!response.ok) {
      let detail = ''
      try {
        const payload = (await response.json()) as { detail?: unknown; message?: unknown }
        detail =
          typeof payload.detail === 'string'
            ? payload.detail
            : typeof payload.message === 'string'
              ? payload.message
              : JSON.stringify(payload)
      } catch {
        detail = await response.text().catch(() => '')
      }

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          `API odrzuciło klucz dostępu (${response.status})${detail ? `: ${detail}` : ''}. ` +
            'Uzupełnij pole „Klucz API (X-API-Key)” w Ustawieniach → Połączenie z API.',
          response.status,
        )
      }

      throw new ApiError(
        `API zwróciło błąd ${response.status}${detail ? `: ${detail}` : ''}`,
        response.status,
      )
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Przekroczono czas oczekiwania na odpowiedź API.')
    }
    throw new ApiError(
      'Nie udało się połączyć z API. Sprawdź adres, Tailscale i czy daemon działa.',
      undefined,
      { cause: error },
    )
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Pobiera komplet danych. Endpointy opcjonalne (TSB, Body Battery) nie blokują widoku,
 * ale awaria /health/summary oznacza brak danych live.
 */
export async function loadSnapshot(
  baseUrl: string,
  apiKey: string,
  days = 120,
): Promise<HealthSnapshot> {
  const [summary, history, activities, tsb, bodyBattery] = await Promise.allSettled([
    request<unknown>(baseUrl, apiKey, '/api/v1/health/summary'),
    request<unknown>(baseUrl, apiKey, `/api/v1/health/history?days=${days}`),
    request<unknown>(baseUrl, apiKey, '/api/v1/activities/recent?limit=60'),
    request<unknown>(baseUrl, apiKey, `/api/v1/tsb?days=${days}`),
    request<unknown>(baseUrl, apiKey, '/api/v1/health/body-battery/today'),
  ])

  if (summary.status === 'rejected') throw summary.reason

  const normalizedSummary = normalizeSummary(summary.value)
  const normalizedHistory =
    history.status === 'fulfilled' ? normalizeHistory(history.value) : []

  return {
    summary: normalizedSummary,
    history:
      normalizedHistory.length > 0
        ? normalizedHistory
        : [{ ...normalizedSummary } satisfies HealthSummary],
    activities: activities.status === 'fulfilled' ? normalizeActivities(activities.value) : [],
    tsb: tsb.status === 'fulfilled' ? normalizeTsb(tsb.value) : null,
    bodyBattery:
      bodyBattery.status === 'fulfilled'
        ? normalizeBodyBatterySamples(bodyBattery.value)
        : ([] as BodyBatterySample[]),
  }
}

export async function triggerSync(baseUrl: string, apiKey: string): Promise<void> {
  await request<unknown>(baseUrl, apiKey, '/api/v1/sync', { method: 'POST' }, SYNC_TIMEOUT)
}

export async function testConnection(
  baseUrl: string,
  apiKey: string,
): Promise<ConnectionTestResult> {
  const started = performance.now()
  try {
    await request<unknown>(baseUrl, apiKey, '/api/v1/health/summary', {}, 10000)
    return {
      ok: true,
      latencyMs: Math.round(performance.now() - started),
      message: 'Połączenie z API działa poprawnie.',
    }
  } catch (error) {
    return {
      ok: false,
      latencyMs: null,
      message: error instanceof Error ? error.message : 'Nieznany błąd połączenia.',
    }
  }
}
