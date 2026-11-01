import { useState } from 'react'
import { CheckCircle2, Download, Share, Smartphone } from 'lucide-react'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { Sheet } from './ui/Sheet'
import { cn } from '../lib/cn'

interface InstallPWAButtonProps {
  variant?: 'primary' | 'outline' | 'ghost'
  compact?: boolean
  className?: string
  onInstalled?: () => void
}

export function InstallPWAButton({
  variant = 'outline',
  compact = false,
  className,
  onInstalled,
}: InstallPWAButtonProps) {
  const { canInstall, installed, isIos, promptInstall } = usePwaInstall()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (installed) {
    return (
      <span className={cn('chip border-emerald-500/25 bg-emerald-500/10 text-emerald-300', className)}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {compact ? 'Zainstalowana' : 'Aplikacja zainstalowana'}
      </span>
    )
  }

  const handleClick = async () => {
    if (canInstall) {
      const outcome = await promptInstall()
      if (outcome === 'accepted') {
        setMessage('Aplikacja została zainstalowana.')
        onInstalled?.()
      }
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-outline',
          className,
        )}
      >
        {compact ? <Smartphone className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span className={compact ? 'sr-only' : undefined}>Zainstaluj aplikację</span>
      </button>

      {message ? <span className="sr-only">{message}</span> : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Zainstaluj Garmin Pulpit"
        description={
          isIos
            ? 'Na iPhone i iPadzie instalacja odbywa się przez Safari.'
            : 'Aplikacja działa jak natywna — z ikoną na pulpicie i trybem pełnoekranowym.'
        }
      >
        <ol className="space-y-4 text-sm text-slate-300">
          {isIos ? (
            <>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  1
                </span>
                <span>
                  Otwórz tę stronę w <strong className="text-white">Safari</strong> (nie w Chrome).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  2
                </span>
                <span className="flex items-center gap-2">
                  Dotknij ikony <Share className="h-4 w-4 text-cyan-300" /> <strong>Udostępnij</strong> na
                  dole ekranu.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  3
                </span>
                <span>
                  Wybierz <strong className="text-white">Dodaj do ekranu początkowego</strong> i potwierdź.
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  1
                </span>
                <span>
                  Otwórz aplikację w <strong className="text-white">Chrome</strong> lub{' '}
                  <strong className="text-white">Edge</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  2
                </span>
                <span>
                  Kliknij ikonę instalacji w pasku adresu albo menu{' '}
                  <strong className="text-white">⋮ → Zainstaluj aplikację</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300">
                  3
                </span>
                <span>Potwierdź — ikona pojawi się na pulpicie lub ekranie głównym.</span>
              </li>
            </>
          )}
        </ol>

        <p className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs leading-relaxed text-slate-500">
          Instalacja wymaga połączenia HTTPS. Adres Tailscale (
          <span className="text-slate-300">https://twojanazwa.ts.net</span>) spełnia ten warunek —
          zwykły adres IP w sieci lokalnej może nie pozwolić na instalację.
        </p>
      </Sheet>
    </>
  )
}
