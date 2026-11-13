import { WIDTHS } from '../step-log/validate'
import { MONO_ADVANCE, emWidth } from '../substrates/text-metrics'
import { LINE } from './footprint'

/**
 * Code-pane geometry (React-free, so layouts and the server-only stress page
 * can size panes without the component): padding, gutter, heights, the
 * window offset and the soft-wrap row count (A4).
 */

/** Continuation rows hang this many columns past the line's own indent. */
export const HANG = 2

/** Code columns a row holds in the narrow variant (the pane at 320 px, the lint's slot). */
export const NARROW_CODE_COLS = Math.floor(WIDTHS.code / (MONO_ADVANCE * WIDTHS.codeSize))

/** Visual rows of one line soft-wrapped at `cols` columns, with the hanging indent. */
export function wrappedRows(line: string, cols: number): number {
  const width = Math.ceil(emWidth(line, MONO_ADVANCE) / MONO_ADVANCE - 1e-9)
  if (width <= cols) return 1
  const hang = Math.min(lineIndent(line) + HANG, Math.max(0, cols - 8))
  return 1 + Math.ceil((width - cols) / (cols - hang))
}

/** Visual rows of a whole listing at `cols` columns (footprints and windows count these). */
export function codeRows(lines: readonly string[], cols: number): number {
  return lines.reduce((n, l) => n + wrappedRows(l, cols), 0)
}

export function lineIndent(line: string): number {
  return line.length - line.trimStart().length
}

export const CODE_PAD = 8
/** Gutter: 8 inset + 12 marker + 24 line number + 8 gap, from 768. */
export const CODE_GUTTER = 8 + 12 + 24 + 8
/** A 16 px status line under the code (plus the bottom padding), so the host note never covers code. */
export const CODE_STATUS = 16

/**
 * The pane's height for `rows` code rows. The host-note line is reserved only
 * when a step of the log runs outside the code (`line: 'host'`): a pane that
 * never shows the note keeps no empty band (H3 INTEG 6).
 */
export function codePaneHeight(rows: number, hostNote = false): number {
  return rows * LINE + 2 * CODE_PAD + (hostNote ? CODE_STATUS : 0)
}

/** Whether any step of these logs is a host step (the pane shows its note). */
export function hasHostNote(logs: readonly { steps: readonly { line?: unknown }[] }[]): boolean {
  return logs.some((l) => l.steps.some((s) => s.line === 'host'))
}

/** Rows to translate so `anchor` (1-based) sits in the middle of a `rows`-tall window. */
export function windowOffset(anchor: number | undefined, total: number, rows: number): number {
  if (!anchor || total <= rows) return 0
  const top = anchor - 1 - Math.floor((rows - 1) / 2)
  return Math.max(0, Math.min(total - rows, top))
}
