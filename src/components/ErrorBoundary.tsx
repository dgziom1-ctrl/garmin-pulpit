import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nieoczekiwany błąd aplikacji:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/25 bg-slate-900/70 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-2xl">
            ⚠️
          </div>
          <h1 className="text-lg font-semibold text-white">Coś poszło nie tak</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Aplikacja napotkała nieoczekiwany błąd. Odśwież stronę — dane w API i localStorage
            pozostają nietknięte.
          </p>
          {this.state.message ? (
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/80 p-3 text-left text-[11px] text-rose-200">
              {this.state.message}
            </pre>
          ) : null}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-5 text-xs"
          >
            Odśwież aplikację
          </button>
        </div>
      </div>
    )
  }
}
