// @vitest-environment node
import colors from 'tailwindcss/colors'
import { describe, expect, it } from 'vitest'
import committed from '../code-tokens.json'
import { contrastRatio, parseHex } from '../primitives/contrast'
import { stepThroughLogs } from '../registry'
import { rowTokens, tokenizeLines, tokensFor } from './code-tokens'

const logs = stepThroughLogs()

describe('pre-computed code tokens', () => {
  it('match a fresh Shiki run for every preset (run `yarn viz:tokens` after editing code)', async () => {
    expect(await tokensFor(logs)).toEqual(committed)
  }, 60_000)

  it('are attached to every preset that shows committed code (a practice answer gets its tokens when a page resolves it)', () => {
    for (const log of logs) if (log.code) expect(log.code.tokens, log.id)[log.code.premium ? 'toBeUndefined' : 'toBeDefined']()
  })

  it('stay readable on the code surface (4.5:1 against zinc-900)', () => {
    const bg = parseHex(colors.zinc[900])
    const used = new Set(
      Object.values(committed)
        .flat(2)
        .map((t) => t.color)
        .filter(Boolean) as string[],
    )
    for (const c of used) expect(contrastRatio(parseHex(c), bg), c).toBeGreaterThanOrEqual(4.5)
  })
})

describe('rowTokens (a reflowed practice-answer pane)', () => {
  it('cuts each row from its whole program line, so a string or comment broken over rows keeps its colour', async () => {
    const program = ["throw new Error('a b c d')", 'let x = 1 // one two']
    const rows = [
      { src: 1, wrap: [0, 0, 20] as const },
      { src: 1, wrap: [2, 21, 26] as const },
      { src: 2, wrap: [0, 0, 9] as const },
      { src: 2, text: '  // one two' },
    ]
    const got = await rowTokens(program, rows, 'js')
    const whole = await tokenizeLines(program, 'js')
    const stringColor = whole[0].find((t) => t.text.includes("'a"))!.color
    const commentColor = whole[1].find((t) => t.text.includes('//'))!.color
    expect(got.map((r) => r.map((t) => t.text).join(''))).toEqual(["throw new Error('a b", '  c d\')', 'let x = 1', '  // one two'])
    expect(got[1].filter((t) => t.text.trim()).every((t) => t.color === stringColor || t.text === ')')).toBe(true)
    expect(got[3].filter((t) => t.text.trim()).every((t) => t.color === commentColor)).toBe(true)
  })
})
