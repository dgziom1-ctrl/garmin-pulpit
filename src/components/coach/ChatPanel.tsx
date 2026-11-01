import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Loader2,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
} from 'lucide-react'
import type { ChatMessage } from '../../types'
import { GeminiError, streamChat } from '../../lib/gemini'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { MarkdownLite } from '../ui/MarkdownLite'

const SUGGESTIONS = [
  'Czy mogę dziś zrobić interwały?',
  'Zaplanuj tydzień pod 10 km',
  'Jak poprawić mój HRV i sen?',
  'Czy moje ACR jest bezpieczne?',
]

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  )
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px]',
          isUser
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          'max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-emerald-500/15 text-emerald-50'
            : 'rounded-tl-sm border border-slate-800/80 bg-slate-900/70 text-slate-200',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        ) : message.text ? (
          <MarkdownLite text={message.text} />
        ) : (
          <TypingDots />
        )}
      </div>
    </div>
  )
}

export function ChatPanel({
  apiKey,
  model,
  context,
  source,
}: {
  apiKey: string
  model: string
  context: string
  source: 'live' | 'demo'
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, streaming])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim()
    if (!text || streaming) return
    if (!apiKey.trim()) {
      setError('Brak klucza Gemini. Dodaj go w Ustawieniach.')
      return
    }

    setInput('')
    setError(null)
    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      text,
      createdAt: Date.now(),
    }
    const history = [...messages, userMessage]
    const assistantId = newId()

    setMessages([
      ...history,
      { id: assistantId, role: 'model', text: '', createdAt: Date.now() },
    ])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await streamChat({
        apiKey,
        model,
        context,
        signal: controller.signal,
        messages: history.slice(-20).map((message) => ({
          role: message.role,
          text: message.text,
        })),
        onToken: (chunk) => {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, text: message.text + chunk }
                : message,
            ),
          )
        },
      })
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      const message =
        caught instanceof GeminiError
          ? `${caught.message}${caught.hint ? ` ${caught.hint}` : ''}`
          : caught instanceof Error
            ? caught.message
            : 'Nie udało się wysłać wiadomości.'
      setError(message)
      setMessages((current) =>
        current.filter((item) => !(item.id === assistantId && item.text.length === 0)),
      )
    } finally {
      setStreaming(false)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const clear = () => {
    abortRef.current?.abort()
    setStreaming(false)
    setMessages([])
    setError(null)
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-b border-slate-800/80 p-4">
        <CardHeader
          title="Czat z trenerem"
          hint="Pełny kontekst: gotowość, HRV, sen, obciążenie, TSB i ostatnie aktywności."
          icon={<Sparkles className="h-4 w-4 text-indigo-300" />}
          action={
            <div className="flex items-center gap-1.5">
              <Badge tone={source === 'live' ? 'emerald' : 'amber'} dot>
                {source === 'live' ? 'dane na żywo' : 'demo'}
              </Badge>
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={clear}
                  className="btn-ghost h-8 w-8 p-0"
                  title="Wyczyść rozmowę"
                  aria-label="Wyczyść rozmowę"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          }
        />
      </div>

      <div
        ref={scrollRef}
        className="h-[52vh] min-h-[320px] max-h-[560px] space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-indigo-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-200">O co chcesz zapytać?</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
              Trener widzi Twoje metryki z Garmina i odpowiada po polsku, z konkretnymi
              rekomendacjami.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-emerald-500/40 hover:text-emerald-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} />)
        )}
      </div>

      {error ? (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5 text-[11px] text-rose-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void send()
              }
            }}
            rows={1}
            placeholder="Napisz do trenera… (Enter = wyślij)"
            className="input max-h-32 min-h-[42px] resize-none py-2.5"
            aria-label="Wiadomość do trenera"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="btn-outline h-[42px] w-[42px] shrink-0 p-0"
              aria-label="Zatrzymaj odpowiedź"
              title="Zatrzymaj"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!input.trim()}
              className="btn-primary h-[42px] w-[42px] shrink-0 p-0"
              aria-label="Wyślij wiadomość"
              title="Wyślij"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-600">
          {streaming ? (
            <span className="inline-flex items-center gap-1 text-indigo-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              Trener pisze…
            </span>
          ) : (
            'Odpowiedzi AI mogą zawierać błędy. Nie zastępują porady lekarza ani trenera na miejscu.'
          )}
        </p>
      </div>
    </Card>
  )
}
