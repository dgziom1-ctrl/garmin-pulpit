import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Brain, KeyRound, RefreshCw, Sparkles } from 'lucide-react'
import { useHealthData } from '../../context/HealthDataContext'
import { useSettings } from '../../context/SettingsContext'
import { buildContext, displayModelName, generateInsight, GeminiError } from '../../lib/gemini'
import { readCache, writeCache } from '../../lib/storage'
import { fmtRelative, todayISO } from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { MarkdownLite } from '../ui/MarkdownLite'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/cn'

export function AiInsightCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { summary, history, activities, tsb, source } = useHealthData()
  const { settings } = useSettings()
  const cacheKey = `insight:${todayISO()}`
  const [text, setText] = useState<string>(() => readCache(cacheKey, ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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

  const hasKey = Boolean(settings.geminiApiKey.trim())

  const run = async () => {
    if (!hasKey) {
      onOpenSettings()
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await generateInsight({
        apiKey: settings.geminiApiKey,
        model: settings.geminiModel,
        context,
        signal: controller.signal,
      })
      setText(result)
      setGeneratedAt(Date.now())
      writeCache(cacheKey, result)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      const message =
        caught instanceof GeminiError
          ? `${caught.message}${caught.hint ? ` ${caught.hint}` : ''}`
          : caught instanceof Error
            ? caught.message
            : 'Nie udało się wygenerować analizy.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="card-pad flex flex-col bg-gradient-to-br from-indigo-500/10 via-slate-900/60 to-emerald-500/5">
      <CardHeader
        title="Analiza AI"
        hint="Trener Gemini na bazie Twoich metryk"
        icon={<Brain className="h-4 w-4 text-indigo-300" />}
        action={
          <Badge tone={hasKey ? 'indigo' : 'slate'} dot={hasKey}>
            {hasKey ? displayModelName(settings.geminiModel) : 'brak klucza'}
          </Badge>
        }
      />

      <div className="mt-3 flex-1">
        {!hasKey ? (
          <div className="flex h-full flex-col items-start justify-center gap-3 py-4">
            <p className="text-xs leading-relaxed text-slate-400">
              Dodaj klucz Google AI Studio, aby otrzymywać codzienną analizę gotowości, snu i
              obciążenia oraz rekomendację treningu.
            </p>
            <button type="button" onClick={onOpenSettings} className="btn-primary text-xs">
              <KeyRound className="h-3.5 w-3.5" />
              Dodaj klucz Gemini
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-3 w-11/12" />
            <Skeleton className="h-3 w-10/12" />
            <Skeleton className="h-3 w-8/12" />
            <Skeleton className="mt-4 h-3 w-9/12" />
            <Skeleton className="h-3 w-7/12" />
          </div>
        ) : error ? (
          <div className="py-3">
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={run} className="btn-outline mt-3 text-xs">
              <RefreshCw className="h-3.5 w-3.5" />
              Spróbuj ponownie
            </button>
          </div>
        ) : text ? (
          <MarkdownLite text={text} className="max-h-72 overflow-y-auto pr-1" />
        ) : (
          <div className="flex h-full flex-col items-start justify-center gap-3 py-4">
            <p className="text-xs leading-relaxed text-slate-400">
              Wygeneruj krótką analizę dnia: werdykt, trzy najważniejsze sygnały i konkretną
              rekomendację treningową.
            </p>
            <button type="button" onClick={run} className="btn-primary text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Analizuj mój dzień
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/70 pt-3">
        <span className={cn('text-[10px]', source === 'demo' ? 'text-amber-400/80' : 'text-slate-600')}>
          {source === 'demo' ? 'Dane demonstracyjne' : 'Dane na żywo z Garmina'}
          {generatedAt ? ` · ${fmtRelative(new Date(generatedAt).toISOString())}` : ''}
        </span>
        {text && !loading ? (
          <button
            type="button"
            onClick={run}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 transition hover:text-emerald-300"
          >
            <RefreshCw className="h-3 w-3" />
            Odśwież
          </button>
        ) : null}
      </div>
    </Card>
  )
}
