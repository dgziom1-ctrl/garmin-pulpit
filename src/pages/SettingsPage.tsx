import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Smartphone,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
import type { ConnectionTestResult } from '../types'
import { RACE_DISTANCES } from '../lib/metrics'
import { fmtDateTime, fmtRelative, todayISO } from '../lib/format'
import { testConnection } from '../lib/api'
import { checkForUpdate } from '../lib/pwa'
import { clearAppCache } from '../lib/storage'
import { useSettings } from '../context/SettingsContext'
import { useHealthData } from '../context/HealthDataContext'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { InstallPWAButton } from '../components/InstallPWAButton'
import { cn } from '../lib/cn'

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="card-pad">
      <CardHeader
        title={title}
        hint={description}
        icon={<Icon className="h-4 w-4" />}
      />
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          checked ? 'bg-emerald-500/80' : 'bg-slate-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

export function SettingsPage() {
  const { settings, update, updateGoal } = useSettings()
  const {
    summary,
    history,
    activities,
    tsb,
    bodyBattery,
    source,
    error,
    updatedAt,
    refresh,
    loading,
  } = useHealthData()
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyDraft, setApiKeyDraft] = useState(settings.apiKey)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)

  useEffect(() => {
    setApiKeyDraft(settings.apiKey)
  }, [settings.apiKey])

  const commitApiKey = () => {
    const next = apiKeyDraft.trim()
    if (next !== settings.apiKey) update({ apiKey: next })
    return next
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    const key = commitApiKey()
    try {
      const result = await testConnection(settings.apiBaseUrl, key)
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const checkUpdates = async () => {
    setCheckingUpdate(true)
    setUpdateMessage(null)
    try {
      const result = await checkForUpdate()
      setUpdateMessage(
        result === 'updated'
          ? 'Znaleziono nową wersję — aplikacja odświeży się automatycznie.'
          : result === 'current'
            ? 'Masz najnowszą wersję aplikacji.'
            : 'Sprawdzanie działa tylko w zbudowanej wersji (nie w trybie dev).',
      )
    } catch {
      setUpdateMessage('Nie udało się sprawdzić aktualizacji. Spróbuj ponownie później.')
    } finally {
      setCheckingUpdate(false)
    }
  }

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      source,
      summary,
      history,
      activities,
      tsb,
      bodyBattery,
      settings: { ...settings, apiKey: '', geminiApiKey: '' },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `garmin-pulpit-${todayISO()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    const confirmed = window.confirm(
      'Usunąć wszystkie dane lokalne (adres i klucz API, klucz Gemini, cele, plany i analizy)? Tej operacji nie można cofnąć.',
    )
    if (!confirmed) return
    clearAppCache()
    window.location.reload()
  }

  return (
    <>
      <PageHeader
        eyebrow="Konfiguracja"
        title="Ustawienia"
        subtitle="Połączenie z daemonem Garmina, klucz Gemini, profil i instalacja PWA."
        actions={
          <Badge tone={source === 'live' ? 'emerald' : 'amber'} dot>
            {source === 'live' ? 'API online' : 'tryb demo'}
          </Badge>
        }
      />

      <div className="space-y-4">
        <Section
          icon={Server}
          title="Połączenie z API"
          description="Adres daemona FastAPI, klucz X-API-Key i test połączenia."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="label" htmlFor="api-url">
                Adres API
              </label>
              <input
                id="api-url"
                type="url"
                inputMode="url"
                spellCheck={false}
                value={settings.apiBaseUrl}
                onChange={(event) => update({ apiBaseUrl: event.target.value })}
                placeholder="http://192.168.1.50:8000"
                className="input font-mono text-xs"
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                Puste pole = ten sam origin (w trybie dev działa proxy Vite). Możesz podać sam
                host — aplikacja doda <span className="text-slate-400">http://</span>.
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => update({ apiBaseUrl: 'http://192.168.1.50:8000' })}
                  className="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  przykład: sieć lokalna
                </button>
                <button
                  type="button"
                  onClick={() => update({ apiBaseUrl: 'https://garmin-api.twojanazwa.ts.net' })}
                  className="rounded-full border border-slate-700/80 px-2.5 py-1 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  przykład: Tailscale
                </button>
              </div>

              <div className="mt-4">
                <label className="label" htmlFor="api-key">
                  Klucz API (X-API-Key)
                </label>
                <div className="relative">
                  <input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    spellCheck={false}
                    autoComplete="off"
                    value={apiKeyDraft}
                    onChange={(event) => setApiKeyDraft(event.target.value)}
                    onBlur={commitApiKey}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                    }}
                    placeholder="klucz z konfiguracji backendu"
                    className="input pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((current) => !current)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                    aria-label={showApiKey ? 'Ukryj klucz API' : 'Pokaż klucz API'}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                  Wysyłany jako nagłówek <span className="text-slate-400">X-API-Key</span>. Puste
                  pole = brak nagłówka. Klucz zostaje w tej przeglądarce i zapisuje się po
                  opuszczeniu pola.
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runTest()}
                  disabled={testing}
                  className="btn-outline text-xs"
                >
                  {testing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Testuj połączenie
                </button>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={loading}
                  className="btn-ghost text-xs"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  Odśwież dane
                </button>
              </div>

              {testResult ? (
                <div
                  className={cn(
                    'mt-3 flex items-start gap-2 rounded-xl border p-3 text-[11px]',
                    testResult.ok
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-500/25 bg-rose-500/10 text-rose-200',
                  )}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {testResult.message}
                    {testResult.latencyMs !== null ? ` (${testResult.latencyMs} ms)` : ''}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Toggle
                checked={settings.demoMode}
                onChange={(value) => update({ demoMode: value })}
                label="Tryb demonstracyjny"
                description="Wymusza przykładowe dane bez łączenia z API. Przydatne do testów interfejsu."
              />
              <Toggle
                checked={settings.autoRefresh}
                onChange={(value) => update({ autoRefresh: value })}
                label="Automatyczne odświeżanie"
                description="Odświeża dane co 5 minut oraz po powrocie do aplikacji."
              />

              <div className="space-y-1.5 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Status</span>
                  <Badge tone={source === 'live' ? 'emerald' : 'amber'} dot>
                    {source === 'live' ? 'Online' : 'Demo'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Ostatnia aktualizacja</span>
                  <span className="text-slate-300">{fmtRelative(updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Dane dzienne</span>
                  <span className="text-slate-300">{history.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Aktywności</span>
                  <span className="text-slate-300">{activities.length}</span>
                </div>
                {error ? <p className="pt-1 text-[11px] text-amber-300">{error}</p> : null}
              </div>
            </div>
          </div>
        </Section>

        <Section
          icon={KeyRound}
          title="Trener AI — Gemini"
          description="Klucz Google AI Studio i wybór modelu."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="label" htmlFor="gemini-key">
                Klucz API
              </label>
              <div className="relative">
                <input
                  id="gemini-key"
                  type={showGeminiKey ? 'text' : 'password'}
                  spellCheck={false}
                  autoComplete="off"
                  value={settings.geminiApiKey}
                  onChange={(event) => update({ geminiApiKey: event.target.value })}
                  placeholder="AIza…"
                  className="input pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                  aria-label={showGeminiKey ? 'Ukryj klucz' : 'Pokaż klucz'}
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Klucz pobierzesz z{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-0.5 text-emerald-300 hover:text-emerald-200"
                >
                  Google AI Studio
                  <ExternalLink className="h-3 w-3" />
                </a>
                . Modele Flash są zwykle dostępne w darmowym tierze.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="gemini-model">
                Model
              </label>
              <input
                id="gemini-model"
                list="gemini-model-options"
                value={settings.geminiModel}
                onChange={(event) => update({ geminiModel: event.target.value })}
                placeholder="auto"
                autoComplete="off"
                spellCheck={false}
                className="input"
              />
              <datalist id="gemini-model-options">
                <option value="auto">auto — najnowszy Flash (zalecany)</option>
                <option value="gemini-3.8-flash" />
                <option value="gemini-flash-latest" />
              </datalist>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                „auto” wybiera najnowszy dostępny model Flash i sam przełącza się, gdy Google
                wycofa stary. Możesz też wpisać dowolną nazwę modelu (np. gemini-3.8-flash).
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-200/80">
            <strong className="text-amber-200">Bezpieczeństwo:</strong> klucz jest przechowywany w
            localStorage tej przeglądarki i wysyłany bezpośrednio do Google. Każdy, kto ma dostęp
            do urządzenia, może go odczytać. W Google Cloud ogranicz klucz do domeny aplikacji i
            interfejsu Generative Language API.
          </div>
        </Section>

        <Section
          icon={User}
          title="Profil i cele"
          description="Imię używane w kontekście AI oraz docelowe czasy startowe."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="label" htmlFor="athlete-name">
                Imię zawodnika
              </label>
              <input
                id="athlete-name"
                type="text"
                value={settings.athleteName}
                onChange={(event) => update({ athleteName: event.target.value })}
                placeholder="np. Bartek"
                className="input"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Opcjonalne — pomaga modelowi personalizować odpowiedzi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {RACE_DISTANCES.map((distance) => (
                <div key={distance.key}>
                  <label className="label" htmlFor={`settings-goal-${distance.key}`}>
                    {distance.label}
                  </label>
                  <input
                    id={`settings-goal-${distance.key}`}
                    type="text"
                    inputMode="numeric"
                    value={settings.goals[distance.key]}
                    onChange={(event) => updateGoal(distance.key, event.target.value)}
                    placeholder={distance.placeholder}
                    className="input"
                  />
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Format: <span className="text-slate-300">mm:ss</span> lub{' '}
            <span className="text-slate-300">hh:mm:ss</span>. Cele możesz też edytować w widoku
            Predykcje.
          </p>
        </Section>

        <Section
          icon={Smartphone}
          title="Aplikacja PWA"
          description="Instalacja na telefonie, automatyczne aktualizacje i wersja."
        >
          <div className="flex flex-wrap items-center gap-4">
            <InstallPWAButton variant="primary" />
            <button
              type="button"
              onClick={() => void checkUpdates()}
              disabled={checkingUpdate}
              className="btn-outline text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', checkingUpdate && 'animate-spin')} />
              Sprawdź aktualizację
            </button>
            <p className="max-w-lg text-xs leading-relaxed text-slate-400">
              Po instalacji aplikacja otwiera się w trybie pełnoekranowym, ma własną ikonę i
              korzysta z cache offline. Na iPhone wymagane jest Safari i HTTPS (np. adres
              Tailscale).
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-[11px] leading-relaxed text-slate-400">
            Aplikacja sprawdza nową wersję przy starcie, przy powrocie do karty i co minutę.
            Po wdrożeniu nowego builda odświeży się sama — nie trzeba nic robić ręcznie.
            {updateMessage ? (
              <span className="mt-1 block text-emerald-300">{updateMessage}</span>
            ) : null}
          </div>
        </Section>

        <Section
          icon={Database}
          title="Dane i diagnostyka"
          description="Eksport, odświeżanie i czyszczenie danych lokalnych."
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportData} className="btn-outline text-xs">
              <Download className="h-3.5 w-3.5" />
              Eksportuj dane (JSON)
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="btn-outline text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Odśwież z API
            </button>
            <button type="button" onClick={clearAll} className="btn-danger text-xs">
              <Trash2 className="h-3.5 w-3.5" />
              Wyczyść dane lokalne
            </button>
          </div>

          <div className="mt-4 grid gap-3 text-[11px] text-slate-500 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <p className="mb-1 font-medium text-slate-300">Endpointy</p>
              <ul className="space-y-0.5 font-mono text-[10px] text-slate-500">
                <li>GET /api/v1/health/summary</li>
                <li>GET /api/v1/health/history?days=120</li>
                <li>GET /api/v1/activities/recent</li>
                <li>GET /api/v1/tsb?days=120</li>
                <li>POST /api/v1/sync</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <p className="mb-1 font-medium text-slate-300">Wersja</p>
              <p>Garmin Pulpit · build {__BUILD_ID__}</p>
              <p className="mt-1">
                Ostatnia synchronizacja:{' '}
                {updatedAt ? fmtDateTime(updatedAt) : 'jeszcze nie było'}
              </p>
              <p className="mt-1">
                Zakres historii: {history[0]?.date ?? '—'} – {summary?.date ?? '—'}
              </p>
            </div>
          </div>
        </Section>
      </div>
    </>
  )
}
