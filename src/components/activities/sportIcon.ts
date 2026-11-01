import type { LucideIcon } from 'lucide-react'
import { Activity, Bike, Dumbbell, Footprints, Trophy } from 'lucide-react'
import type { SportKind } from '../../types'

export const SPORT_ICON: Record<SportKind, LucideIcon> = {
  running: Footprints,
  strength: Dumbbell,
  racket: Trophy,
  cycling: Bike,
  other: Activity,
}
