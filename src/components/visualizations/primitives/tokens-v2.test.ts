import colors from 'tailwindcss/colors'
import { describe, expect, it } from 'vitest'
import { MIN_GRAPHIC_CONTRAST, MIN_TEXT_CONTRAST, contrastRatio, over, parseHex, toHex, type RGB } from './contrast'
import {
  contrastPairs,
  motion,
  motionRules,
  roles,
  surfaces,
  type,
  TEXT_FLOOR_PX,
  space,
  type Layer,
  type PaletteRef,
} from './tokens-v2'
import * as tokens from './tokens-v2'

const palette = colors as unknown as Record<string, Record<string, string> | string>

function resolve(ref: PaletteRef | 'white'): RGB {
  if (ref === 'white') return parseHex('#ffffff')
  const [name, shade] = ref.split('.')
  const family = palette[name]
  if (!family || typeof family === 'string' || !family[shade]) throw new Error(`Unknown palette ref ${ref}`)
  return parseHex(family[shade])
}

function composite(layers: Layer[]): RGB {
  const [base, ...rest] = layers
  if (base.alpha !== undefined && base.alpha !== 1) throw new Error('The bottom layer must be opaque')
  return rest.reduce<RGB>((acc, l) => over(resolve(l.color), l.alpha ?? 1, acc), resolve(base.color))
}

describe('tokens v2: contrast (WCAG 1.4.3 / 1.4.11, spec A6)', () => {
  it('composites the dark frame surface to the spec value #1e1e21', () => {
    expect(toHex(composite(surfaces.frame.dark))).toBe('#1e1e21')
  })

  for (const theme of ['dark', 'light'] as const) {
    describe(theme, () => {
      for (const pair of contrastPairs) {
        const min = pair.kind === 'text' ? MIN_TEXT_CONTRAST : MIN_GRAPHIC_CONTRAST
        it(`${pair.use}: ${pair.fg[theme]} on ${pair.bg} >= ${min}:1`, () => {
          const ratio = contrastRatio(resolve(pair.fg[theme]), composite(surfaces[pair.bg][theme]))
          expect(ratio, `${pair.use} (${theme}) is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min)
        })
      }
    })
  }

  it('reproduces the ratios published in spec §2.1 (dark, on the frame)', () => {
    const frame = composite(surfaces.frame.dark)
    const published: Partial<Record<keyof typeof roles, number>> = {
      inkMuted: 6.49,
      line: 3.44,
      now: 11.03,
      result: 9.96,
      micro: 6.11,
      queued: 7.76,
      removed: 6.18,
    }
    for (const [role, ratio] of Object.entries(published)) {
      const actual = contrastRatio(resolve(roles[role as keyof typeof roles].dark), frame)
      expect(actual.toFixed(2), role).toBe(ratio.toFixed(2))
    }
  })

  it('gives every informational hue exactly one role (one meaning per hue)', () => {
    const hues = Object.entries(roles)
      .filter(([name]) => !['ink', 'inkMuted', 'line', 'hairline', 'done'].includes(name))
      .map(([, role]) => role.dark.split('.')[0])
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('names a non-color channel for every hued role (A7)', () => {
    for (const name of ['now', 'result', 'micro', 'queued', 'removed', 'done'] as const) {
      expect(roles[name].channel.length, name).toBeGreaterThan(10)
    }
  })

  it('writes every role color into its class strings (tokens cannot drift from the tested values)', () => {
    const cls = (ref: PaletteRef) => ref.replace('.', '-')
    expect(tokens.ink.muted).toContain(`text-${cls(roles.inkMuted.dark)}`)
    expect(tokens.ink.now).toContain(`text-${cls(roles.now.dark)}`)
    expect(tokens.ink.result).toContain(`text-${cls(roles.result.dark)}`)
    expect(tokens.ink.removed).toContain(`text-${cls(roles.removed.dark)}`)
    expect(tokens.stroke.micro).toContain(`border-${cls(roles.micro.dark)}`)
    expect(tokens.stroke.queued).toContain(`border-${cls(roles.queued.dark)}`)
    expect(tokens.stroke.line).toContain(`border-${cls(roles.line.dark)}`)
    expect(tokens.ink.muted).toContain(`print:text-${cls(roles.inkMuted.light)}`)
    expect(tokens.focusRing).toContain(`outline-${cls(roles.now.dark)}`)
  })
})

describe('tokens v2: type and space', () => {
  it('never sets text below the 12 px floor', () => {
    for (const [name, t] of Object.entries(type)) {
      expect(t.size, name).toBeGreaterThanOrEqual(TEXT_FLOOR_PX)
      expect(t.cls, name).toContain(`text-[${t.size}px]`)
    }
  })

  it('keeps spacing on the 8 pt rhythm', () => {
    for (const v of Object.values(space)) expect(v % 8).toBe(0)
  })
})

describe('tokens v2: motion (§4)', () => {
  it('keeps every tween at or under 300 ms and the reduced variant at or under 150 ms', () => {
    for (const [name, t] of Object.entries(motion)) {
      if (t.full.type === 'tween') expect(t.full.duration * 1000, name).toBeLessThanOrEqual(motionRules.maxTransitionMs)
      expect(t.reduced.duration * 1000, name).toBeLessThanOrEqual(150)
      expect(t.reduced.distance ?? 0, `${name} reduced must not translate`).toBe(0)
    }
  })

  it('uses a critically damped move spring (no overshoot) that settles in about 250 ms', () => {
    const m = motion.move.full
    if (m.type !== 'spring') throw new Error('move must be a spring')
    expect(m).toMatchObject({ stiffness: 520, damping: 46, mass: 1 })
    const ratio = m.damping / (2 * Math.sqrt(m.stiffness * m.mass))
    expect(ratio).toBeGreaterThanOrEqual(1)
    // Critically damped settle time to within 2 %: about 5.8 / omega.
    const settleMs = (5.8 / Math.sqrt(m.stiffness / m.mass)) * 1000
    expect(settleMs).toBeLessThan(motionRules.maxTransitionMs)
  })

  it('fits every transition into 40 % of the 2x play interval', () => {
    const budget = motionRules.playIntervalMs[2] * motionRules.maxTransitionShareOfInterval
    for (const t of Object.values(motion)) {
      const ms = t.full.type === 'tween' ? t.full.duration * 1000 : t.full.settleMs
      expect(ms).toBeLessThanOrEqual(budget)
    }
  })
})
