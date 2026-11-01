export type SportKind = 'running' | 'strength' | 'racket' | 'cycling' | 'other'

export type RaceDistanceKey = '5k' | '10k' | 'half' | 'marathon'

export interface BodyBatteryState {
  current: number | null
  max: number | null
  min: number | null
  charged: number | null
  drained: number | null
}

export interface HrvState {
  nightlyAvg: number | null
  weeklyAvg: number | null
  status: string | null
  baselineLow: number | null
  baselineHigh: number | null
}

export interface SleepState {
  score: number | null
  durationMin: number | null
  deepMin: number | null
  remMin: number | null
  lightMin: number | null
  awakeMin: number | null
  quality: string | null
}

/** Ujednolicony dzienny stan zdrowia — niezależny od wariantów odpowiedzi backendu. */
export interface HealthSummary {
  date: string
  readiness: number | null
  readinessLabel: string | null
  bodyBattery: BodyBatteryState | null
  hrv: HrvState | null
  sleep: SleepState | null
  vo2max: number | null
  restingHr: number | null
  acuteLoad: number | null
  chronicLoad: number | null
  acr: number | null
  trainingStatus: string | null
  steps: number | null
  updatedAt: string | null
}

export type DailyHealth = HealthSummary

export interface Activity {
  id: string
  name: string
  sport: SportKind
  sportRaw: string
  startTime: string
  durationSec: number
  distanceM: number | null
  avgHr: number | null
  maxHr: number | null
  calories: number | null
  trainingLoad: number | null
  aerobicTe: number | null
  elevationGainM: number | null
  hrZones: number[] | null
}

export interface TsbPoint {
  date: string
  ctl: number
  atl: number
  tsb: number
}

export interface TsbResponse {
  current: TsbPoint
  history: TsbPoint[]
}

export interface BodyBatterySample {
  time: string
  level: number
}

export interface HealthSnapshot {
  summary: HealthSummary
  history: DailyHealth[]
  activities: Activity[]
  tsb: TsbResponse | null
  bodyBattery: BodyBatterySample[]
}

export interface ConnectionTestResult {
  ok: boolean
  latencyMs: number | null
  message: string
}

export interface Settings {
  apiBaseUrl: string
  apiKey: string
  demoMode: boolean
  autoRefresh: boolean
  geminiApiKey: string
  geminiModel: string
  athleteName: string
  goals: Record<RaceDistanceKey, string>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'model'
  text: string
  createdAt: number
}

export type PlanDayType = 'running' | 'strength' | 'racket' | 'cycling' | 'rest' | 'mobility'

export interface PlanDay {
  date: string
  day: string
  type: PlanDayType
  title: string
  details: string
  durationMin: number
  intensity: string
  load: number
}

export interface TrainingPlan {
  summary: string
  focus: string
  days: PlanDay[]
  generatedAt: string
}
