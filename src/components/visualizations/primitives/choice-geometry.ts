import { monoWidth, sansWidth, wrapByWidth } from '../substrates/text-metrics'
import { TARGET_GAP_PX, TARGET_PX } from './tokens-v3'

/**
 * Checkpoint choice geometry (H3 R2 Q4, Q5), React-free so footprints, the
 * lint and the layout CSS share one model. Px at the default 16 px root.
 *
 * A choice row: 10 px inset, the 12 px numeral slot, an 8 px gap, the label
 * and a 10 px inset (40 px of chrome), at least 44 px tall; each label line
 * is 20 px plus 8 px of padding above and below. Skip is a 44 px square
 * text button.
 */
export const CHOICE = {
  height: TARGET_PX,
  gap: TARGET_GAP_PX,
  textGap: 8,
  chrome: 40,
  /** Slack on a label's modelled width: the model is an average, and capitals ("A") run wider. */
  slack: 4,
  line: 20,
  pad: 8,
  /** The widest column from 768. */
  wideWidth: 168,
  skip: 44,
  /** The least room the text keeps beside a row of choices from 768. */
  textMin: 160,
  /** At most this many lines per label in a one-row layout. */
  rowLines: 2,
} as const

export type ChoiceGeometry = {
  n: number
  /** The wide column: the longest label plus chrome, at most 168. */
  col: number
  /** Narrow: the least content width at which every choice plus Skip sits in one row. */
  rowNarrow: number
  /** Wide: the least content width at which the row sits beside the text. */
  rowWide: number
  gap: number
  textGap: number
}

const labelWidth = (label: string, mono: boolean) =>
  Math.ceil(mono ? monoWidth(label, 13) : sansWidth(label, 14)) + CHOICE.slack
const longestWord = (label: string, mono: boolean) =>
  Math.max(0, ...label.split(/\s+/).map((w) => labelWidth(w, mono)))

export function choiceGeometry(labels: readonly string[], mono = false): ChoiceGeometry {
  const n = labels.length
  const widest = Math.max(0, ...labels.map((l) => labelWidth(l, mono)))
  const word = Math.max(0, ...labels.map((l) => longestWord(l, mono)))
  // One row: equal columns, each label in at most two lines, no word broken.
  const cell = CHOICE.chrome + Math.max(word, Math.ceil(widest / CHOICE.rowLines))
  const rowNarrow = n * cell + n * CHOICE.gap + CHOICE.skip
  const col = Math.min(CHOICE.wideWidth, CHOICE.chrome + widest)
  const rowWide = n * col + n * CHOICE.gap + CHOICE.skip + CHOICE.textGap + 8 + CHOICE.textMin
  return { n, col, rowNarrow, rowWide, gap: CHOICE.gap, textGap: CHOICE.textGap }
}

/** Lines a label takes in a column `width` px wide. */
export function choiceLines(label: string, width: number, mono = false): number {
  const room = Math.max(1, width - CHOICE.chrome)
  return Math.max(1, wrapByWidth(label, room, (s) => labelWidth(s, mono)).length)
}

const rowHeight = (lines: number) => Math.max(CHOICE.height, lines * CHOICE.line + 2 * CHOICE.pad)

/**
 * The height of the choices and Skip at content width `width` (px at the
 * default root): one row, or two columns with Skip in the next free cell.
 */
export function choicesHeight(labels: readonly string[], width: number, wide: boolean, mono = false): number {
  const g = choiceGeometry(labels, mono)
  if (!g.n) return 0
  const one = wide ? width >= Math.max(g.rowWide, 606) : width >= g.rowNarrow
  if (one) {
    const colW = wide ? g.col : (width - CHOICE.skip - g.n * CHOICE.gap) / g.n
    return rowHeight(Math.max(...labels.map((l) => choiceLines(l, colW, mono))))
  }
  const colW = wide ? g.col : (width - CHOICE.gap) / 2
  const cells = [...labels.map((l) => choiceLines(l, colW, mono)), 1]
  let h = 0
  for (let r = 0; r < cells.length; r += 2) h += rowHeight(Math.max(cells[r], cells[r + 1] ?? 1)) + (r ? CHOICE.gap : 0)
  return h
}
