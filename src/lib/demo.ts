import type {
  Activity,
  BodyBatterySample,
  DailyHealth,
  HealthSnapshot,
  SportKind,
  TsbPoint,
} from '../types'
import { addDays, clamp, round, toISODate } from './format'
import { computeTsb } from './metrics'

/** Deterministyczny generator — dzięki temu demo nie „skacze” między odświeżeniami. */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function atLocalHour(date: Date, hour: number, minute = 0): string {
  const copy = new Date(date)
  copy.setHours(hour, minute, 0, 0)
  return copy.toISOString()
}

function zonesFrom(durationSec: number, weights: number[]): number[] {
  const sum = weights.reduce((acc, value) => acc + value, 0)
  return weights.map((weight) => Math.round((durationSec * weight) / sum))
}

function pickSportName(sport: SportKind, variant: number): string {
  const names: Record<SportKind, string[]> = {
    running: ['Bieg spokojny', 'Bieg w tempie', 'Długie wybieganie', 'Bieg regeneracyjny'],
    strength: ['FBW — góra', 'FBW — dół', 'Trening siłowy', 'FBW — full body'],
    racket: ['Padel', 'Tenis — gra', 'Squash', 'Tenis — sparing'],
    cycling: ['Rower — tlenowo', 'Rower — regeneracja'],
    other: ['Spacer', 'Mobility'],
  }
  const list = names[sport]
  return list[variant % list.length]
}

interface SessionTemplate {
  sport: SportKind
  durationSec: number
  distanceM: number | null
  avgHr: number
  maxHr: number
  load: number
  zoneWeights: number[]
  variant: number
}

function buildSession(rng: () => number, sport: SportKind): SessionTemplate {
  if (sport === 'running') {
    const variant = Math.floor(rng() * 4)
    if (variant === 2) {
      const minutes = 75 + Math.round(rng() * 35)
      return {
        sport,
        durationSec: minutes * 60,
        distanceM: Math.round(minutes * 60 * (2.85 + rng() * 0.2)),
        avgHr: 142 + Math.round(rng() * 8),
        maxHr: 168 + Math.round(rng() * 8),
        load: 110 + Math.round(rng() * 40),
        zoneWeights: [4, 9, 3, 0.6, 0],
        variant,
      }
    }
    if (variant === 1) {
      const minutes = 42 + Math.round(rng() * 16)
      return {
        sport,
        durationSec: minutes * 60,
        distanceM: Math.round(minutes * 60 * (3.5 + rng() * 0.3)),
        avgHr: 158 + Math.round(rng() * 8),
        maxHr: 180 + Math.round(rng() * 6),
        load: 85 + Math.round(rng() * 30),
        zoneWeights: [1, 4, 5, 3, 0.5],
        variant,
      }
    }
    const minutes = 40 + Math.round(rng() * 25)
    return {
      sport,
      durationSec: minutes * 60,
      distanceM: Math.round(minutes * 60 * (3.0 + rng() * 0.25)),
      avgHr: 134 + Math.round(rng() * 8),
      maxHr: 156 + Math.round(rng() * 8),
      load: 48 + Math.round(rng() * 28),
      zoneWeights: [5, 10, 2, 0, 0],
      variant,
    }
  }

  if (sport === 'strength') {
    const minutes = 55 + Math.round(rng() * 25)
    return {
      sport,
      durationSec: minutes * 60,
      distanceM: null,
      avgHr: 118 + Math.round(rng() * 12),
      maxHr: 148 + Math.round(rng() * 12),
      load: 42 + Math.round(rng() * 26),
      zoneWeights: [4, 8, 4, 1, 0],
      variant: Math.floor(rng() * 4),
    }
  }

  if (sport === 'racket') {
    const minutes = 60 + Math.round(rng() * 35)
    return {
      sport,
      durationSec: minutes * 60,
      distanceM: Math.round((3 + rng() * 2.5) * 1000),
      avgHr: 138 + Math.round(rng() * 12),
      maxHr: 168 + Math.round(rng() * 12),
      load: 68 + Math.round(rng() * 32),
      zoneWeights: [2, 5, 6, 3, 0.5],
      variant: Math.floor(rng() * 4),
    }
  }

  const minutes = 85 + Math.round(rng() * 45)
  return {
    sport: 'cycling',
    durationSec: minutes * 60,
    distanceM: Math.round(minutes * 60 * (6.4 + rng() * 1.4)),
    avgHr: 122 + Math.round(rng() * 12),
    maxHr: 150 + Math.round(rng() * 10),
    load: 70 + Math.round(rng() * 35),
    zoneWeights: [5, 9, 3, 0.5, 0],
    variant: Math.floor(rng() * 2),
  }
}

function buildActivities(): Activity[] {
  const rng = mulberry32(20261101)
  const activities: Activity[] = []
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  for (let offset = 150; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const weekday = date.getDay()
    let sport: SportKind | null = null

    if (weekday === 1 || weekday === 4) sport = 'strength'
    else if (weekday === 2) sport = 'running'
    else if (weekday === 3) sport = rng() > 0.3 ? 'racket' : null
    else if (weekday === 6) sport = 'running'
    else if (weekday === 5) sport = rng() > 0.55 ? 'running' : null
    else if (weekday === 0) sport = rng() > 0.68 ? 'cycling' : null

    if (!sport) continue
    if (offset < 2 && rng() > 0.5) continue

    const session = buildSession(rng, sport)
    const hour = weekday === 0 || weekday === 6 ? 10 : 18
    const startTime = atLocalHour(date, hour, Math.floor(rng() * 40))

    activities.push({
      id: `demo-${offset}-${sport}`,
      name: pickSportName(sport, session.variant),
      sport,
      sportRaw: sport,
      startTime,
      durationSec: session.durationSec,
      distanceM: session.distanceM,
      avgHr: session.avgHr,
      maxHr: session.maxHr,
      calories: Math.round((session.durationSec / 60) * (7 + rng() * 4)),
      trainingLoad: session.load,
      aerobicTe: round(2 + rng() * 2.6, 1),
      elevationGainM: sport === 'running' ? Math.round(30 + rng() * 120) : null,
      hrZones: zonesFrom(session.durationSec, session.zoneWeights),
    })
  }

  return activities.sort((a, b) => b.startTime.localeCompare(a.startTime))
}

function buildHistory(activities: Activity[]): DailyHealth[] {
  const rng = mulberry32(77123)
  const history: DailyHealth[] = []
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const hardDays = new Set(
    activities
      .filter((activity) => (activity.trainingLoad ?? 0) >= 85)
      .map((activity) => toISODate(activity.startTime)),
  )

  for (let offset = 119; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const dateKey = toISODate(date)
    const progress = (119 - offset) / 119
    const wave = Math.sin((119 - offset) / 8) * 4 + Math.cos((119 - offset) / 17) * 3
    const hard = hardDays.has(dateKey)

    const hrvNight = round(clamp(57 + wave - (hard ? 6 : 0) + rng() * 4 - 2, 34, 82), 0)
    const hrvWeek = round(clamp(56 + wave * 0.6 + rng() * 2, 40, 75), 0)
    const sleepScore = Math.round(
      clamp(76 + wave * 0.5 - (hard ? 7 : 0) + rng() * 10 - 5, 38, 98),
    )
    const sleepDuration = Math.round(clamp(430 - (hard ? 35 : 0) + rng() * 45 - 22, 280, 540))
    const deep = Math.round(sleepDuration * (0.16 + rng() * 0.05))
    const rem = Math.round(sleepDuration * (0.19 + rng() * 0.05))
    const awake = Math.round(sleepDuration * (0.03 + rng() * 0.03))
    const light = Math.max(0, sleepDuration - deep - rem - awake)

    const acute = Math.round(clamp(430 + wave * 12 + (hard ? 90 : -10) + rng() * 50, 180, 760))
    const chronic = Math.round(clamp(420 + progress * 40 + wave * 5 + rng() * 25, 200, 650))
    const acr = round(acute / chronic, 2)
    const readiness = Math.round(
      clamp(62 + (hrvNight - 57) * 1.1 + (sleepScore - 76) * 0.7 - (acr > 1.35 ? 10 : 0) + rng() * 8, 22, 97),
    )
    const batteryMax = Math.round(clamp(88 + rng() * 10, 70, 100))
    const batteryMin = Math.round(clamp(12 + rng() * 18, 5, 40))
    const batteryNow = Math.round(
      clamp(batteryMax - (hard ? 28 : 12) - rng() * 12, batteryMin, batteryMax),
    )

    history.push({
      date: dateKey,
      readiness,
      readinessLabel: null,
      bodyBattery: {
        current: batteryNow,
        max: batteryMax,
        min: batteryMin,
        charged: Math.round(55 + rng() * 25),
        drained: Math.round(50 + rng() * 25),
      },
      hrv: {
        nightlyAvg: hrvNight,
        weeklyAvg: hrvWeek,
        status: hrvNight < 48 ? 'LOW' : hrvNight > 68 ? 'HIGH' : 'BALANCED',
        baselineLow: 50,
        baselineHigh: 64,
      },
      sleep: {
        score: sleepScore,
        durationMin: sleepDuration,
        deepMin: deep,
        remMin: rem,
        lightMin: light,
        awakeMin: awake,
        quality: sleepScore > 85 ? 'EXCELLENT' : sleepScore > 70 ? 'GOOD' : sleepScore > 55 ? 'FAIR' : 'POOR',
      },
      vo2max: round(51.5 + progress * 2.4 + rng() * 0.4, 1),
      restingHr: Math.round(clamp(53 - progress * 3 + (hard ? 2 : 0) + rng() * 2, 44, 62)),
      acuteLoad: acute,
      chronicLoad: chronic,
      acr,
      trainingStatus: acr > 1.4 ? 'OVERREACHING' : progress > 0.5 ? 'PRODUCTIVE' : 'MAINTAINING',
      steps: Math.round(7000 + rng() * 6500),
      updatedAt: new Date().toISOString(),
    })
  }

  return history
}

function buildBodyBattery(): BodyBatterySample[] {
  const rng = mulberry32(9981)
  const samples: BodyBatterySample[] = []
  const today = new Date()
  today.setHours(6, 0, 0, 0)

  for (let index = 0; index <= 34; index += 1) {
    const time = new Date(today.getTime() + index * 30 * 60 * 1000)
    const hour = time.getHours() + time.getMinutes() / 60
    const base = 34 + Math.sin(((hour - 6) / 17) * Math.PI) * 44
    const eveningDip = hour > 18 ? (hour - 18) * 5 : 0
    const level = Math.round(clamp(base - eveningDip + rng() * 5 - 2, 8, 97))
    samples.push({ time: time.toISOString(), level })
  }

  return samples
}

let cached: HealthSnapshot | null = null

export function getDemoSnapshot(): HealthSnapshot {
  if (cached) return cached

  const activities = buildActivities()
  const history = buildHistory(activities)
  const battery = buildBodyBattery()
  const tsbSeries: TsbPoint[] = computeTsb(activities, 120)
  const summary: DailyHealth = {
    ...history[history.length - 1],
    bodyBattery: {
      ...(history[history.length - 1].bodyBattery ?? {
        current: null,
        max: null,
        min: null,
        charged: null,
        drained: null,
      }),
      current: battery[24]?.level ?? history[history.length - 1].bodyBattery?.current ?? null,
    },
    updatedAt: new Date().toISOString(),
  }

  cached = {
    summary,
    history,
    activities,
    tsb: tsbSeries.length
      ? { current: tsbSeries[tsbSeries.length - 1], history: tsbSeries }
      : null,
    bodyBattery: battery,
  }

  return cached
}
