import type { Tone } from '../../lib/metrics'

export const TONE_BADGE: Record<Tone, string> = {
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  cyan: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  slate: 'border-slate-600/40 bg-slate-700/20 text-slate-300',
  indigo: 'border-indigo-500/25 bg-indigo-500/10 text-indigo-300',
  violet: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
}

export const TONE_TEXT: Record<Tone, string> = {
  emerald: 'text-emerald-300',
  cyan: 'text-cyan-300',
  amber: 'text-amber-300',
  rose: 'text-rose-300',
  slate: 'text-slate-300',
  indigo: 'text-indigo-300',
  violet: 'text-violet-300',
}

export const TONE_DOT: Record<Tone, string> = {
  emerald: 'bg-emerald-400',
  cyan: 'bg-cyan-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  slate: 'bg-slate-400',
  indigo: 'bg-indigo-400',
  violet: 'bg-violet-400',
}

export const TONE_STROKE: Record<Tone, [string, string]> = {
  emerald: ['#34d399', '#22d3ee'],
  cyan: ['#22d3ee', '#818cf8'],
  amber: ['#fbbf24', '#fb923c'],
  rose: ['#fb7185', '#f43f5e'],
  slate: ['#94a3b8', '#64748b'],
  indigo: ['#818cf8', '#22d3ee'],
  violet: ['#a78bfa', '#818cf8'],
}

export const TONE_SURFACE: Record<Tone, string> = {
  emerald: 'from-emerald-500/15 to-transparent',
  cyan: 'from-cyan-500/15 to-transparent',
  amber: 'from-amber-500/15 to-transparent',
  rose: 'from-rose-500/15 to-transparent',
  slate: 'from-slate-500/15 to-transparent',
  indigo: 'from-indigo-500/15 to-transparent',
  violet: 'from-violet-500/15 to-transparent',
}
