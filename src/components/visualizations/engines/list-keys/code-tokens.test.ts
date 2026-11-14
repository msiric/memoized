// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import colors from 'tailwindcss/colors'
import { contrastRatio, parseHex } from '../../primitives/contrast'
import { tokenizeLines } from '../../step-log/code-tokens'
import { CODE, CODE_COLS, CODE_TOKENS, type CodeVariant } from './code'

/**
 * The list-keys code strip's pre-computed Shiki tokens. To regenerate after
 * editing `code.ts`: `LIST_KEYS_WRITE_TOKENS=1 yarn vitest run list-keys/code-tokens`.
 */
const FILE = path.join(__dirname, 'code-tokens.json')

/**
 * github-dark draws comments in #6A737D, 3.0:1 on the code surface. The strip
 * uses comments as labels ("// before"), so they take the gutter's zinc-400.
 */
const COLOR_FIX: Record<string, string> = {
  '#6A737D': colors.zinc[400].toUpperCase(),
}

async function fresh() {
  const out: Record<string, unknown> = {}
  for (const [id, c] of Object.entries(CODE) as [
    CodeVariant,
    (typeof CODE)[CodeVariant],
  ][]) {
    const lines = await tokenizeLines(c.lines, 'tsx')
    out[id] = lines.map((l) =>
      l.map((t) =>
        t.color && COLOR_FIX[t.color] ? { ...t, color: COLOR_FIX[t.color] } : t,
      ),
    )
  }
  return out
}

describe('list-keys code strip', () => {
  it('has committed tokens that match a fresh Shiki run', async () => {
    const tokens = await fresh()
    if (process.env.LIST_KEYS_WRITE_TOKENS)
      fs.writeFileSync(FILE, `${JSON.stringify(tokens, null, 1)}\n`)
    expect(CODE_TOKENS).toEqual(tokens)
  }, 60_000)

  it('spells every line exactly and fits 29 columns (280 px beside the stage)', () => {
    for (const [id, c] of Object.entries(CODE) as [
      CodeVariant,
      (typeof CODE)[CodeVariant],
    ][]) {
      expect(CODE_TOKENS[id].map((l) => l.map((t) => t.text).join(''))).toEqual(
        c.lines,
      )
    }
    expect(CODE_COLS).toBeLessThanOrEqual(29)
  })

  it('stays readable on the code surface (4.5:1 against zinc-900)', () => {
    const bg = parseHex(colors.zinc[900])
    for (const t of Object.values(CODE_TOKENS).flat(2)) {
      if (t.color)
        expect(
          contrastRatio(parseHex(t.color), bg),
          t.color,
        ).toBeGreaterThanOrEqual(4.5)
    }
  })
})
