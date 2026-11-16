/**
 * Where a visual's program comes from, without its text (the premium-code
 * policy). The public app repo holds the engines, presets, recordings and
 * these locators and hashes; it never holds a lesson's full code block or
 * any text of a practice answer. The text is read from a local content
 * checkout (`src/content`, gitignored) by `lesson-block.ts` (Node-only) when
 * a program is recorded or verified, and when a practice answer's lines are
 * resolved for a page (`resolve-code.ts`).
 *
 * React-free and Node-free: presets, programs and the browser share it.
 */

/**
 * A code block in the content repo, by locator:
 * - a lesson's fence: the first (or `nth`) ```lang fence after the line `heading`;
 * - a practice answer: the first ```lang fence of problem `problem` in
 *   lesson `lesson` (its `id`, e.g. `/trees`) of a `_lessons.json`.
 */
export type BlockRef =
  | { path: string; heading: string; lang: string; nth?: number }
  | { path: string; lesson: string; problem: string; lang: string }

/**
 * One part of a program as run, in order, joined with newlines:
 * - lines of a content block (all of it, or `lines` [from, to], 1-based,
 *   inclusive; `to` omitted: to the end), `uncomment` removing a ` * `
 *   comment prefix (a practice answer's commented `ListNode` declaration);
 *   `lessonSha256` is the sha256 of the whole block as the content holds
 *   it, so a drifted lesson fails the truth test;
 *   `replace` [from, to] makes a one-keyword variant of the lesson's code
 *   that a visual contrasts with it (the sliding window's `while` written
 *   as `if`): `from` must occur exactly once in the selected lines, and
 *   both are keywords, never solution code, so a practice answer's variant
 *   commits no answer text;
 *   `swaps` makes a variant one operator or name at a time (the dp loop
 *   counting up instead of down): each [from, to] pair is applied in order
 *   and must occur exactly once in the selected lines when it applies; every
 *   `from` and `to` is a token of at most four characters (an operator, a
 *   bound's name), never a line of solution code;
 * - `code`: a harness line or lines (a call with the register's input, or a
 *   blank separator), never solution code.
 */
export type SourcePart =
  | {
      block: BlockRef
      lessonSha256: string
      lines?: readonly [number, number?]
      uncomment?: true
      replace?: readonly [from: string, to: string]
      swaps?: readonly (readonly [from: string, to: string])[]
    }
  | { code: string }

export type ProgramSource = readonly SourcePart[]

/**
 * One row of a code pane, from line `src` (1-based) of the program as run:
 * - `text`: a lesson example's line as shown (rewrapped to the pane, only
 *   whitespace changed), committed;
 * - `wrap`: a practice answer's line, never committed as text: the row is
 *   `indent` spaces then the code points [from, to) of the line with its
 *   leading whitespace removed. The row's width is known without the text,
 *   so the footprint never depends on it.
 */
export type DisplayRow = { src: number; text: string } | { src: number; wrap: readonly [indent: number, from: number, to: number] }

/** True for a locator into a practice answer. */
export const isAnswerRef = (b: BlockRef): b is Extract<BlockRef, { problem: string }> => 'problem' in b

/** True when any part of the program is a practice answer: its displayed lines are premium text. */
export const isAnswerSource = (s: ProgramSource): boolean => s.some((p) => 'block' in p && isAnswerRef(p.block))

/** A short human label for a locator (provenance, skip messages). */
export function refLabel(b: BlockRef): string {
  return isAnswerRef(b) ? `${b.path} ${b.lesson} > ${b.problem} (answer, ${b.lang})` : `${b.path} ${b.heading} (${b.lang}${b.nth ? ` #${b.nth}` : ''})`
}

/**
 * The program as run, from each block's text (`text(ref)`, the exact fence
 * contents). Pure: the caller reads the blocks (`lesson-block.ts`).
 */
export function composeProgram(source: ProgramSource, text: (b: BlockRef) => string): string {
  const out: string[] = []
  for (const part of source) {
    if ('code' in part) {
      out.push(part.code)
      continue
    }
    let lines = text(part.block).split('\n')
    if (part.lines) {
      const [from, to = lines.length] = part.lines
      if (from < 1 || to > lines.length || from > to) throw new Error(`lines ${from}-${to} are outside ${refLabel(part.block)}`)
      lines = lines.slice(from - 1, to)
    }
    if (part.uncomment) lines = lines.map((l) => l.replace(/^ \* ?/, ''))
    let body = lines.join('\n')
    if (part.replace) {
      const [from, to] = part.replace
      const n = body.split(from).length - 1
      if (n !== 1) throw new Error(`"${from}" occurs ${n} times in the lines of ${refLabel(part.block)} it would replace (exactly once required)`)
      body = body.replace(from, to)
    }
    for (const [from, to] of part.swaps ?? []) {
      const n = body.split(from).length - 1
      if (n !== 1) throw new Error(`"${from}" occurs ${n} times in the lines of ${refLabel(part.block)} it would swap (exactly once required)`)
      body = body.replace(from, to)
    }
    out.push(body)
  }
  return out.join('\n')
}

/** The code-point length of a string (the pane counts columns, not UTF-16 units). */
const cols = (s: string) => [...s].length

/** A `wrap` row's text from its program line. */
export function wrapText(line: string, wrap: readonly [number, number, number]): string {
  const [indent, from, to] = wrap
  const body = [...line.trimStart()].slice(from, to).join('')
  return body ? ' '.repeat(indent) + body : ''
}

/** The pane's lines: committed text rows as they are, answer rows from the program's lines. */
export function displayText(programLines: readonly string[], rows: readonly DisplayRow[]): string[] {
  return rows.map((r) => ('text' in r ? r.text : wrapText(programLines[r.src - 1] ?? '', r.wrap)))
}

/**
 * Rows of the same widths with no premium text: what the repo's logs carry
 * for an answer, so layout and footprints are exactly those of the real
 * lines. Never shown: a visual whose text is not resolved renders nothing.
 */
export const PLACEHOLDER = '·'
export function placeholderText(rows: readonly DisplayRow[]): string[] {
  return rows.map((r) => {
    if ('text' in r) return r.text
    const [indent, from, to] = r.wrap
    return to > from ? ' '.repeat(indent) + PLACEHOLDER.repeat(to - from) : ''
  })
}

/** True when any row is an answer row (its text is resolved, never committed). */
export const hasWrapRows = (rows: readonly DisplayRow[]) => rows.some((r) => 'wrap' in r)

/**
 * The display check: in order, over one contiguous span of program lines,
 * each line's rows (text or wrap) spell the line with only whitespace
 * changed, breaking it only between characters it keeps in order; `wrap`
 * rows are trimmed slices that tile the line; nothing exceeds `maxCols`.
 * `blankRows`: a blank program line is shown as a blank row (else skipped).
 */
export function displayProblems(
  programLines: readonly string[],
  rows: readonly DisplayRow[],
  opts: { maxCols: number; blankRows: boolean },
): string[] {
  const problems: string[] = []
  if (!rows.length) return ['no rows']
  for (let k = 1; k < rows.length; k++) if (rows[k].src < rows[k - 1].src) problems.push(`line ${rows[k].src} after ${rows[k - 1].src}`)
  const [a, b] = [rows[0].src, rows[rows.length - 1].src]
  for (let l = a; l <= b; l++) {
    const line = programLines[l - 1]
    if (line === undefined) {
      problems.push(`line ${l} is not in the program`)
      continue
    }
    const mine = rows.filter((r) => r.src === l)
    const body = line.trim()
    if (!body) {
      if (opts.blankRows ? mine.length !== 1 || displayText(programLines, mine)[0] !== '' : mine.length) problems.push(`blank line ${l} is ${opts.blankRows ? 'not one blank row' : 'shown'}`)
      continue
    }
    if (!mine.length) {
      problems.push(`line ${l} is not shown`)
      continue
    }
    // Walk the line (leading whitespace removed): each row's body is the next
    // stretch of it, with only whitespace between rows.
    const rest = [...line.trimStart()]
    let at = 0
    for (const r of mine) {
      let piece: string
      if ('wrap' in r) {
        const [indent, from, to] = r.wrap
        piece = rest.slice(from, to).join('')
        if (indent < 0 || from > to || to > rest.length) problems.push(`line ${l}: wrap [${r.wrap}] is outside the line`)
        if (piece !== piece.trim() || !piece) problems.push(`line ${l}: wrap [${r.wrap}] is not a trimmed, non-empty slice`)
        if (rest.slice(at, from).join('').trim()) problems.push(`line ${l}: wrap [${r.wrap}] skips "${rest.slice(at, from).join('')}"`)
        at = to
      } else {
        piece = r.text.trim()
        const gap = rest.slice(at).join('')
        const lead = gap.length - gap.trimStart().length
        if (!piece || !gap.trimStart().startsWith(piece)) {
          problems.push(`line ${l}: ${JSON.stringify(r.text)} is not the next part of ${JSON.stringify(body)}`)
          break
        }
        at += lead + cols(piece)
      }
    }
    if (rest.slice(at).join('').trim()) problems.push(`line ${l}: ${JSON.stringify(rest.slice(at).join(''))} is not shown`)
  }
  for (const [i, t] of displayText(programLines, rows).entries())
    if (cols(t) > opts.maxCols) problems.push(`row ${i + 1} "${t}" is over ${opts.maxCols} columns`)
  return problems
}

/**
 * Converts committed text rows to `wrap` rows against the program's lines
 * (an authoring aid: how an answer's rows are written without its text).
 */
export function toWrapRows(programLines: readonly string[], rows: readonly { src: number; text: string }[]): DisplayRow[] {
  const at = new Map<number, number>()
  return rows.map((r) => {
    const rest = [...(programLines[r.src - 1] ?? '').trimStart()]
    const piece = r.text.trim()
    if (!piece) return { src: r.src, wrap: [0, 0, 0] as const }
    let from = at.get(r.src) ?? 0
    while (from < rest.length && /\s/.test(rest[from])) from++
    const to = from + cols(piece)
    if (rest.slice(from, to).join('') !== piece) throw new Error(`line ${r.src}: "${piece}" is not at ${from}`)
    at.set(r.src, to)
    const indent = cols(r.text) - cols(r.text.trimStart())
    return { src: r.src, wrap: [indent, from, to] as const }
  })
}
