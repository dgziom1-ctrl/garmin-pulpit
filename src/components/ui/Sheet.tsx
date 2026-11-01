import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}

export function Sheet({ open, onClose, title, description, children, footer, size = 'md' }: SheetProps) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Okno dialogowe'}
    >
      <button
        type="button"
        aria-label="Zamknij"
        className="absolute inset-0 cursor-default bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-slate-700/70 bg-ink-900 shadow-2xl sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800/80 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Zamknij okno"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="border-t border-slate-800/80 bg-slate-950/40 px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
