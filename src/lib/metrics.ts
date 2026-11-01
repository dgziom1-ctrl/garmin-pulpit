import type {
  Activity,
  DailyHealth,
  HealthSummary,
  RaceDistanceKey,
  SportKind,
  TsbPoint,
} from '../types'
import { addDays, parseLocalDate, round, startOfWeek, toISODate } from './format'

export type Tone = 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' | 'indigo' | 'violet'

export const SPORT_META: Record<
  SportKind,
  { label: string; short: string; color: string; description: string }
> = {
  running: {
    label: 'Bieganie',
    short: 'Bieg',
    color: '#34d399',
    description: 'Wytrzymałość, tempo, długie wybiegania',
  },
  strength: {
    label: 'Siłownia / FBW',
    short: 'FBW',
    color: '#818cf8',
    description: 'Full body workout, siła, stabilizacja',
  },
  racket: {
    label: 'Sporty rakietowe',
    short: 'Rakieta',
    color: '#22d3ee',
    description: 'Tenis, padel, squash — praca nóg i zwinność',
  },
  cycling: {
    label: 'Kolarstwo',
    short: 'Rower',
    color: '#fbbf24',
    description: 'Tlenowa baza, regeneracja aktywna',
  },
  other: {
    label: 'Inne',
    short: 'Inne',
    color: '#94a3b8',
    description: 'Pozostała aktywność',
  },
}

export const HR_ZONES = [
  { zone: 'Z1', label: 'Regeneracja', color: '#38bdf8', range: '50–60%' },
  { zone: 'Z2', label: 'Spokojna', color: '#34d399', range: '60–70%' },
  { zone: 'Z3', label: 'Tempo', color: '#facc15', range: '70–80%' },
  { zone: 'Z4', label: 'Próg', color: '#fb923c', range: '80–90%' },
  { zone: 'Z5', label: 'VO2max', color: '#f43f5e', range: '90–100%' },
]

export const RACE_DISTANCES: Array<{
  key: RaceDistanceKey
  label: string
  meters: number
  short: string
  placeholder: string
}> = [
  { key: '5k', label: '5 km', meters: 5000, short: '5K', placeholder: '22:30' },
  { key: '10k', label: '10 km', meters: 10000, short: '10K', placeholder: '47:00' },
  { key: 'half', label: 'Półmaraton', meters: 21097.5, short: 'HM', placeholder: '1:45:00' },
  { key: 'marathon', label: 'Maraton', meters: 42195, short: 'M', placeholder: '3:45:00' },
]

export interface ZoneInfo {
  label: string
  tone: Tone
  description: string
}

export function acrZone(acr: number | null | undefined): ZoneInfo {
  if (acr === null || acr === undefined || !Number.isFinite(acr)) {
    return {
      label: 'Brak danych',
      tone: 'slate',
      description: 'Potrzebujemy obciążenia acute i chronic z Garmina.',
    }
  }
  if (acr < 0.8) {
    return {
      label: 'Detrening',
      tone: 'slate',
      description: 'Obciążenie wyraźnie niższe niż chroniczne. Można bezpiecznie zwiększać objętość.',
    }
  }
  if (acr <= 1.3) {
    return {
      label: 'Optymalna',
      tone: 'emerald',
      description: 'Stosunek obciążenia w strefie optymalnej — adaptacja bez nadmiernego ryzyka.',
    }
  }
  if (acr <= 1.5) {
    return {
      label: 'Podwyższona',
      tone: 'amber',
      description: 'Obciążenie rośnie szybciej niż baza. Kontroluj sen, HRV i dni łatwe.',
    }
  }
  return {
    label: 'Wysokie ryzyko',
    tone: 'rose',
    description: 'Skok obciążenia powyżej 1.5. Zalecany deload lub 2–3 dni spokojniejsze.',
  }
}

export function tsbZone(tsb: number | null | undefined): ZoneInfo {
  if (tsb === null || tsb === undefined || !Number.isFinite(tsb)) {
    return { label: 'Brak danych', tone: 'slate', description: 'Brak historii obciążenia do wyliczenia TSB.' }
  }
  if (tsb > 25) {
    return {
      label: 'Świeży',
      tone: 'cyan',
      description: 'Duża rezerwa formy — dobry moment na start lub akcent jakościowy.',
    }
  }
  if (tsb >= 5) {
    return {
      label: 'Optymalna',
      tone: 'emerald',
      description: 'Równowaga treningu i regeneracji — strefa sprzyjająca adaptacji.',
    }
  }
  if (tsb >= -10) {
    return {
      label: 'Neutralna',
      tone: 'slate',
      description: 'Umiarkowane zmęczenie. Trenuj zgodnie z planem, pilnuj snu.',
    }
  }
  if (tsb >= -30) {
    return {
      label: 'Zmęczenie',
      tone: 'amber',
      description: 'Forma chwilowo obniżona. Ogranicz intensywność, wydłuż rozgrzewkę.',
    }
  }
  return {
    label: 'Przeciążenie',
    tone: 'rose',
    description: 'Bardzo wysokie zmęczenie. Wskazany deload i weryfikacja HRV/readiness.',
  }
}

const READINESS_LEVELS: Record<string, { label: string; tone: Tone }> = {
  prime: { label: 'Szczyt gotowości', tone: 'emerald' },
  high: { label: 'Wysoka', tone: 'emerald' },
  moderate: { label: 'Umiarkowana', tone: 'cyan' },
  low: { label: 'Niska', tone: 'amber' },
  poor: { label: 'Bardzo niska', tone: 'rose' },
}

export function readinessZone(score: number | null | undefined, rawLabel?: string | null): ZoneInfo {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return {
      label: rawLabel ?? 'Brak danych',
      tone: 'slate',
      description: 'Garmin nie zwrócił oceny gotowości treningowej.',
    }
  }
  if (score >= 80) return { label: 'Wysoka', tone: 'emerald', description: 'Organizm gotowy na jakościowy trening.' }
  if (score >= 60) return { label: 'Umiarkowana', tone: 'cyan', description: 'Możesz trenować, ale kontroluj intensywność.' }
  if (score >= 40) return { label: 'Niska', tone: 'amber', description: 'Postaw na spokojny trening lub regenerację.' }
  return { label: 'Bardzo niska', tone: 'rose', description: 'Priorytet: sen, jedzenie, lekka aktywność.' }
}

export function readinessLabel(score: number | null | undefined, rawLabel?: string | null): string {
  if (rawLabel) {
    const mapped = READINESS_LEVELS[rawLabel.toLowerCase()]
    if (mapped) return mapped.label
  }
  return readinessZone(score, rawLabel).label
}

const HRV_LABELS: Record<string, { label: string; tone: Tone }> = {
  balanced: { label: 'Zrównoważony', tone: 'emerald' },
  unbalanced: { label: 'Niezrównoważony', tone: 'amber' },
  low: { label: 'Niski', tone: 'rose' },
  high: { label: 'Wysoki', tone: 'cyan' },
  poor: { label: 'Słaby', tone: 'rose' },
  good: { label: 'Dobry', tone: 'emerald' },
}

export function hrvZone(status: string | null | undefined): { label: string; tone: Tone } {
  if (!status) return { label: 'Brak danych', tone: 'slate' }
  const key = status.toLowerCase().replace(/[^a-z]/g, '')
  return HRV_LABELS[key] ?? { label: status, tone: 'slate' }
}

const TRAINING_STATUS: Record<string, string> = {
  productive: 'Produktywny',
  maintaining: 'Utrzymanie',
  overreaching: 'Przetrenowanie',
  unproductive: 'Nieproduktywny',
  recovery: 'Regeneracja',
  peaking: 'Szczyt formy',
  detraining: 'Detrening',
  strained: 'Przeciążony',
  balanced: 'Zrównoważony',
}

export function trainingStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Brak statusu'
  return TRAINING_STATUS[status.toLowerCase().replace(/[^a-z]/g, '')] ?? status
}

const SLEEP_QUALITY: Record<string, string> = {
  excellent: 'Doskonały',
  good: 'Dobry',
  fair: 'Przeciętny',
  poor: 'Słaby',
}

export function sleepQualityLabel(quality: string | null | undefined): string {
  if (!quality) return ''
  return SLEEP_QUALITY[quality.toLowerCase()] ?? quality
}

/** Szacowanie obciążenia, gdy backend nie zwrócił trainingLoad. */
export function estimateLoad(activity: Activity): number {
  if (activity.trainingLoad && activity.trainingLoad > 0) return activity.trainingLoad
  const minutes = activity.durationSec / 60
  if (minutes <= 0) return 0
  const hr = activity.avgHr ?? (activity.sport === 'strength' ? 120 : 135)
  const intensity = Math.min(1.15, Math.max(0.45, (hr / 185) ** 2))
  const sportFactor = activity.sport === 'strength' ? 0.85 : activity.sport === 'racket' ? 1.05 : 1
  return Math.round(minutes * intensity * sportFactor)
}

/** Wygładzone CTL (42 dni), ATL (7 dni) i TSB (CTL − ATL). */
export function computeTsb(activities: Activity[], days = 120, endDate: Date = new Date()): TsbPoint[] {
  const loads = new Map<string, number>()
  for (const activity of activities) {
    const key = toISODate(activity.startTime)
    loads.set(key, (loads.get(key) ?? 0) + estimateLoad(activity))
  }

  const series: TsbPoint[] = []
  let ctl = 0
  let atl = 0
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = toISODate(addDays(endDate, -offset))
    const load = loads.get(date) ?? 0
    ctl += (load - ctl) / 42
    atl += (load - atl) / 7
    series.push({
      date,
      ctl: round(ctl, 1),
      atl: round(atl, 1),
      tsb: round(ctl - atl, 1),
    })
  }
  return series
}

export interface WeekVolume {
  key: string
  label: string
  start: string
  running: number
  strength: number
  racket: number
  cycling: number
  other: number
  total: number
}

export function weeklyVolume(activities: Activity[], weeks = 8, endDate: Date = new Date()): WeekVolume[] {
  const currentWeekStart = startOfWeek(endDate)
  const buckets = new Map<string, WeekVolume>()

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = addDays(currentWeekStart, -7 * index)
    const key = toISODate(start)
    buckets.set(key, {
      key,
      label: new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(start),
      start: key,
      running: 0,
      strength: 0,
      racket: 0,
      cycling: 0,
      other: 0,
      total: 0,
    })
  }

  for (const activity of activities) {
    const weekStart = toISODate(startOfWeek(activity.startTime))
    const bucket = buckets.get(weekStart)
    if (!bucket) continue
    const minutes = Math.round(activity.durationSec / 60)
    bucket[activity.sport] += minutes
    bucket.total += minutes
  }

  return [...buckets.values()]
}

export interface SportSplitEntry {
  sport: SportKind
  label: string
  color: string
  minutes: number
  count: number
  percent: number
}

export function sportSplit(activities: Activity[]): SportSplitEntry[] {
  const total = activities.reduce((sum, activity) => sum + activity.durationSec, 0)
  const groups = new Map<SportKind, { minutes: number; count: number }>()

  for (const activity of activities) {
    const current = groups.get(activity.sport) ?? { minutes: 0, count: 0 }
    current.minutes += activity.durationSec / 60
    current.count += 1
    groups.set(activity.sport, current)
  }

  return [...groups.entries()]
    .map(([sport, value]) => ({
      sport,
      label: SPORT_META[sport].label,
      color: SPORT_META[sport].color,
      minutes: Math.round(value.minutes),
      count: value.count,
      percent: total > 0 ? Math.round((value.minutes * 60 * 100) / total) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
}

export interface HrZoneEntry {
  zone: string
  label: string
  color: string
  seconds: number
  percent: number
}

export function aggregateHrZones(activities: Activity[]): HrZoneEntry[] {
  const totals = [0, 0, 0, 0, 0]
  for (const activity of activities) {
    activity.hrZones?.forEach((seconds, index) => {
      if (index < totals.length) totals[index] += seconds
    })
  }
  const sum = totals.reduce((acc, value) => acc + value, 0)
  return HR_ZONES.map((zone, index) => ({
    zone: zone.zone,
    label: zone.label,
    color: zone.color,
    seconds: Math.round(totals[index]),
    percent: sum > 0 ? Math.round((totals[index] / sum) * 100) : 0,
  }))
}

export interface SleepNight {
  date: string
  deep: number
  rem: number
  light: number
  awake: number
  score: number | null
}

export function sleepSeries(history: DailyHealth[], days = 14): SleepNight[] {
  return history
    .slice(-days)
    .map((day) => ({
      date: day.date,
      deep: day.sleep?.deepMin ?? 0,
      rem: day.sleep?.remMin ?? 0,
      light: day.sleep?.lightMin ?? 0,
      awake: day.sleep?.awakeMin ?? 0,
      score: day.sleep?.score ?? null,
    }))
    .filter((night) => night.deep + night.rem + night.light > 0)
}

export interface RacePrediction {
  key: RaceDistanceKey
  label: string
  meters: number
  placeholder: string
  seconds: number | null
  paceSecPerKm: number | null
  source: 'activity' | 'vo2max' | 'none'
  confidence: 'wysoka' | 'średnia' | 'niska'
  basis: string
}

const vo2AtVelocity = (metersPerMinute: number) =>
  -4.6 + 0.182258 * metersPerMinute + 0.000104 * metersPerMinute * metersPerMinute

const sustainableFraction = (minutesValue: number) =>
  0.8 + 0.1894393 * Math.exp(-0.012778 * minutesValue) + 0.2989558 * Math.exp(-0.1932605 * minutesValue)

/** Daniels: czas wyścigu wynikający z VO2max (sekundy). */
export function timeFromVo2max(meters: number, vo2max: number): number | null {
  if (!Number.isFinite(vo2max) || vo2max < 20 || vo2max > 90) return null
  let low = 3
  let high = 600
  for (let index = 0; index < 64; index += 1) {
    const mid = (low + high) / 2
    const velocity = meters / mid
    const required = vo2AtVelocity(velocity) / sustainableFraction(mid)
    if (required > vo2max) low = mid
    else high = mid
  }
  return Math.round(((low + high) / 2) * 60)
}

function daysSince(value: string): number {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY
  return (Date.now() - date.getTime()) / (24 * 3600 * 1000)
}

export function predictRaces(
  vo2max: number | null | undefined,
  activities: Activity[],
): RacePrediction[] {
  const runs = activities.filter(
    (activity) =>
      activity.sport === 'running' &&
      (activity.distanceM ?? 0) >= 2000 &&
      activity.durationSec >= 240,
  )

  return RACE_DISTANCES.map((distance) => {
    let best: { seconds: number; activity: Activity; ratio: number } | null = null

    for (const activity of runs) {
      const ratio = distance.meters / (activity.distanceM ?? distance.meters)
      if (ratio < 0.35 || ratio > 3) continue
      const age = daysSince(activity.startTime)
      if (age > 240) continue
      const seconds = activity.durationSec * ratio ** 1.06
      if (!best || seconds < best.seconds) best = { seconds, activity, ratio }
    }

    const modelSeconds = timeFromVo2max(distance.meters, vo2max ?? 0)

    let seconds: number | null = null
    let source: RacePrediction['source'] = 'none'
    let confidence: RacePrediction['confidence'] = 'niska'
    let basis = 'Brak wystarczających danych.'

    const useActivity = best && (best.ratio <= 2 || modelSeconds === null)
    if (useActivity && best) {
      seconds = Math.round(best.seconds)
      source = 'activity'
      const age = daysSince(best.activity.startTime)
      confidence = age <= 75 && best.ratio <= 2 ? 'wysoka' : age <= 150 ? 'średnia' : 'niska'
      basis = `Riegel 1.06 na bazie: ${best.activity.name} (${(best.activity.distanceM ?? 0) / 1000} km).`
    } else if (modelSeconds) {
      seconds = modelSeconds
      source = 'vo2max'
      confidence = 'średnia'
      basis = `Model Danielsa na bazie VO2max ${vo2max}.`
    }

    return {
      key: distance.key,
      label: distance.label,
      meters: distance.meters,
      placeholder: distance.placeholder,
      seconds,
      paceSecPerKm: seconds ? Math.round(seconds / (distance.meters / 1000)) : null,
      source,
      confidence,
      basis,
    }
  })
}

export interface TrainingLoadSummary {
  acute: number | null
  chronic: number | null
  acr: number | null
  tsb: number | null
  ctl: number | null
  atl: number | null
}

export function loadSummary(
  summary: HealthSummary | null,
  tsb: TsbPoint | null | undefined,
): TrainingLoadSummary {
  const acute = summary?.acuteLoad ?? tsb?.atl ?? null
  const chronic = summary?.chronicLoad ?? tsb?.ctl ?? null
  return {
    acute,
    chronic,
    acr:
      summary?.acr ??
      (acute !== null && chronic !== null && chronic > 0 ? round(acute / chronic, 2) : null),
    tsb: tsb?.tsb ?? null,
    ctl: tsb?.ctl ?? chronic,
    atl: tsb?.atl ?? acute,
  }
}

export function weekStartISO(date: Date = new Date()): string {
  return toISODate(startOfWeek(date))
}

export function daysAgoLabel(value: string): string {
  const days = Math.round(daysSince(value))
  if (!Number.isFinite(days)) return '—'
  if (days <= 0) return 'dziś'
  if (days === 1) return 'wczoraj'
  return `${days} dni temu`
}

export function activityPace(activity: Activity): number | null {
  if (!activity.distanceM || activity.distanceM < 100 || activity.durationSec <= 0) return null
  return Math.round(activity.durationSec / (activity.distanceM / 1000))
}

export function trainingWeekSummary(activities: Activity[], reference: Date = new Date()) {
  const start = startOfWeek(reference)
  const end = addDays(start, 7)
  const inWeek = activities.filter((activity) => {
    const date = parseLocalDate(activity.startTime)
    return date >= start && date < end
  })
  const minutes = Math.round(inWeek.reduce((sum, activity) => sum + activity.durationSec / 60, 0))
  const load = Math.round(inWeek.reduce((sum, activity) => sum + estimateLoad(activity), 0))
  const bySport = inWeek.reduce<Record<string, number>>((acc, activity) => {
    acc[activity.sport] = (acc[activity.sport] ?? 0) + 1
    return acc
  }, {})
  return { sessions: inWeek.length, minutes, load, bySport, activities: inWeek }
}
