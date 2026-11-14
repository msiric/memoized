// @vitest-environment node
import colors from 'tailwindcss/colors'
import { describe, expect, it } from 'vitest'
import committed from '../code-tokens.json'
import { contrastRatio, parseHex } from '../primitives/contrast'
import { stepThroughLogs } from '../registry'
import { tokensFor } from './code-tokens'

const logs = stepThroughLogs()

describe('pre-computed code tokens', () => {
  it('match a fresh Shiki run for every preset (run `yarn viz:tokens` after editing code)', async () => {
    expect(await tokensFor(logs)).toEqual(committed)
  }, 60_000)

  it('are attached to every preset that shows code', () => {
    for (const log of logs) if (log.code) expect(log.code.tokens, log.id).toBeDefined()
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
