import colors from 'tailwindcss/colors'
import { describe, expect, it } from 'vitest'
import { MIN_GRAPHIC_CONTRAST, MIN_TEXT_CONTRAST, contrastRatio, over, parseHex, toHex, type RGB } from './contrast'
import config from '../../../../tailwind.config'
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
} from './tokens-v3'
import * as tokens from './tokens-v3'

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

describe('tokens v3: contrast (WCAG 1.4.3 / 1.4.11, spec A6)', () => {
  it('composites the dark frame surface to the spec value #1e1e21', () => {
    expect(toHex(composite(surfaces.frame.dark))).toBe('#1e1e21')
  })

  it('derives the opaque vz-frame color from the palette, matching the composite', () => {
    const value = (config.theme.extend as { colors: Record<string, string> }).colors['vz-frame']
    const m = /^color-mix\(in srgb, (#[0-9a-f]{6}) (\d+)%, (#[0-9a-f]{6})\)$/i.exec(value)
    expect(m, value).not.toBeNull()
    const [, top, pct, under] = m!
    expect(top).toBe(palette.zinc && (palette.zinc as Record<string, string>)['800'])
    expect(under).toBe((palette.zinc as Record<string, string>)['900'])
    expect(toHex(over(parseHex(top), Number(pct) / 100, parseHex(under)))).toBe(toHex(composite(surfaces.frame.dark)))
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
      .filter(([name]) => ['now', 'result', 'micro', 'queued', 'removed'].includes(name))
      .map(([, role]) => role.dark.split('.')[0])
    expect(new Set(hues).size).toBe(hues.length)
    // Amber is output only (D4): no other role or surface uses it.
    for (const [name, role] of Object.entries(roles))
      if (name !== 'result') expect(role.dark.startsWith('amber'), name).toBe(false)
  })

  it('names a non-color channel for every hued role (A7)', () => {
    for (const name of ['now', 'result', 'micro', 'queued', 'removed', 'done'] as const) {
      expect(roles[name].channel.length, name).toBeGreaterThan(10)
    }
  })

  it('writes every role color into its class strings (tokens cannot drift from the tested values)', () => {
    const cls = (ref: string) => ref.replace('.', '-')
    expect(tokens.ink.muted).toContain(`text-${cls(roles.inkMuted.dark)}`)
    expect(tokens.ink.now).toContain(`text-${cls(roles.now.dark)}`)
    expect(tokens.ink.result).toContain(`text-${cls(roles.result.dark)}`)
    expect(tokens.ink.removed).toContain(`text-${cls(roles.removed.dark)}`)
    expect(tokens.stroke.micro).toContain(`border-${cls(roles.micro.dark)}`)
    expect(tokens.stroke.queued).toContain(`border-${cls(roles.queued.dark)}`)
    expect(tokens.stroke.line).toContain(`border-${cls(roles.line.dark)}`)
    expect(tokens.ink.muted).toContain(`print:text-${cls(roles.inkMuted.light)}`)
    expect(tokens.focusRing).toContain(`outline-${cls(roles.focus.dark)}`)
    expect(tokens.focusRingGroup).toContain(`outline-${cls(roles.focus.dark)}`)
    expect(tokens.focusRingHas).toContain(`outline-${cls(roles.focus.dark)}`)
    expect(tokens.now.glyph).toContain(`border-${cls(roles.now.dark)}`)
    expect(tokens.stroke.hairline).toContain(`border-${cls(roles.hairline.dark)}`)
    expect(tokens.frameCls).toContain(`border-${cls(roles.hairline.dark)}`)
  })

  it('keeps focus and now geometrically distinct (D5)', () => {
    // Focus is the only offset ring; now never uses an outline.
    expect(tokens.focusRing).toContain('outline-offset-2')
    for (const v of Object.values(tokens.now)) {
      expect(v).not.toMatch(/outline/)
      expect(v).not.toMatch(/ring-offset/)
    }
  })

  it('traces every role to a platform source or a decision', () => {
    for (const [name, role] of Object.entries(roles)) expect(role.source, name).toMatch(/^(P|D\d+|S):/)
    for (const [name, t] of Object.entries(type)) expect(t.source, name).toMatch(/(P|D\d+|S)/)
  })
})

describe('tokens v3: type and space', () => {
  const scale = config.theme.fontSize as Record<string, [string, { lineHeight: string }]>
  const NAMED = { '2xs': 12, xs: 13, sm: 14, base: 16 } as const

  it('uses only the platform font-size scale, never below the 12 px floor (D3)', () => {
    for (const [name, t] of Object.entries(type)) {
      expect(t.size, name).toBeGreaterThanOrEqual(TEXT_FLOOR_PX)
      expect(t.cls, name).not.toMatch(/text-\[/)
      const sizes = [...t.cls.matchAll(/(?:^|\s|:)text-(2xs|xs|sm|base)(?=\s|$)/g)].map((m) => m[1])
      expect(sizes.length, name).toBeGreaterThan(0)
      // The first named size is the token size, and it matches the config.
      const first = sizes[0] as keyof typeof NAMED
      expect(NAMED[first], name).toBe(t.size)
      expect(parseFloat(scale[first][0]) * 16, name).toBe(t.size)
    }
  })

  it('declares the line height each token renders with', () => {
    const leading: Record<string, number> = { 'leading-4': 16, 'leading-5': 20, 'leading-6': 24, 'leading-7': 28 }
    for (const [name, t] of Object.entries(type)) {
      const explicit = t.cls.match(/\bleading-(\d)\b/)
      const size = t.cls.match(/\btext-(2xs|xs|sm|base)\b/)![1]
      const line = explicit ? leading[explicit[0]] : parseFloat(scale[size][1].lineHeight) * 16
      expect(line, name).toBe(t.line)
    }
  })

  it('uses mono only for code, values and identifiers (D3)', () => {
    const mono = Object.entries(type)
      .filter(([, t]) => t.cls.includes('font-mono'))
      .map(([n]) => n)
    expect(mono.sort()).toEqual(['code', 'glyphHeader', 'meta', 'value'])
  })

  it('keeps spacing on the 8 pt rhythm plus 4 and 12', () => {
    for (const v of Object.values(space)) expect(v % 8 === 0 || v === 4 || v === 12, String(v)).toBe(true)
  })

  it('keeps the shapes of D1', () => {
    expect(tokens.radius.frame.cls).toBe('rounded-2xl')
    expect(tokens.radius.control.cls).toBe('rounded-full')
    expect(tokens.radius.row.cls).toBe('rounded-lg')
    expect(tokens.radius.glyph.px).toBe(8)
    expect(tokens.radius.chip.px).toBe(4)
    expect(tokens.strokeWidth).toMatchObject({ outline: 1, connector: 1.5 })
    expect(tokens.frameCls).toContain('sm:rounded-2xl')
  })
})

describe('tokens v3: motion (§4, D10, D11)', () => {
  it('gives control feedback the platform 150 ms (D11)', () => {
    const f = motion.feedback.full
    expect(f.type === 'tween' && f.duration).toBe(0.15)
    expect(tokens.transitionCls.feedback).toMatch(/^transition\b/)
  })

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

  it('fits every transition into 40 % of the play interval', () => {
    const budget = motionRules.playIntervalMs * motionRules.maxTransitionShareOfInterval
    for (const t of Object.values(motion)) {
      const ms = t.full.type === 'tween' ? t.full.duration * 1000 : t.full.settleMs
      expect(ms).toBeLessThanOrEqual(budget)
    }
  })
})
