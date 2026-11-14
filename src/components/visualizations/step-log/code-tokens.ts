/**
 * Pre-computed syntax tokens for step-through code panes (spec §5.5): Shiki
 * runs here, at authoring time, never in the browser. Node-only.
 *
 * Same theme as lesson code blocks (`github-dark`, see `src/mdx/rehype.mjs`).
 * `yarn viz:tokens` writes `code-tokens.json`; `code-tokens.test.ts` fails
 * when the committed tokens drift from the code.
 */
import type { CodeToken, StepLog } from './types'

export const CODE_THEME = 'github-dark'
const LANGS = { js: 'javascript', ts: 'typescript', tsx: 'tsx' } as const

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
    return merged
  })
}

export async function tokensFor(logs: readonly StepLog<unknown>[]): Promise<Record<string, CodeToken[][]>> {
  const out: Record<string, CodeToken[][]> = {}
  for (const log of logs) if (log.code) out[log.id] = await tokenizeLines(log.code.lines, log.code.lang)
  return out
}
