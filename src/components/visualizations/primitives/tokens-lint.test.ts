// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Token lint (VIZ-H WS1): outside the token definitions, the visualization
 * system may not hard-code a color, a size or a duration. Everything comes
 * from `tokens-v3.ts` (or a named class on the platform scale).
 *
 * Scanned: shell/, engines/, substrates/, primitives/ (TS and TSX sources,
 * comments stripped). Not scanned: the token module itself, tests, the
 * `__stress__` fixtures, JSON data (pre-computed Shiki colors) and the legacy
 * v1 files listed in the README.
 *
 * Rules:
 * - no raw hex, rgb(a) or hsl(a) color;
 * - no arbitrary Tailwind value carrying a length, a number or a color
 *   (`text-[13px]`, `p-[7px]`, `rounded-[10px]`, `max-w-[12rem]`,
 *   `duration-[120ms]`); `[var(--x)]`, selectors and keywords are fine;
 * - no literal duration: `120ms` strings, `duration-150` classes, non-zero
 *   framer `duration:` literals, or `setTimeout` with a number.
 *
 * The allowlist names the only exceptions: geometry that Tailwind needs as a
 * literal class and that a test ties to the layout tokens.
 */

const ROOT = join(__dirname, '..')
const DIRS = ['shell', 'engines', 'substrates', 'primitives']
const EXCLUDE = [
  /primitives\/tokens-v3\.ts$/,
  /\.test\.tsx?$/,
  /__stress__\//,
  // Legacy v1 (README "v1 components"), scheduled for removal (D20).
  /primitives\/tokens\.ts$/,
  /primitives\/VizFrame\.tsx$/,
  /primitives\/VizControls\.tsx$/,
  /primitives\/useStepper\.ts$/,
]

type Allow = { file: RegExp; match: RegExp; why: string }
const ALLOW: Allow[] = [
  {
    file: /engines\/env-records\/EnvRecordsStage\.tsx$/,
    match: /^\[@container\(min-width:\d+px\)\]:(block|hidden)$/,
    why: 'Container-query widths are the layout sub-widths; layout.test.tsx fails if one is missing.',
  },
]

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

  it('finds no hard-coded color, size or duration in the visualization system', () => {
    const found = DIRS.flatMap((d) => files(join(ROOT, d)))
      .filter((f) => !EXCLUDE.some((x) => x.test(f)))
      .flatMap((f) => lint(relative(ROOT, f), readFileSync(f, 'utf8')))
    expect(found.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`)).toEqual([])
  })
})
