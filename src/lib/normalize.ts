import type {
  Activity,
  BodyBatterySample,
  DailyHealth,
  HealthSummary,
  SportKind,
  TsbPoint,
  TsbResponse,
} from '../types'
import { toISODate } from './format'

type Dict = Record<string, unknown>

export function isRecord(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Odporne pobieranie pola: kilka aliasów + warianty case-insensitive. */
export function pick(obj: unknown, ...keys: string[]): unknown {
  if (!isRecord(obj)) return undefined
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key]
  }
  const lower = new Map(Object.keys(obj).map((key) => [key.toLowerCase(), key]))
  for (const key of keys) {
    const realKey = lower.get(key.toLowerCase())
    if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') {
      return obj[realKey]
    }
  }
  return undefined
}

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => pick(acc, key), obj)
}

function first(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

export function toNum(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.')
    if (!cleaned) return null
    if (cleaned.includes(':')) {
      const parts = cleaned.split(':').map(Number)
      if (parts.every((part) => Number.isFinite(part))) {
        return parts.reduce((acc, part) => acc * 60 + part, 0)
      }
    }
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)
  if (isRecord(value)) {
    return toText(pick(value, 'name', 'label', 'status', 'level', 'description', 'typeKey'))
  }
  return null
}

function toIsoDate(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000
    return toISODate(new Date(ms))
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const parsed = new Date(trimmed.replace(' ', 'T'))
    if (!Number.isNaN(parsed.getTime())) return toISODate(parsed)
  }
  return null
}

function toIsoDateTime(value: unknown, fallbackDate?: string | null): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000
    return new Date(ms).toISOString()
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    const parsed = new Date(trimmed.replace(' ', 'T'))
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  const base = fallbackDate ? new Date(`${fallbackDate}T12:00:00`) : new Date()
  return base.toISOString()
}

function extractDate(raw: unknown): string | null {
  return toIsoDate(
    first(
      pick(raw, 'date', 'calendarDate', 'summaryDate', 'day', 'dateString', 'startTimeLocal', 'startTime'),
    ),
  )
}

function minutes(value: unknown): number | null {
  const num = toNum(value)
  return num === null ? null : num
}

function secondsToMinutes(value: unknown): number | null {
  const num = toNum(value)
  return num === null ? null : Math.round(num / 60)
}

export function normalizeSport(raw: string | null | undefined): SportKind {
  const value = (raw ?? '').toLowerCase()
  if (/(cycl|bike|rower|biking|ride|mtb)/.test(value)) return 'cycling'
  if (/(run|bieg|trail|treadmill|bieżn)/.test(value)) return 'running'
  if (/(tennis|padel|squash|badminton|racket|ping.?pong|tenis)/.test(value)) return 'racket'
  if (/(strength|weight|gym|fbw|sila|siła|indoor_cardio|fitness_equipment|cardio)/.test(value)) {
    return 'strength'
  }
  return 'other'
}

export function normalizeSummary(raw: unknown): HealthSummary {
  const root = isRecord(raw) ? raw : {}
  const candidate = first(pick(root, 'summary'), pick(root, 'latest'), pick(root, 'data'), root)
  const source = isRecord(candidate) ? candidate : root

  const readinessRaw = first(
    pick(source, 'readiness', 'trainingReadiness', 'training_readiness', 'readinessScore'),
  )
  const readinessObject = isRecord(readinessRaw) ? readinessRaw : null

  const hrvRaw = first(pick(source, 'hrv', 'hrvStatus', 'hrv_status', 'hrvSummary'))
  const hrv = isRecord(hrvRaw) ? hrvRaw : source
  const hrvBaseline = pick(hrv, 'baseline')

  const sleepRaw = first(pick(source, 'sleep', 'sleepData', 'sleep_summary', 'sleepSummary'))
  const sleep = isRecord(sleepRaw) ? sleepRaw : source
  const sleepDtoRaw = first(pick(sleep, 'dailySleepDTO'), sleep)
  const sleepDto = isRecord(sleepDtoRaw) ? sleepDtoRaw : sleep

  const batteryRaw = first(
    pick(source, 'bodyBattery', 'body_battery', 'bodyBatteryState', 'bodyBatterySummary'),
  )
  const battery = isRecord(batteryRaw) ? batteryRaw : source

  const acuteLoad = toNum(
    first(pick(source, 'acuteLoad', 'acute_load', 'acuteTrainingLoad'), pick(source, 'acute')),
  )
  const chronicLoad = toNum(
    first(pick(source, 'chronicLoad', 'chronic_load', 'chronicTrainingLoad'), pick(source, 'chronic')),
  )
  const acr =
    toNum(first(pick(source, 'acr', 'acuteChronicRatio', 'loadRatio', 'acwr'))) ??
    (acuteLoad !== null && chronicLoad !== null && chronicLoad > 0
      ? Math.round((acuteLoad / chronicLoad) * 100) / 100
      : null)

  const durationSeconds = toNum(
    first(
      pick(sleepDto, 'sleepTimeSeconds', 'totalSleepSeconds', 'durationInSeconds', 'durationSec'),
      pick(sleep, 'durationSec', 'totalSleepSeconds'),
    ),
  )

  return {
    date: extractDate(source) ?? toISODate(new Date()),
    readiness:
      toNum(readinessRaw) ??
      (readinessObject ? toNum(pick(readinessObject, 'score', 'value', 'level')) : null),
    readinessLabel: readinessObject
      ? toText(pick(readinessObject, 'level', 'label', 'feedback', 'status'))
      : toText(pick(source, 'readinessLabel', 'trainingStatus')),
    bodyBattery: {
      current: toNum(
        first(
          pick(
            battery,
            'current',
            'level',
            'value',
            'mostRecent',
            'bodyBatteryMostRecentValue',
            'body_battery_current',
          ),
        ),
      ),
      max: toNum(
        first(pick(battery, 'max', 'maximum', 'highest', 'body_battery_high', 'bodyBatteryHighestValue')),
      ),
      min: toNum(
        first(pick(battery, 'min', 'minimum', 'lowest', 'body_battery_low', 'bodyBatteryLowestValue')),
      ),
      charged: toNum(
        first(
          pick(battery, 'charged', 'totalCharged', 'chargedValue', 'body_battery_charged', 'bodyBatteryChargedValue'),
        ),
      ),
      drained: toNum(
        first(
          pick(battery, 'drained', 'totalDrained', 'drainedValue', 'body_battery_drained', 'bodyBatteryDrainedValue'),
        ),
      ),
    },
    hrv: {
      nightlyAvg: toNum(
        first(
          pick(hrv, 'nightlyAvg', 'lastNightAvg', 'last_night_avg', 'nightly_average', 'value'),
          pick(source, 'hrvLastNight', 'hrv_last_night'),
        ),
      ),
      weeklyAvg: toNum(
        first(
          pick(hrv, 'weeklyAvg', 'weekly_average', 'lastWeekAvg', 'sevenDayAvg'),
          pick(source, 'hrvWeeklyAvg'),
        ),
      ),
      status: toText(
        first(pick(hrv, 'status', 'hrvStatus', 'feedback', 'level'), pick(source, 'hrvStatus')),
      ),
      baselineLow: toNum(
        first(
          pick(hrv, 'baselineLow', 'baseline_low', 'balancedLow', 'lowUpper'),
          isRecord(hrvBaseline)
            ? pick(hrvBaseline, 'balancedLow', 'lowUpper', 'low', 'min')
            : undefined,
        ),
      ),
      baselineHigh: toNum(
        first(
          pick(hrv, 'baselineHigh', 'baseline_high', 'balancedUpper'),
          isRecord(hrvBaseline)
            ? pick(hrvBaseline, 'balancedUpper', 'markerValue', 'high', 'max')
            : undefined,
        ),
      ),
    },
    sleep: {
      score: toNum(
        first(
          pick(sleep, 'score', 'sleepScore', 'overallScore', 'sleep_score'),
          getPath(sleepDto, 'sleepScores.overall.value'),
        ),
      ),
      durationMin:
        minutes(first(pick(sleep, 'durationMin', 'totalSleepMinutes', 'sleepDurationMinutes'))) ??
        (durationSeconds !== null ? Math.round(durationSeconds / 60) : null),
      // Pola *_min są już w minutach; pola *Seconds trzeba przeliczyć.
      deepMin:
        minutes(first(pick(sleep, 'deepMin', 'deepSleepMinutes'))) ??
        secondsToMinutes(
          first(pick(sleepDto, 'deepSleepSeconds', 'deep_sleep_seconds'), pick(sleep, 'deepSleepSeconds')),
        ),
      remMin:
        minutes(first(pick(sleep, 'remMin', 'remSleepMinutes'))) ??
        secondsToMinutes(
          first(pick(sleepDto, 'remSleepSeconds', 'rem_sleep_seconds'), pick(sleep, 'remSleepSeconds')),
        ),
      lightMin:
        minutes(first(pick(sleep, 'lightMin', 'lightSleepMinutes'))) ??
        secondsToMinutes(
          first(pick(sleepDto, 'lightSleepSeconds', 'light_sleep_seconds'), pick(sleep, 'lightSleepSeconds')),
        ),
      awakeMin:
        minutes(first(pick(sleep, 'awakeMin', 'awakeMinutes'))) ??
        secondsToMinutes(
          first(
            pick(sleepDto, 'awakeSleepSeconds', 'awakeDurationSeconds', 'awake_sleep_seconds'),
            pick(sleep, 'awakeSleepSeconds', 'awakeDurationSeconds'),
          ),
        ),
      quality: toText(first(pick(sleep, 'quality', 'feedback', 'sleepQuality'), pick(sleepDto, 'sleepQuality'))),
    },
    vo2max: toNum(first(pick(source, 'vo2max', 'vo2Max', 'vo2_max', 'vo2MaxValue'))),
    restingHr: toNum(
      first(pick(source, 'restingHr', 'restingHeartRate', 'resting_hr', 'rhr')),
    ),
    acuteLoad,
    chronicLoad,
    acr,
    trainingStatus: toText(
      first(
        pick(source, 'trainingStatus', 'training_status', 'fitnessStatus'),
        pick(source, 'status'),
      ),
    ),
    steps: toNum(first(pick(source, 'steps', 'totalSteps', 'stepCount'))),
    updatedAt: toText(first(pick(source, 'updatedAt', 'updated_at', 'syncTime', 'lastSync'))),
  }
}

export function normalizeHistory(raw: unknown): DailyHealth[] {
  const root = isRecord(raw) ? raw : {}
  const listRaw = Array.isArray(raw)
    ? raw
    : first(pick(root, 'history'), pick(root, 'days'), pick(root, 'items'), pick(root, 'data'))
  if (!Array.isArray(listRaw)) return []

  const byDate = new Map<string, DailyHealth>()
  for (const item of listRaw) {
    if (!isRecord(item) || !extractDate(item)) continue
    const day = normalizeSummary(item)
    byDate.set(day.date, day)
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeZones(activity: Dict): number[] | null {
  const direct = first(
    pick(activity, 'hrZones', 'hr_zones', 'heartRateZones', 'zones', 'hrTimeInZone'),
  )

  if (Array.isArray(direct)) {
    const values = direct.map((entry) => toNum(entry))
    if (values.some((value) => value !== null)) {
      return values.map((value) => value ?? 0).slice(0, 5)
    }
  }

  if (isRecord(direct)) {
    const values = [1, 2, 3, 4, 5].map((index) =>
      toNum(pick(direct, `z${index}`, `zone${index}`, `zone_${index}`, `zone${index}Seconds`)),
    )
    if (values.some((value) => value !== null)) {
      return values.map((value) => value ?? 0)
    }
  }

  const flat = [1, 2, 3, 4, 5].map((index) =>
    toNum(
      pick(
        activity,
        `hrTimeInZone_${index}`,
        `hrTimeInZone${index}`,
        `hr_zone_${index}`,
        `zone${index}Seconds`,
      ),
    ),
  )
  return flat.some((value) => value !== null) ? flat.map((value) => value ?? 0) : null
}

export function normalizeActivities(raw: unknown): Activity[] {
  const root = isRecord(raw) ? raw : {}
  const listRaw = Array.isArray(raw)
    ? raw
    : first(
        pick(root, 'activities'),
        pick(root, 'items'),
        pick(root, 'data'),
        pick(root, 'recent'),
        pick(root, 'recentActivities'),
      )
  if (!Array.isArray(listRaw)) return []

  const activities: Activity[] = []
  listRaw.forEach((item, index) => {
    if (!isRecord(item)) return

    const startTime = toIsoDateTime(
      first(
        pick(item, 'startTime', 'startTimeLocal', 'start_time', 'startTimeGmt', 'beginTime'),
      ),
    )
    const date = toIsoDate(startTime)
    const sportRaw =
      toText(
        first(
          getPath(item, 'activityType.typeKey'),
          pick(item, 'sportType', 'sport', 'typeKey', 'activityType', 'type'),
        ),
      ) ?? 'other'
    const distance = toNum(first(pick(item, 'distanceM', 'distance', 'distance_m', 'distanceInMeters')))
    const duration = toNum(
      first(
        pick(item, 'durationSec', 'duration', 'movingDuration', 'elapsedDuration', 'durationInSeconds'),
      ),
    )

    activities.push({
      id:
        toText(first(pick(item, 'id', 'activityId', 'activity_id', 'uuid'))) ??
        `${date ?? 'x'}-${index}`,
      name: toText(first(pick(item, 'name', 'activityName', 'title'))) ?? 'Trening',
      sport: normalizeSport(sportRaw),
      sportRaw,
      startTime,
      durationSec: Math.max(0, Math.round(duration ?? 0)),
      distanceM: distance,
      avgHr: toNum(first(pick(item, 'avgHr', 'averageHR', 'avgHeartRate', 'averageHr'))),
      maxHr: toNum(first(pick(item, 'maxHr', 'maxHR', 'maxHeartRate'))),
      calories: toNum(first(pick(item, 'calories', 'activeKilocalories', 'totalCalories'))),
      trainingLoad: toNum(
        first(pick(item, 'trainingLoad', 'activityTrainingLoad', 'load', 'training_load')),
      ),
      aerobicTe: toNum(first(pick(item, 'aerobicTe', 'aerobicTrainingEffect', 'aerobicTE'))),
      elevationGainM: toNum(first(pick(item, 'elevationGainM', 'elevationGain', 'totalAscent'))),
      hrZones: normalizeZones(item),
    })
  })

  return activities.sort((a, b) => b.startTime.localeCompare(a.startTime))
}

function normalizeTsbPoint(raw: unknown, fallbackDate?: string | null): TsbPoint | null {
  if (!isRecord(raw)) return null
  const ctl = toNum(first(pick(raw, 'ctl', 'fitness', 'CTL', 'chronicLoad')))
  const atl = toNum(first(pick(raw, 'atl', 'fatigue', 'ATL', 'acuteLoad')))
  const tsbValue = toNum(first(pick(raw, 'tsb', 'form', 'TSB', 'balance')))
  const date = extractDate(raw) ?? fallbackDate
  if (!date || ctl === null || atl === null) return null
  return {
    date,
    ctl: Math.round(ctl * 10) / 10,
    atl: Math.round(atl * 10) / 10,
    tsb: Math.round((tsbValue ?? ctl - atl) * 10) / 10,
  }
}

export function normalizeTsb(raw: unknown): TsbResponse | null {
  const root = isRecord(raw) ? raw : {}
  const historyRaw = Array.isArray(raw)
    ? raw
    : first(
        pick(root, 'history'),
        pick(root, 'series'),
        pick(root, 'points'),
        pick(root, 'data'),
        pick(root, 'daily'),
      )

  const history: TsbPoint[] = []
  if (Array.isArray(historyRaw)) {
    historyRaw.forEach((item) => {
      const point = normalizeTsbPoint(item)
      if (point) history.push(point)
    })
  }

  const currentRaw = first(pick(root, 'current'), pick(root, 'today'), pick(root, 'latest'))
  const current = normalizeTsbPoint(currentRaw) ?? history[history.length - 1] ?? null
  if (!current && history.length === 0) return null

  const sorted = history.sort((a, b) => a.date.localeCompare(b.date))
  return {
    current: current ?? sorted[sorted.length - 1],
    history: sorted,
  }
}

export function normalizeBodyBatterySamples(raw: unknown): BodyBatterySample[] {
  const root = isRecord(raw) ? raw : {}
  const listRaw = Array.isArray(raw)
    ? raw
    : first(
        pick(root, 'samples'),
        pick(root, 'bodyBattery'),
        pick(root, 'values'),
        pick(root, 'data'),
        pick(root, 'bodyBatteryValuesArray'),
      )

  if (!Array.isArray(listRaw)) return []

  const samples: BodyBatterySample[] = []
  for (const entry of listRaw) {
    if (Array.isArray(entry)) {
      const level = toNum(entry[1])
      const time = toIsoDateTime(entry[0])
      if (level !== null && level >= 0 && level <= 100) samples.push({ time, level })
      continue
    }
    if (!isRecord(entry)) continue
    const level = toNum(first(pick(entry, 'level', 'value', 'battery', 'bodyBatteryLevel')))
    const time = first(pick(entry, 'time', 'timestamp', 'datetime', 'startTime', 'dateTime'))
    if (level === null || level < 0 || level > 100 || time === undefined) continue
    samples.push({ time: toIsoDateTime(time), level })
  }

  return samples.sort((a, b) => a.time.localeCompare(b.time))
}
