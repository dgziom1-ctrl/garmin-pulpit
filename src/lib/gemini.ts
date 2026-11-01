import type {
  Activity,
  ChatMessage,
  DailyHealth,
  HealthSummary,
  PlanDay,
  PlanDayType,
  RaceDistanceKey,
  TrainingPlan,
  TsbPoint,
} from '../types'
import {
  addDays,
  fmtDateShort,
  fmtDistance,
  fmtDurationHuman,
  fmtPace,
  fmtRaceTime,
  parseLocalDate,
  toISODate,
} from './format'
import {
  acrZone,
  aggregateHrZones,
  hrvZone,
  readinessLabel,
  SPORT_META,
  trainingStatusLabel,
  tsbZone,
  trainingWeekSummary,
} from './metrics'
import { readCache, writeCache } from './storage'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiError extends Error {
  status?: number
  hint?: string

  constructor(message: string, status?: number, hint?: string) {
    super(message)
    this.name = 'GeminiError'
    this.status = status
    this.hint = hint
  }
}

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10) / 10
}

export interface ContextInput {
  summary: HealthSummary | null
  history: DailyHealth[]
  activities: Activity[]
  tsb: TsbPoint[]
  goals: Record<RaceDistanceKey, string>
  athleteName?: string
}

/** Kompaktowy, czytelny dla modelu opis stanu zawodnika. */
export function buildContext(input: ContextInput): string {
  const { summary, history, activities, tsb, goals, athleteName } = input
  const recent = history.slice(-7)
  const currentTsb = tsb[tsb.length - 1] ?? null
  const week = trainingWeekSummary(activities)
  const zones = aggregateHrZones(activities.slice(0, 12))
  const readiness = summary?.readiness ?? null
  const acr = summary?.acr ?? null
  const hrv = summary?.hrv ?? null
  const sleep = summary?.sleep ?? null

  const lines: string[] = []
  lines.push(`DATA: ${toISODate(new Date())}${athleteName ? ` | ZAWODNIK: ${athleteName}` : ''}`)
  lines.push(
    `GOTOWOŚĆ: ${readiness ?? 'brak'}/100${readiness !== null ? ` (${readinessLabel(readiness, summary?.readinessLabel)})` : ''}`,
  )
  if (hrv) {
    lines.push(
      `HRV: ${hrv.nightlyAvg ?? 'brak'} ms (status: ${hrvZone(hrv.status).label}); baseline ${hrv.baselineLow ?? '?'}–${hrv.baselineHigh ?? '?'} ms; średnia 7 dni ${average(recent.map((day) => day.hrv?.nightlyAvg)) ?? 'brak'} ms`,
    )
  }
  if (sleep) {
    lines.push(
      `SEN: ${sleep.score ?? 'brak'}/100, ${sleep.durationMin ? fmtDurationHuman(sleep.durationMin) : 'brak'} (deep ${sleep.deepMin ?? '?'} min, REM ${sleep.remMin ?? '?'} min); średnia 7 dni ${average(recent.map((day) => day.sleep?.score)) ?? 'brak'}/100`,
    )
  }
  if (summary?.bodyBattery) {
    lines.push(
      `BODY BATTERY: ${summary.bodyBattery.current ?? 'brak'}/100 (zakres dnia ${summary.bodyBattery.min ?? '?'}–${summary.bodyBattery.max ?? '?'})`,
    )
  }
  lines.push(
    `FIZJOLOGIA: VO2max ${summary?.vo2max ?? 'brak'} | RHR ${summary?.restingHr ?? 'brak'} | status treningowy: ${trainingStatusLabel(summary?.trainingStatus)}`,
  )
  lines.push(
    `OBCIĄŻENIE: acute ${summary?.acuteLoad ?? 'brak'}, chronic ${summary?.chronicLoad ?? 'brak'}, ACR ${acr ?? 'brak'}${acr !== null ? ` (${acrZone(acr).label})` : ''}`,
  )
  if (currentTsb) {
    lines.push(
      `TSB: CTL ${currentTsb.ctl}, ATL ${currentTsb.atl}, TSB ${currentTsb.tsb} (${tsbZone(currentTsb.tsb).label})`,
    )
  }
  lines.push(
    `TEN TYDZIEŃ: ${week.sessions} sesji, ${week.minutes} min, load ${week.load}; rozkład: ${Object.entries(week.bySport)
      .map(([sport, count]) => `${SPORT_META[sport as keyof typeof SPORT_META]?.label ?? sport} ${count}`)
      .join(', ') || 'brak'}`,
  )

  const zoneText = zones
    .filter((zone) => zone.seconds > 0)
    .map((zone) => `${zone.zone} ${zone.percent}%`)
    .join(', ')
  if (zoneText) lines.push(`STREFY HR (12 sesji): ${zoneText}`)

  lines.push('OSTATNIE AKTYWNOŚCI:')
  if (activities.length === 0) {
    lines.push('- brak danych')
  } else {
    for (const activity of activities.slice(0, 10)) {
      const parts = [
        fmtDateShort(activity.startTime),
        SPORT_META[activity.sport].label,
        activity.name,
      ]
      if (activity.distanceM) parts.push(fmtDistance(activity.distanceM))
      parts.push(`${Math.round(activity.durationSec / 60)} min`)
      if (activity.avgHr) parts.push(`śr. HR ${activity.avgHr}`)
      if (activity.trainingLoad) parts.push(`load ${activity.trainingLoad}`)
      const pace = activity.distanceM && activity.sport === 'running' ? activity.durationSec / (activity.distanceM / 1000) : null
      if (pace) parts.push(fmtPace(pace))
      lines.push(`- ${parts.join(' | ')}`)
    }
  }

  const goalText = (Object.entries(goals) as Array<[RaceDistanceKey, string]>)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key === 'half' ? 'półmaraton' : key === 'marathon' ? 'maraton' : key} ${value}`)
    .join(', ')
  lines.push(`CELE ZAWODNIKA: ${goalText || 'brak zdefiniowanych celów'}`)

  return lines.join('\n')
}

export const SYSTEM_PROMPT = `Jesteś „Pulsem" — doświadczonym trenerem przygotowania fizycznego i wytrzymałości, specjalizującym się w treningu hybrydowym: bieganie, trening siłowy FBW oraz sporty rakietowe (tenis, padel, squash).

ZASADY PRACY:
1. Odpowiadaj wyłącznie po polsku, konkretnie i praktycznie. Nie stosuj ogólników w stylu „słuchaj organizmu".
2. Zawsze opieraj wnioski na danych z sekcji DANE ATHLETY. Nie wymyślaj wartości, których tam nie ma. Jeśli brakuje kluczowej metryki, napisz wprost, czego brakuje i jaką decyzję podejmujesz mimo to.
3. Interpretuj metryki w kontekście:
   - Gotowość < 40 lub HRV „Niski" → dzień regeneracyjny, maksymalnie Z2, przełóż akcent jakościowy.
   - ACR > 1.5 → zmniejsz objętość o 30–40%, zero interwałów, priorytet sen.
   - ACR < 0.8 → można bezpiecznie dodać 10–15% objętości.
   - TSB < −30 → deload; TSB > +20 → dobry moment na start lub mocny akcent.
   - Sen < 6 h lub ocena snu < 60 → brak wysokiej intensywności tego dnia.
   - Body Battery < 30 rano → trening lekki lub mobilność.
4. Profil hybrydowy: sporty rakietowe obciążają układ nerwowo-mięśniowy — nie łącz ich z interwałami dzień po dniu. FBW 2×/tydzień (priorytet przysiad, martwy ciąg, wyciskanie, wiosłowanie), nie do upadku przed kluczowym biegiem. Długie wybieganie 60–90 min w Z2.
5. Każdy plan musi mieć co najmniej 1 pełny dzień wolny i 1 dzień mobilności/regeneracji. Rozgrzewka 10–15 min przed każdą sesją jakościową.
6. Nie diagnozuj chorób ani kontuzji. Przy bólu, zawrotach głowy lub bólu w klatce piersiowej zaleć konsultację lekarską.
7. Nie podawaj dawek leków ani suplementów.

FORMAT ODPOWIEDZI (domyślnie):
- **Werdykt** — 1–2 zdania.
- **Analiza** — 3–5 punktów: dana → wniosek.
- **Rekomendacja** — co zrobić w najbliższych 24–48 h.
- Jeśli pytanie dotyczy planu: tabela lub lista 7 dni z typem sesji, czasem i intensywnością.
Maksymalnie ok. 350 słów, chyba że użytkownik prosi o pełny plan.`

export function buildSystemPrompt(context: string): string {
  return `${SYSTEM_PROMPT}\n\n=== DANE ATHLETY (źródło: Garmin Connect) ===\n${context}\n=== KONIEC DANYCH ===`
}

function mapGeminiError(status: number, message: string): GeminiError {
  const hints: Record<number, string> = {
    400: 'Sprawdź, czy klucz API jest poprawny i czy model jest dostępny dla Twojego projektu.',
    403: 'Klucz API nie ma uprawnień do Gemini API. Włącz Generative Language API w Google Cloud.',
    404: 'Model nie istnieje lub został wycofany. W Ustawieniach wybierz model „auto” — aplikacja sama znajdzie najnowszy Flash.',
    429: 'Przekroczono limit zapytań (darmowy tier). Odczekaj chwilę lub zmniejsz częstotliwość.',
    500: 'Błąd po stronie Google. Spróbuj ponownie za chwilę.',
    503: 'Model jest chwilowo przeciążony. Spróbuj ponownie.',
  }
  return new GeminiError(message, status, hints[status])
}

async function toGeminiError(response: Response): Promise<GeminiError> {
  let message = `Gemini API zwróciło błąd ${response.status}.`
  try {
    const payload = (await response.json()) as { error?: { message?: string } }
    if (payload.error?.message) message = payload.error.message
  } catch {
    // brak JSON w odpowiedzi
  }
  return mapGeminiError(response.status, message)
}

interface GeminiPart {
  text?: string
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] }
  finishReason?: string
}

interface GeminiPayload {
  candidates?: GeminiCandidate[]
  promptFeedback?: { blockReason?: string }
}

function extractText(payload: GeminiPayload): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? []
  return parts.map((part) => part.text ?? '').join('')
}

function ensureKey(apiKey: string): string {
  const key = apiKey.trim()
  if (!key) {
    throw new GeminiError(
      'Brak klucza Gemini API.',
      undefined,
      'Dodaj klucz w Ustawieniach aplikacji (Google AI Studio → Get API key).',
    )
  }
  return key
}

/* ------------------------------------------------------------------ */
/* Wybór modelu: „auto” = najnowszy dostępny Flash, z samonaprawą      */
/* ------------------------------------------------------------------ */

/** Alias Google wskazujący zawsze na aktualny model Flash. */
const LATEST_FLASH_ALIAS = 'gemini-flash-latest'
const RESOLVED_MODEL_KEY = 'gemini-model-resolved'

let resolvedModel: string | null = readCache<string | null>(RESOLVED_MODEL_KEY, null)

function isAutoModel(model: string | undefined): boolean {
  const value = (model ?? '').trim().toLowerCase()
  return value === '' || value === 'auto'
}

/** Czy błąd oznacza, że wybrany model nie istnieje / został wycofany. */
function isModelUnavailable(error: GeminiError): boolean {
  if (error.status === 404) return true
  if (error.status === 400 || error.status === 403 || error.status === 410) {
    return /no longer available|not found|not supported|deprecated|decommission|is not available/i.test(
      error.message,
    )
  }
  return false
}

interface ModelListPayload {
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>
  nextPageToken?: string
}

/** Pyta Google o listę modeli i wybiera najnowszy „gemini-X.Y-flash” (bez lite/image/tts/live). */
async function findLatestFlash(key: string, exclude?: string): Promise<string | null> {
  const pattern = /^models\/(gemini-(\d+)(?:\.(\d+))?-flash(-preview[\w.-]*)?)$/
  let best: { id: string; rank: [number, number, number] } | null = null // [stabilny?, major, minor]
  let pageToken = ''

  for (let page = 0; page < 4; page += 1) {
    const url =
      `${GEMINI_BASE}?pageSize=200&key=${encodeURIComponent(key)}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')
    let payload: ModelListPayload
    try {
      const response = await fetch(url)
      if (!response.ok) break
      payload = (await response.json()) as ModelListPayload
    } catch {
      break
    }

    for (const model of payload.models ?? []) {
      const match = pattern.exec(model.name ?? '')
      if (!match) continue
      if (!(model.supportedGenerationMethods ?? []).includes('generateContent')) continue
      const id = match[1]
      if (id === exclude) continue
      // Modele stabilne zawsze wygrywają z preview; w obrębie grupy wygrywa wyższa wersja.
      const rank: [number, number, number] = [match[4] ? 0 : 1, Number(match[2]), Number(match[3] ?? 0)]
      const better =
        !best ||
        rank[0] > best.rank[0] ||
        (rank[0] === best.rank[0] && rank[1] > best.rank[1]) ||
        (rank[0] === best.rank[0] && rank[1] === best.rank[1] && rank[2] > best.rank[2])
      if (better) best = { id, rank }
    }

    if (!payload.nextPageToken) break
    pageToken = payload.nextPageToken
  }

  return best?.id ?? null
}

/**
 * Uruchamia zapytanie na wybranym modelu. Gdy Google odpowie, że model nie istnieje
 * albo został wycofany, aplikacja sama znajduje najnowszy Flash, zapamiętuje go
 * i powtarza zapytanie — bez ręcznej zmiany ustawień.
 */
async function withModel<T>(
  apiKey: string,
  requested: string,
  run: (model: string) => Promise<T>,
): Promise<T> {
  const key = ensureKey(apiKey)
  const first = isAutoModel(requested) ? (resolvedModel ?? LATEST_FLASH_ALIAS) : requested.trim()

  try {
    return await run(first)
  } catch (error) {
    if (!(error instanceof GeminiError) || !isModelUnavailable(error)) throw error

    const alternative = await findLatestFlash(key, first)
    if (!alternative) throw error

    resolvedModel = alternative
    writeCache(RESOLVED_MODEL_KEY, alternative)
    return run(alternative)
  }
}

/** Nazwa modelu do wyświetlenia w UI (dla „auto” — ostatnio użyty model). */
export function displayModelName(model: string): string {
  return isAutoModel(model) ? (resolvedModel ?? 'auto (najnowszy Flash)') : model
}

interface StreamChatArgs {
  apiKey: string
  model: string
  messages: Array<Pick<ChatMessage, 'role' | 'text'>>
  context: string
  signal?: AbortSignal
  onToken?: (chunk: string) => void
}

/** Strumieniowany czat z Gemini (SSE). Zwraca pełną odpowiedź. */
export function streamChat(args: StreamChatArgs): Promise<string> {
  return withModel(args.apiKey, args.model, (model) => streamChatOnce(args, model))
}

async function streamChatOnce(args: StreamChatArgs, model: string): Promise<string> {
  const key = ensureKey(args.apiKey)
  const system = buildSystemPrompt(args.context)

  const response = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: args.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: args.messages.map((message) => ({
          role: message.role === 'model' ? 'model' : 'user',
          parts: [{ text: message.text }],
        })),
        generationConfig: {
          temperature: 0.65,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      }),
    },
  )

  if (!response.ok) throw await toGeminiError(response)
  if (!response.body) throw new GeminiError('Gemini nie zwróciło treści odpowiedzi.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')

    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const payload = JSON.parse(data) as GeminiPayload
          const block = payload.promptFeedback?.blockReason
          if (block) {
            throw new GeminiError(`Gemini zablokowało odpowiedź (${block}).`)
          }
          const text = extractText(payload)
          if (text) {
            full += text
            args.onToken?.(text)
          }
        } catch (error) {
          if (error instanceof GeminiError) throw error
          // pomijamy niekompletne/nieparsowalne eventy
        }
      }
    }
  }

  if (!full.trim()) {
    throw new GeminiError('Gemini zwróciło pustą odpowiedź. Spróbuj ponownie.')
  }
  return full
}

interface GenerateArgs {
  apiKey: string
  model: string
  prompt: string
  context: string
  system?: string
  temperature?: number
  responseMimeType?: string
  signal?: AbortSignal
}

function generateContent(args: GenerateArgs): Promise<string> {
  return withModel(args.apiKey, args.model, (model) => generateContentOnce(args, model))
}

async function generateContentOnce(args: GenerateArgs, model: string): Promise<string> {
  const key = ensureKey(args.apiKey)
  const system = args.system ? `${args.system}\n\n${buildSystemPrompt(args.context)}` : buildSystemPrompt(args.context)

  const response = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: args.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
        generationConfig: {
          temperature: args.temperature ?? 0.55,
          topP: 0.9,
          maxOutputTokens: 4096,
          ...(args.responseMimeType ? { responseMimeType: args.responseMimeType } : {}),
        },
      }),
    },
  )

  if (!response.ok) throw await toGeminiError(response)
  const payload = (await response.json()) as GeminiPayload
  const text = extractText(payload)
  if (!text.trim()) throw new GeminiError('Gemini zwróciło pustą odpowiedź.')
  return text
}

export async function generateInsight(args: {
  apiKey: string
  model: string
  context: string
  signal?: AbortSignal
}): Promise<string> {
  return generateContent({
    apiKey: args.apiKey,
    model: args.model,
    context: args.context,
    signal: args.signal,
    temperature: 0.5,
    prompt:
      'Przygotuj krótką analizę mojego dzisiejszego stanu (maks. 180 słów). ' +
      'Struktura: 1) Werdykt jednym zdaniem, 2) 3 najważniejsze sygnały z danych, ' +
      '3) konkretna rekomendacja na dzisiaj (typ sesji, intensywność, czas). ' +
      'Bez powtarzania wszystkich liczb — tylko te, które mają znaczenie.',
  })
}

const PLAN_TYPES: PlanDayType[] = ['running', 'strength', 'racket', 'cycling', 'rest', 'mobility']

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    throw new GeminiError('Model nie zwrócił poprawnego JSON-a planu. Spróbuj wygenerować ponownie.')
  }
  const slice = text.slice(start, end + 1)
  try {
    return JSON.parse(slice) as Record<string, unknown>
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1')) as Record<string, unknown>
    } catch {
      throw new GeminiError('Nie udało się odczytać planu (niepoprawny JSON). Spróbuj ponownie.')
    }
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parsePlan(raw: string): TrainingPlan {
  const payload = extractJson(raw)
  const rawDays = Array.isArray(payload.days) ? payload.days : []
  const startDate = parseLocalDate(new Date())
  const days: PlanDay[] = rawDays.slice(0, 7).map((entry, index) => {
    const item = (entry ?? {}) as Record<string, unknown>
    const type = PLAN_TYPES.includes(item.type as PlanDayType)
      ? (item.type as PlanDayType)
      : 'rest'
    const rest = type === 'rest'
    const rawDate = asString(item.date)
    const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : toISODate(addDays(startDate, index))
    return {
      date,
      day: asString(item.day, `Dzień ${index + 1}`),
      type,
      title: asString(item.title, rest ? 'Dzień wolny' : 'Trening'),
      details: asString(item.details, ''),
      durationMin: rest ? 0 : Math.max(0, Math.round(asNumber(item.durationMin, 0))),
      intensity: rest ? 'wolne' : asString(item.intensity, 'łatwy'),
      load: rest ? 0 : Math.max(0, Math.round(asNumber(item.load, 0))),
    }
  })

  if (days.length === 0) {
    throw new GeminiError('Plan nie zawiera dni treningowych. Spróbuj ponownie.')
  }

  return {
    summary: asString(payload.summary, 'Plan wygenerowany na podstawie aktualnych metryk.'),
    focus: asString(payload.focus, 'Zrównoważony trening hybrydowy'),
    days,
    generatedAt: new Date().toISOString(),
  }
}

export async function generatePlan(args: {
  apiKey: string
  model: string
  context: string
  correction?: string
  signal?: AbortSignal
}): Promise<TrainingPlan> {
  const today = parseLocalDate(new Date())
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() + index)
    return `${toISODate(date)} (${new Intl.DateTimeFormat('pl-PL', { weekday: 'long' }).format(date)})`
  }).join(', ')

  const prompt = `Ułóż plan treningowy na najbliższe 7 dni, zaczynając od dziś.
Dostępne daty: ${dates}.

Zasady:
- Trening hybrydowy: bieganie 2–3×, FBW 2×, sporty rakietowe 1–2×, minimum 1 pełny dzień wolny.
- Dostosuj objętość i intensywność do gotowości, HRV, ACR, TSB i snu z danych.
- Jeśli któryś wskaźnik jest czerwony (gotowość < 40, HRV niski, ACR > 1.5, TSB < −30), wstaw regenerację i zmniejsz load.
- Każdy dzień ma mieć realny czas trwania i orientacyjne obciążenie (load) w skali podobnej do Garmina.
- Details: 1–2 zdania konkretów (np. „4×8 min w Z3, 2 min truchtu").
- intensity: jeden z: łatwy, średni, mocny, regeneracja, wolne.
${args.correction?.trim() ? `\nKOREKTA OD UŻYTKOWNIKA (uwzględnij ją bezwzględnie, o ile nie zagraża bezpieczeństwu):\n${args.correction.trim()}\n` : ''}
Zwróć WYŁĄCZNIE poprawny JSON (bez markdown, bez komentarzy) w schemacie:
{
  "summary": "2–3 zdania podsumowania tygodnia",
  "focus": "główny cel tygodnia, max 12 słów",
  "days": [
    {
      "date": "RRRR-MM-DD",
      "day": "Poniedziałek",
      "type": "running|strength|racket|cycling|rest|mobility",
      "title": "krótki tytuł sesji",
      "details": "konkretny opis",
      "durationMin": 60,
      "intensity": "łatwy",
      "load": 55
    }
  ]
}`

  const raw = await generateContent({
    apiKey: args.apiKey,
    model: args.model,
    context: args.context,
    prompt,
    signal: args.signal,
    temperature: 0.6,
    responseMimeType: 'application/json',
    system:
      'Jesteś planistą treningowym. Odpowiadasz wyłącznie poprawnym JSON-em zgodnym z podanym schematem. ' +
      'Nie dodawaj markdown, komentarzy ani tekstu poza JSON-em.',
  })

  return parsePlan(raw)
}

export function goalTime(goals: Record<RaceDistanceKey, string>, key: RaceDistanceKey): string {
  const value = goals[key]?.trim()
  if (!value) return '—'
  return value
}

export { fmtRaceTime }
