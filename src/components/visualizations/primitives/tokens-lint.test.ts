// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  contrastPairs,
  roles,
  surfaces,
  type PaletteRef,
} from './tokens-v3'

/**
 * Token lint (VIZ-H WS1, G): outside the token definitions, the visualization
 * system may not hard-code a color, a size or a duration, and it may paint
 * only the colors the token tables declare (and the contrast suite tests).
 *
 * Scanned: every TS and TSX source under components/visualizations (comments
 * stripped), and the visualization rules of `src/styles/tailwind.css` (from
 * its "Lesson visualizations" comment to the end). Not scanned: the token
 * module itself, tests, the `__stress__` fixtures and JSON data
 * (pre-computed Shiki colors).
 *
 * Rules (TS and TSX):
 * - no raw hex, rgb(a) or hsl(a) color;
 * - no arbitrary Tailwind value carrying a length, a number or a color
 *   (`text-[13px]`, `p-[7px]`, `rounded-[10px]`, `max-w-[12rem]`,
 *   `duration-[120ms]`); `[var(--x)]`, selectors and keywords are fine;
 * - no literal duration: `120ms` strings, `duration-150` classes, non-zero
 *   framer `duration:` literals, or `setTimeout` with a number;
 * - no literal SVG stroke width or radius (`strokeWidth="2"`, `r={3}`):
 *   `strokeWidth`, `DOT_R` and `radius` are the tokens (R1 L04);
 * - the palette rule (R1 L03): a color class must use a color the tables
 *   paint in that capacity. Text (`text-`, `decoration-`) must be the
 *   foreground of a `text` contrast pair; edges (`border-`, `ring-`,
 *   `stroke-`, `outline-`, `divide-`) the foreground of a `graphic` pair or
 *   the hairline; fills (`bg-`, `fill-`) a surface layer, a role or a pair
 *   foreground. So every color that renders is one the contrast suite
 *   checks; anything else needs a row in `ALLOW_COLOR` naming its role.
 *
 * Rules (the stylesheet): no raw color, no literal number with or without a
 * unit in a declaration (values come from `theme('vz.*')`, `theme('colors.*')`
 * or `var()`; `calc(12em / 13)`, the type ratio inside an SVG, is allowed),
 * and every `@apply` class and `theme('colors.*')` passes the rules above.
 *
 * The allowlists name the only exceptions.
 */

const ROOT = join(__dirname, '..')
const CSS = join(__dirname, '..', '..', '..', 'styles', 'tailwind.css')
const CSS_MARK = '/*\n * Lesson visualizations. The token lint'
const EXCLUDE = [/primitives\/tokens-v3\.ts$/, /\.test\.tsx?$/, /__stress__\//]

type Allow = { file: RegExp; match: RegExp; why: string }
const ALLOW: Allow[] = [
  {
    file: /^Viz\.tsx$/,
    match: /^(vz-wide:|vz-col:|\[@container_vz_\(min-width:[\d.]+rem\)_and_\(max-width:[\d.]+rem\)\]:)?h-\[calc\(var\(--vz-[nwcstu]\)-2rem-2px\)\]$/,
    why: 'The lazy mount stays dependency-free (bundle budget): its reserve is the footprint less the frame padding (1rem) and borders (1px) that frame-cls draws.',
  },
  {
    file: /engines\/env-records\/EnvRecordsStage\.tsx$/,
    match: /^\[@container\(min-width:\d+px\)\]:(block|hidden)$/,
    why: 'Container-query widths are the layout sub-widths; layout.test.tsx fails if one is missing.',
  },
]

/**
 * Color classes outside the palette rule, each with the role it plays. A new
 * visual that needs a color the tables do not paint adds a contrast pair (and
 * passes the rule) or a row here.
 */
export const ALLOW_COLOR: Record<string, string> = {
  'border-white/10': 'the frame edge (P: Button.tsx:26 `ring-white/10`): decorative, like the hairline',
  'ring-white/10': 'the outline-button edge (P: Button.tsx:26): decorative; the label identifies the control',
  'print:border-zinc-300': 'paper: the frame, code pane and select edge (decorative; light hairline family)',
  'print:border-white': 'paper: the scrubber thumb\'s knockout ring, in the paper color (border-vz-frame on screen)',
  'print:ring-zinc-300': 'paper: the outline-button edge (decorative; the label identifies the control)',
  'border-zinc-600':
    'the select fallback edge, the platform outline Select (P: Select.tsx:27): 2.15:1, decorative; its value text and chevron identify it (WCAG 1.4.11 needs no boundary then)',
  'text-zinc-500': 'stylesheet: `currentColor` for SVG strokes (svgInk.line), a graphic tested as `line`',
  'stroke-zinc-800': 'stylesheet: the knockout halo behind an unused record\'s text, in the glyph fill (surface glyph)',
  'print:stroke-white': 'stylesheet: the same halo on paper, in the paper color',
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const COLOR_CLASS = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:|\\[[^\\]\\s]*\\]:)*(bg|text|border(?:-[xytblrse])?|ring|ring-offset|fill|stroke|outline|divide|decoration|placeholder|caret|accent|shadow|from|via|to)-((?:${PALETTE})-\\d{2,3}|white|black)(?:\\/[\\d.]+)?(?![\\w-])`,
  'g',
)

const refOf = (c: string): string => (c === 'white' || c === 'black' ? c : c.replace(/-(\d+)$/, '.$1'))
const both = (x: { dark: PaletteRef | 'white'; light: PaletteRef | 'white' }) => [x.dark, x.light]
const TEXT = new Set<string>(contrastPairs.filter((p) => p.kind === 'text').flatMap((p) => both(p.fg)))
const GRAPHIC = new Set<string>([
  ...contrastPairs.filter((p) => p.kind === 'graphic').flatMap((p) => both(p.fg)),
  ...both(roles.hairline),
])
const SURFACE = new Set<string>(
  Object.values(surfaces).flatMap((s) => [...s.dark, ...s.light].map((l) => l.color as string)),
)
const ROLE = new Set<string>(Object.values(roles).flatMap((r) => [r.dark, r.light]))

/** Why a color class (`whole`, variants and alpha included) breaks the palette rule, or null. */
export function paletteViolation(utility: string, color: string, whole = `${utility}-${color}`): string | null {
  const ref = refOf(color)
  if (ALLOW_COLOR[whole]) return null
  if (/^(text|decoration|placeholder|caret)$/.test(utility))
    return TEXT.has(ref) ? null : `${ref} is not the foreground of any text contrast pair`
  if (/^(border|ring|stroke|outline|divide|accent|shadow)/.test(utility))
    return GRAPHIC.has(ref) ? null : `${ref} is not a graphic pair foreground or the hairline`
  // bg, fill, gradient stops: a surface, a role, or a pair foreground (SVG text is a fill).
  return SURFACE.has(ref) || ROLE.has(ref) || TEXT.has(ref) || GRAPHIC.has(ref)
    ? null
    : `${ref} is not a surface, role or contrast-pair color`
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}
/** Strips comments but keeps strings (a `//` inside a string such as a URL survives). */
export function stripComments(src: string): string {
  let out = ''
  let i = 0
  let quote: string | null = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (quote) {
      out += c
      if (c === '\\') {
        out += n ?? ''
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      out += c
      i++
      continue
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2)
      const block = src.slice(i, end < 0 ? src.length : end + 2)
      out += block.replace(/[^\n]/g, ' ')
      i = end < 0 ? src.length : end + 2
      continue
    }
    out += c
    i++
  }
  return out
}

export type Finding = { file: string; line: number; rule: string; text: string }

/** A non-zero number, bare or with a unit (`0` and `1fr` are layout keywords, not sizes). */
const LENGTH = /(?<![\w.])([1-9]\d*(\.\d+)?|0?\.\d*[1-9]\d*)(px|rem|em|ms|s|vh|vw|%)?(?![\w-])/

export function lint(file: string, src: string): Finding[] {
  const out: Finding[] = []
  const code = stripComments(src)
  const lines = code.split('\n')
  const push = (line: number, rule: string, text: string) => {
    if (ALLOW.some((a) => a.file.test(file) && a.match.test(text))) return
    out.push({ file, line: line + 1, rule, text })
  }
  lines.forEach((l, k) => {
    for (const m of l.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) push(k, 'raw hex color', m[0])
    for (const m of l.matchAll(/\b(rgba?|hsla?)\(/g)) push(k, 'raw rgb/hsl color', m[0])
    // Arbitrary Tailwind values: `prefix-[...]` (optionally with variants).
    for (const m of l.matchAll(/(?:^|[\s'"`])((?:[\w-]+:)*-?[a-z][\w-]*-\[([^\]\s'"`]+)\](?::[\w-]+)?)/g)) {
      const value = m[2]
      const onlyVars = value.replace(/var\(--[\w-]+\)/g, '')
      if (LENGTH.test(onlyVars) || /#[0-9a-f]/i.test(value)) push(k, 'arbitrary value', m[1])
    }
    // Arbitrary variants carrying a literal length, e.g. `[@container(min-width:343px)]:block`.
    for (const m of l.matchAll(/(\[@[^\]]*\d+px[^\]]*\]:[\w-]+)/g)) push(k, 'arbitrary value', m[1])
    for (const m of l.matchAll(/\b\d+(\.\d+)?ms\b/g)) push(k, 'literal duration', m[0])
    for (const m of l.matchAll(/(?:^|[\s'"`:])((?:duration|delay)-\d+)\b/g)) push(k, 'literal duration', m[1])
    for (const m of l.matchAll(/\bduration:\s*(\d*\.?\d+)/g))
      if (Number(m[1]) !== 0) push(k, 'literal duration', m[0])
    for (const m of l.matchAll(/setTimeout\([^,]+,\s*\d+/g)) push(k, 'literal duration', m[0])
    for (const m of l.matchAll(/\b(strokeWidth|rx|ry|r)=(?:"\d*\.?\d+"|\{\d*\.?\d+\})/g))
      if (!/=(?:"0"|\{0\})$/.test(m[0])) push(k, 'literal svg size', m[0])
    for (const m of l.matchAll(COLOR_CLASS)) {
      const why = paletteViolation(m[1], m[2], m[0].trim())
      if (why) push(k, `off-palette color (${why})`, m[0].trim())
    }
  })
  return out
}

/** The stylesheet's visualization rules (from the marker comment to the end). */
export function lintCss(file: string, css: string): Finding[] {
  const out: Finding[] = []
  const at = css.indexOf(CSS_MARK)
  if (at < 0) return [{ file, line: 0, rule: 'missing marker', text: CSS_MARK }]
  const before = css.slice(0, at).split('\n').length - 1
  const block = css.slice(at).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
  block.split('\n').forEach((l, k) => {
    const push = (rule: string, text: string) => out.push({ file, line: before + k + 1, rule, text })
    for (const m of l.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) push('raw hex color', m[0])
    for (const m of l.matchAll(/\b(rgba?|hsla?)\(/g)) push('raw rgb/hsl color', m[0])
    for (const m of l.matchAll(/theme\(\s*'colors\.([a-z]+)\.(\d+)/g)) {
      const ref = `${m[1]}.${m[2]}`
      if (![TEXT, GRAPHIC, SURFACE, ROLE].some((set) => set.has(ref))) push('off-palette color', m[0])
    }
    for (const a of l.matchAll(/@apply\s+([^;]+);/g))
      for (const f of lint(file, `const c = '${a[1]}'`)) push(f.rule, f.text)
    // Declarations: no literal number once tokens, variables and the SVG type ratio are taken out.
    for (const d of l.matchAll(/(?<![@\w-])([a-z-]+)\s*:\s*([^;{}]+);/g)) {
      const value = d[2]
        .replace(/theme\([^)]*\)/g, '')
        .replace(/var\(--[\w-]+/g, '')
        .replace(/calc\(\d+em \/ \d+\)/g, '')
      for (const n of value.matchAll(/(?<![\w-])(\d*\.?\d+)([a-z%]*)/g))
        if (Number(n[1]) !== 0) push('literal value', `${d[1]}: ${d[2].trim()}`)
    }
  })
  return out
}

describe('token lint (VIZ-H WS1)', () => {
  it('flags the drift it exists for', () => {
    const bad = [
      `const a = 'text-[13px] p-[7px] rounded-[10px]'`,
      `const b = 'bg-[#1e1e21]'`,
      `const c = 'max-w-[12rem] duration-100'`,
      `const d = { duration: 0.2 }`,
      `const e = 'transition-[color] duration-[120ms]'`,
      `const f = 'rgba(0, 0, 0, .4)'`,
      `setTimeout(go, 1600)`,
    ].join('\n')
    const rules = lint('x.tsx', bad).map((f) => f.text)
    for (const t of ['text-[13px]', 'p-[7px]', 'rounded-[10px]', '#1e1e21', 'max-w-[12rem]', 'duration-100', 'duration: 0.2', 'duration-[120ms]', 'rgba(', 'setTimeout(go, 1600'])
      expect(rules.some((r) => r.includes(t)), t).toBe(true)
  })

  it('accepts tokens, variables, selectors and comments', () => {
    const ok = [
      `// text-[13px] in a comment, 120ms, #fff`,
      `const a = 'h-[var(--vz-h-n)] md:w-[calc(var(--vz-cols)*1ch+var(--vz-gutter))]'`,
      `const b = 'has-[:focus-visible]:outline cursor-[inherit] [&::-webkit-details-marker]:hidden'`,
      `const c = { duration: 0 }`,
      `const d = 'timer 0 ms → cb'`,
      `const e = "url('https://x.test/a')"`,
      `const f = 'grid-cols-[minmax(0,1fr)_var(--w)]'`,
    ].join('\n')
    expect(lint('x.tsx', ok)).toEqual([])
  })

  it('flags SVG literals, off-palette colors and stylesheet literals', () => {
    const tsx = [
      `<path strokeWidth="2" /> <circle r={3} />`,
      `const a = 'ring-zinc-600 text-emerald-400 bg-zinc-750'`,
      `const b = 'print:text-zinc-500'`,
    ].join('\n')
    const t = lint('x.tsx', tsx).map((f) => f.text)
    for (const x of ['strokeWidth="2"', 'r={3}', 'ring-zinc-600', 'text-emerald-400', 'bg-zinc-750', 'print:text-zinc-500'])
      expect(t.some((r) => r.includes(x)), x).toBe(true)
    const css = `${CSS_MARK} */\n.vz-a { font-size: 12px; opacity: 0.4; color: #fff; }\n.vz-b { @apply text-[13px] ring-zinc-600; transition: opacity 120ms ease; }\n.vz-c { fill: theme('colors.emerald.400'); }`
    const c = lintCss('x.css', css).map((f) => `${f.rule}: ${f.text}`)
    for (const x of ['font-size: 12px', 'opacity: 0.4', '#fff', 'text-[13px]', 'transition: opacity 120ms', 'emerald', 'ring-zinc-600'])
      expect(c.some((r) => r.includes(x)), x).toBe(true)
  })

  it('accepts token references in the stylesheet', () => {
    const css = `${CSS_MARK} */\n.vz-a { fill-opacity: theme('vz.readTint'); stroke-width: var(--vz-sw, theme('vz.connector')); font-size: calc(12em / 13); }\n.vz-b { @apply fill-zinc-800 print:fill-white; --vz-k: theme('colors.lime.400'); }\n@keyframes x { from { opacity: 0; } }`
    expect(lintCss('x.css', css)).toEqual([])
  })

  it('finds no hard-coded color, size or duration in the visualization system', () => {
    const found = files(ROOT)
      .filter((f) => !EXCLUDE.some((x) => x.test(f)))
      .flatMap((f) => lint(relative(ROOT, f), readFileSync(f, 'utf8')))
    expect(found.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`)).toEqual([])
  })

  it('finds no literal and no off-palette color in the visualization stylesheet (R1 L01)', () => {
    const found = lintCss('styles/tailwind.css', readFileSync(CSS, 'utf8'))
    expect(found.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`)).toEqual([])
  })

  it('keeps every color exception tied to a role', () => {
    for (const [cls, why] of Object.entries(ALLOW_COLOR)) expect(why.length, cls).toBeGreaterThan(20)
  })
})
