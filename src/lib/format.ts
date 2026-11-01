const PL = 'pl-PL'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function fmtNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(PL, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** Parsuje datę jako czas lokalny (ważne dla kluczy dziennych "YYYY-MM-DD"). */
export function parseLocalDate(value: string | Date): Date {
  // Zawsze zwracamy kopię — dzięki temu addDays/startOfWeek nie mutują wejścia.
  if (value instanceof Date) return new Date(value.getTime())
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function toISODate(value: string | Date): string {
  const date = parseLocalDate(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(value: string | Date, days: number): Date {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + days)
  return date
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function startOfWeek(value: string | Date): Date {
  const date = parseLocalDate(value)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function isoWeekKey(value: string | Date): string {
  const date = parseLocalDate(value)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayNumber = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNumber + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNumber = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000))
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export function fmtDateLong(value: string | Date): string {
  return new Intl.DateTimeFormat(PL, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parseLocalDate(value))
}

export function fmtDateShort(value: string | Date): string {
  return new Intl.DateTimeFormat(PL, { day: 'numeric', month: 'short' }).format(parseLocalDate(value))
}

export function fmtWeekday(value: string | Date): string {
  return new Intl.DateTimeFormat(PL, { weekday: 'long' }).format(parseLocalDate(value))
}

export function fmtWeekdayShort(value: string | Date): string {
  return new Intl.DateTimeFormat(PL, { weekday: 'short' }).format(parseLocalDate(value))
}

export function fmtDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fmtDateShort(value)
  return new Intl.DateTimeFormat(PL, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function fmtClock(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(PL, { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** 3725 -> "1:02:05", 754 -> "12:34" */
export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—'
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/** Czas wyścigu: "22:30" lub "1:45:12" */
export function fmtRaceTime(seconds: number | null | undefined): string {
  return fmtDuration(seconds)
}

export function fmtDurationHuman(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '—'
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours <= 0) return `${mins} min`
  if (mins === 0) return `${hours} godz`
  return `${hours} godz ${mins} min`
}

/** 312 -> "5:12 /km" */
export function fmtPace(secPerKm: number | null | undefined): string {
  if (secPerKm === null || secPerKm === undefined || !Number.isFinite(secPerKm)) return '—'
  return `${fmtDuration(Math.round(secPerKm))} /km`
}

export function fmtSpeed(kmh: number | null | undefined): string {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return '—'
  return `${fmtNumber(kmh, 1)} km/h`
}

export function fmtDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—'
  const km = meters / 1000
  return `${new Intl.NumberFormat(PL, {
    minimumFractionDigits: km < 10 ? 2 : 1,
    maximumFractionDigits: km < 10 ? 2 : 1,
  }).format(km)} km`
}

export function fmtDistanceShort(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—'
  return `${fmtNumber(meters / 1000, meters < 10000 ? 2 : 1)} km`
}

export function fmtRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'przed chwilą'
  if (diffMin < 60) return `${diffMin} min temu`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} godz. temu`
  const diffD = Math.round(diffH / 24)
  if (diffD === 1) return 'wczoraj'
  if (diffD < 7) return `${diffD} dni temu`
  return fmtDateShort(value)
}

/** Akceptuje "22:30", "1:45:30" lub samą liczbę minut ("105"). */
export function parseTimeToSeconds(input: string): number | null {
  const value = input.trim()
  if (!value) return null
  if (!value.includes(':')) {
    const minutes = Number(value.replace(',', '.'))
    if (!Number.isFinite(minutes) || minutes <= 0) return null
    return Math.round(minutes * 60)
  }
  const parts = value.split(':').map((part) => Number(part))
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null
  if (parts.length === 2) {
    const [minutes, seconds] = parts
    if (seconds >= 60) return null
    return Math.round(minutes * 60 + seconds)
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    if (minutes >= 60 || seconds >= 60) return null
    return Math.round(hours * 3600 + minutes * 60 + seconds)
  }
  return null
}

export function formatGoal(seconds: number | null): string {
  return seconds ? fmtRaceTime(seconds) : ''
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${fmtNumber(value, 0)}%`
}
