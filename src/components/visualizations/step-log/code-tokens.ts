/**
 * Pre-computed syntax tokens for step-through code panes (spec §5.5): Shiki
 * runs here, at authoring time, never in the browser. Node-only.
 *
 * Same theme as lesson code blocks (`github-dark`, see `src/mdx/rehype.mjs`).
 * `yarn viz:tokens` writes `code-tokens.json`; `code-tokens.test.ts` fails
 * when the committed tokens drift from the code.
 */
import colors from 'tailwindcss/colors'
import type { CodeToken, StepLog } from './types'

export const CODE_THEME = 'github-dark'
const LANGS = { js: 'javascript', ts: 'typescript', tsx: 'tsx' } as const

/**
 * github-dark draws comments in a grey that is 3.0:1 on the code surface;
 * a pane's comments take the gutter's zinc-400 instead (4.5:1, as the list
 * keys strip does; it prints as the comment twin, `CODE_PRINT`). Shiki merges
 * a comment into one token, so it is found by its text.
 */
export const COMMENT_COLOR = colors.zinc[400].toUpperCase()
const isComment = (t: CodeToken) => /^\s*(\/\/|\/\*)/.test(t.text)

export async function tokenizeLines(lines: readonly string[], lang: keyof typeof LANGS): Promise<CodeToken[][]> {
  const { codeToTokensBase } = await import('shiki')
  const rows = await codeToTokensBase(lines.join('\n'), { lang: LANGS[lang], theme: CODE_THEME })
  return rows.map((row) => {
    const merged: CodeToken[] = []
    for (const t of row) {
      const color = t.color?.toUpperCase()
      const prev = merged[merged.length - 1]
      if (prev && (prev.color === color || !t.content.trim())) prev.text += t.content
      else merged.push(color ? { text: t.content, color } : { text: t.content })
    }
    return merged.map((t) => (isComment(t) ? { ...t, color: COMMENT_COLOR } : t))
  })
}

/**
 * Tokens for a pane whose rows reflow program lines (a practice answer's
 * `DisplayRow`s): each program line is tokenized whole, in program order, so
 * a string or comment the pane breaks over rows keeps its colour on every
 * row (Shiki would read a continuation row as code), then each row takes its
 * slice of its line's tokens after its own indent.
 */
export async function rowTokens(
  programLines: readonly string[],
  rows: readonly ({ src: number; text: string } | { src: number; wrap: readonly [number, number, number] })[],
  lang: keyof typeof LANGS,
): Promise<CodeToken[][]> {
  const srcs = [...new Set(rows.map((r) => r.src))].sort((a, b) => a - b)
  const bodies = srcs.map((n) => (programLines[n - 1] ?? '').trimStart())
  const lineTokens = await tokenizeLines(bodies, lang)
  const bySrc = new Map(srcs.map((n, i) => [n, lineTokens[i]]))
  const pos = new Map<number, number>()
  return rows.map((r) => {
    const toks = bySrc.get(r.src) ?? []
    const body = [...(programLines[r.src - 1] ?? '').trimStart()]
    let from: number
    let to: number
    let indent: number
    if ('wrap' in r) [indent, from, to] = r.wrap
    else {
      const piece = r.text.trim()
      indent = [...r.text].length - [...r.text.trimStart()].length
      from = body.join('').indexOf(piece, pos.get(r.src) ?? 0)
      to = from + [...piece].length
    }
    pos.set(r.src, to)
    if (to <= from) return []
    const out: CodeToken[] = indent ? [{ text: ' '.repeat(indent) }] : []
    let at = 0
    for (const t of toks) {
      const cps = [...t.text]
      const a = Math.max(from, at)
      const b = Math.min(to, at + cps.length)
      if (b > a) {
        const text = cps.slice(a - at, b - at).join('')
        const prev = out[out.length - 1]
        if (prev && prev.color === t.color) prev.text += text
        else out.push(t.color ? { text, color: t.color } : { text })
      }
      at += cps.length
    }
    return out
  })
}

/**
 * Tokens for every committed pane. A practice answer's pane (`code.premium`)
 * is not committed text, so its tokens are made when a page resolves it
 * (`resolve-code.ts`), never written to `code-tokens.json`.
 */
export async function tokensFor(logs: readonly StepLog<unknown>[]): Promise<Record<string, CodeToken[][]>> {
  const out: Record<string, CodeToken[][]> = {}
  for (const log of logs) if (log.code && !log.code.premium) out[log.id] = await tokenizeLines(log.code.lines, log.code.lang)
  return out
}
