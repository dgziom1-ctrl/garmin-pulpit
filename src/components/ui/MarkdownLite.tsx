import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

function inline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g)
  return tokens.filter(Boolean).map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      )
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200"
        >
          {token.slice(1, -1)}
        </code>
      )
    }
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer noopener"
          className="text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-200"
        >
          {link[1]}
        </a>
      )
    }
    return <span key={index}>{token}</span>
  })
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

const SEPARATOR = /^\|?[\s:|-]+\|?$/

export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  let paragraph: string[] = []

  const flushList = () => {
    if (!list) return
    const current = list
    blocks.push(
      current.ordered ? (
        <ol key={`list-${blocks.length}`} className="my-2 ml-5 list-decimal space-y-1 text-slate-300">
          {current.items.map((item, index) => (
            <li key={index} className="pl-1">
              {inline(item)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`list-${blocks.length}`} className="my-2 ml-5 list-disc space-y-1 text-slate-300">
          {current.items.map((item, index) => (
            <li key={index} className="pl-1">
              {inline(item)}
            </li>
          ))}
        </ul>
      ),
    )
    list = null
  }

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const content = paragraph.join(' ')
    blocks.push(
      <p key={`p-${blocks.length}`} className="my-1.5 leading-relaxed text-slate-300">
        {inline(content)}
      </p>,
    )
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      flushParagraph()
      continue
    }

    // Tabela markdown
    if (
      trimmed.includes('|') &&
      lines[index + 1] &&
      SEPARATOR.test(lines[index + 1].trim()) &&
      lines[index + 1].includes('|')
    ) {
      flushList()
      flushParagraph()
      const header = splitRow(trimmed)
      const rows: string[][] = []
      let cursor = index + 2
      while (cursor < lines.length && lines[cursor].includes('|') && lines[cursor].trim()) {
        rows.push(splitRow(lines[cursor].trim()))
        cursor += 1
      }
      blocks.push(
        <div key={`table-${blocks.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-slate-800/60 text-slate-300">
              <tr>
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex} className="px-3 py-2 font-semibold">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="text-slate-400">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      index = cursor - 1
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed)
    if (heading) {
      flushList()
      flushParagraph()
      const level = heading[1].length
      blocks.push(
        <h4
          key={`h-${blocks.length}`}
          className={cn(
            'mb-1 mt-3 font-semibold text-white',
            level <= 2 ? 'text-base' : 'text-sm',
          )}
        >
          {inline(heading[2])}
        </h4>,
      )
      continue
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed)
    if (bullet) {
      flushParagraph()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      const active = list as { ordered: boolean; items: string[] }
      active.items.push(bullet[1])
      continue
    }

    const ordered = /^\d+[.)]\s+(.*)$/.exec(trimmed)
    if (ordered) {
      flushParagraph()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      const active = list as { ordered: boolean; items: string[] }
      active.items.push(ordered[1])
      continue
    }

    if (trimmed.startsWith('>')) {
      flushList()
      flushParagraph()
      blocks.push(
        <blockquote
          key={`q-${blocks.length}`}
          className="my-2 border-l-2 border-emerald-500/50 bg-emerald-500/5 px-3 py-2 text-sm italic text-slate-300"
        >
          {inline(trimmed.replace(/^>\s?/, ''))}
        </blockquote>,
      )
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList()
      flushParagraph()
      blocks.push(<hr key={`hr-${blocks.length}`} className="my-3 border-slate-800" />)
      continue
    }

    paragraph.push(trimmed)
  }

  flushList()
  flushParagraph()

  return <div className={cn('text-sm', className)}>{blocks}</div>
}
