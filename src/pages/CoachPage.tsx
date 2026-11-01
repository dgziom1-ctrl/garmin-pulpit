import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, MessageSquare, Sparkles } from 'lucide-react'
import type { TrainingPlan } from '../types'
import type { Route } from '../hooks/useHashRoute'
import { useHealthData } from '../context/HealthDataContext'
import { useSettings } from '../context/SettingsContext'
import { buildContext, displayModelName, GeminiError, generatePlan } from '../lib/gemini'
import { isoWeekKey } from '../lib/format'
import { readCache, writeCache } from '../lib/storage'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { PlanView } from '../components/coach/PlanView'
import { ChatPanel } from '../components/coach/ChatPanel'
import { NoKeyCard } from '../components/coach/NoKeyCard'
import { cn } from '../lib/cn'

type Tab = 'plan' | 'chat'

export function CoachPage({ navigate }: { navigate: (route: Route) => void }) {
  const { summary, history, activities, tsb, source } = useHealthData()
  const { settings } = useSettings()
  const [tab, setTab] = useState<Tab>('plan')
  const planKey = `plan:${isoWeekKey(new Date())}`
  const [plan, setPlan] = useState<TrainingPlan | null>(() =>
    readCache<TrainingPlan | null>(planKey, null),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const hasKey = Boolean(settings.geminiApiKey.trim())

  const context = useMemo(
    () =>
      buildContext({
        summary,
        history,
        activities,
        tsb: tsb?.history ?? [],
        goals: settings.goals,
        athleteName: settings.athleteName,
      }),
    [summary, history, activities, tsb, settings.goals, settings.athleteName],
  )

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const generate = async () => {
    if (!hasKey) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await generatePlan({
        apiKey: settings.geminiApiKey,
        model: settings.geminiModel,
        context,
        correction,
        signal: controller.signal,
      })
      setPlan(result)
      writeCache(planKey, result)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      const message =
        caught instanceof GeminiError
          ? `${caught.message}${caught.hint ? ` ${caught.hint}` : ''}`
          : caught instanceof Error
            ? caught.message
            : 'Nie udało się wygenerować planu.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Gemini 2.5 Flash"
        title="Trener AI"
        subtitle="Tygodniowy plan i rozmowa oparte na Twoich metrykach — z priorytetem bezpieczeństwa i regeneracji."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={source === 'live' ? 'emerald' : 'amber'} dot>
              {source === 'live' ? 'dane na żywo' : 'demo'}
            </Badge>
            <Badge tone={hasKey ? 'indigo' : 'slate'} dot={hasKey}>
              {hasKey ? displayModelName(settings.geminiModel) : 'brak klucza'}
            </Badge>
          </div>
        }
      />

      <div className="mb-4 flex w-fit gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        <button
          type="button"
          onClick={() => setTab('plan')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition',
            tab === 'plan' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Plan tygodnia
        </button>
        <button
          type="button"
          onClick={() => setTab('chat')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition',
            tab === 'chat' ? 'bg-slate-700/80 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Czat
        </button>
      </div>

      {!hasKey ? (
        <NoKeyCard onOpenSettings={() => navigate('ustawienia')} />
      ) : tab === 'plan' ? (
        <PlanView
          plan={plan}
          loading={loading}
          error={error}
          hasKey={hasKey}
          correction={correction}
          onCorrectionChange={setCorrection}
          onGenerate={() => void generate()}
          onOpenSettings={() => navigate('ustawienia')}
        />
      ) : (
        <ChatPanel
          apiKey={settings.geminiApiKey}
          model={settings.geminiModel}
          context={context}
          source={source}
        />
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-600">
        <Sparkles className="h-3 w-3" />
        AI korzysta wyłącznie z danych przekazanych w kontekście. Nie diagnozuje i nie leczy.
      </p>
    </>
  )
}
