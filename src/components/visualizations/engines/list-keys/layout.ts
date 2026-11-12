import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../../primitives/tokens-v3'
import { codePaneHeight } from '../../shell/code-geometry'
import {
  CAPTION_LINE,
  CHOICE,
  FOOTER,
  FRAME,
  GLYPH,
  MIN_TEXT_WIDTH,
  PROMPT_LINE,
  headerHeight,
  wrapLines,
} from '../../shell/footprint'
import type { PerVariant, Variant } from '../../shell/types'
import {
  LIST_RULE,
  NONE_LABEL,
  NO_CHECK_PROMPT,
  PICK_HINT,
  WRAPPER_RULE,
  feedbackLead,
  listChoices,
  listOutcomeSentence,
  listPrompt,
  wrapperChoices,
  wrapperOutcomeSentence,
  wrapperPrompt,
} from './content'
import { CODE_ROWS } from './code'
import {
  AFTER,
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  type Checks,
} from './model'
import { LIST_OUTCOMES } from './outcomes'

/**
 * Fixed footprint of the list-keys explorable (spec §3.3, §3.4). Every region
 * has an explicit height per variant, the maximum over both scenes, every
 * key, action, starting state, prediction and feedback, so switching any of
 * them never moves the page. Text is wrapped with the foundation's
 * conservative glyph widths at the narrowest width of each variant.
 */

export const CARD = { height: TARGET_PX, gap: 12, spine: 28 } as const
export const COLUMNS = {
  /** Column label row ("Before", "After") and its gap to the first card. */
  label: 16,
  labelGap: 8,
  rows: 3,
  /** Narrow: the gap between the columns that holds the match lines. */
  linesNarrow: 32,
  /** Cards stop growing here; the match lines take the rest. */
  cardMax: 224,
} as const
export const COLUMNS_BODY =
  COLUMNS.rows * CARD.height + (COLUMNS.rows - 1) * CARD.gap
export const COLUMNS_HEIGHT = COLUMNS.label + COLUMNS.labelGap + COLUMNS_BODY

/** Top of card row `i` inside the columns region. */
export const rowTop = (i: number) =>
  COLUMNS.label + COLUMNS.labelGap + i * (CARD.height + CARD.gap)

export const KEY_ROW = TARGET_PX
export const STAGE_GAP = { narrow: 8, wide: 16 } as const
export const CODE_HEIGHT = codePaneHeight(CODE_ROWS)

export const STAGE: PerVariant<number> = {
  // key row, code strip, then the columns
  narrow: KEY_ROW + STAGE_GAP.narrow + CODE_HEIGHT + 16 + COLUMNS_HEIGHT,
  // key row, then code (left) beside the columns (right)
  wide: KEY_ROW + STAGE_GAP.wide + Math.max(CODE_HEIGHT, COLUMNS_HEIGHT),
}

/** The status line: sans 12/20 (D3). */
export const STATUS = typeScale.status.line
export const GAPS = { header: 16, status: 8, dock: 16, footer: 16 } as const
const PARA_GAP = 8

/** Every string the dock can show, per mode. */
export function dockStrings() {
  const hints = [PICK_HINT.list, PICK_HINT.wrapper]
  const prompts: string[] = [NO_CHECK_PROMPT]
  const reveals: { feedback: string; rule: string }[] = []
  const subsets: Checks[] = [
    { milk: false, dog: false },
    { milk: true, dog: false },
    { milk: false, dog: true },
    { milk: true, dog: true },
  ]
  for (const key of KEY_STRATEGIES) {
    for (const action of LIST_ACTIONS) {
      const outcome = LIST_OUTCOMES[`${key}/${action}`]
      const choices = listChoices(action)
      const labelOf = (id: string) =>
        choices.find((c) => c.id === id)?.label ?? id
      for (const checks of subsets) {
        const tracked = checks.milk ? 'milk' : checks.dog ? 'dog' : null
        if (tracked) prompts.push(listPrompt(tracked))
        const sentence = listOutcomeSentence(action, outcome, checks)
        const picks = tracked
          ? [undefined, null, ...choices.map((c) => c.id)]
          : [undefined]
        for (const pick of picks) {
          // The longest lead is a wrong pick; the answer itself does not change the length bound.
          const lead = feedbackLead(pick, AFTER[action][0] ?? 'none', labelOf)
          reveals.push({
            feedback: `${lead} ${sentence}`.trim(),
            rule: LIST_RULE[`${key}/${action}`],
          })
        }
      }
    }
  }
  for (const action of WRAPPER_ACTIONS) {
    prompts.push(wrapperPrompt(action))
    for (const count of [7, 99]) {
      const choices = wrapperChoices(count)
      const labelOf = (id: string) =>
        choices.find((c) => c.id === id)?.label ?? id
      for (const pick of [null, 'kept', 'reset']) {
        reveals.push({
          feedback: `${feedbackLead(pick, 'kept', labelOf)} ${wrapperOutcomeSentence(action, count)}`,
          rule: WRAPPER_RULE[action],
        })
      }
    }
  }
  return {
    hints,
    prompts,
    reveals,
    maxChoices: Math.max(...LIST_ACTIONS.map((a) => listChoices(a).length)),
  }
}

const chars = (width: number, glyph: number) => Math.floor(width / glyph)
const lines = (t: string, width: number, glyph: number) =>
  wrapLines(t, chars(width, glyph))
const maxOf = (xs: number[]) => Math.max(0, ...xs)

export const choicesHeight = (count: number) => {
  const rows = Math.ceil(count / 2)
  return rows * CHOICE.height + (rows - 1) * CHOICE.gap
}

/** Width of the text beside the choices (ask) or the button (reveal), from 768. */
export const WIDE_CHOICES = 2 * CHOICE.wideWidth + CHOICE.gap
export const WIDE_SIDE = MIN_TEXT_WIDTH.wide - CHOICE.sideGap - WIDE_CHOICES
export const REVEAL_BUTTON = 168

export function dockModes(variant: Variant) {
  const s = dockStrings()
  const w = MIN_TEXT_WIDTH[variant]
  const actionRows = variant === 'narrow' ? 2 : 1
  const actions = actionRows * TARGET_PX + (actionRows - 1) * TARGET_GAP_PX
  const hint = maxOf(s.hints.map((t) => lines(t, w, GLYPH.caption))) * CAPTION_LINE
  const pick = hint + PARA_GAP + actions
  const choices = choicesHeight(s.maxChoices)
  let ask: number
  let reveal: number
  // The reveal: feedback, then the rule (8 px apart), then "Try another
  // action" under them below 768 and beside them from 768.
  const revealText = (width: number) =>
    maxOf(s.reveals.map((r) => (lines(r.feedback, width, GLYPH.caption) + lines(r.rule, width, GLYPH.caption)) * CAPTION_LINE)) +
    PARA_GAP
  if (variant === 'narrow') {
    const prompt = maxOf(s.prompts.map((t) => lines(t, w, GLYPH.prompt))) * PROMPT_LINE
    ask = prompt + PARA_GAP + choices + PARA_GAP + TARGET_PX
    reveal = revealText(w) + PARA_GAP + TARGET_PX
  } else {
    const prompt = maxOf(s.prompts.map((t) => lines(t, WIDE_SIDE, GLYPH.prompt))) * PROMPT_LINE
    ask = Math.max(prompt + PARA_GAP + TARGET_PX, choices)
    reveal = Math.max(revealText(w - CHOICE.sideGap - REVEAL_BUTTON), TARGET_PX)
  }
  return { pick, ask, reveal, dock: Math.max(pick, ask, reveal) }
}

export type ListKeysMetrics = {
  header: number
  stage: number
  dock: number
  footer: number
  total: number
}

export function listKeysMetrics(): PerVariant<ListKeysMetrics> {
  const m = (variant: Variant): ListKeysMetrics => {
    // The title only: each preset is one scene (D17).
    const header = headerHeight(1, variant)
    const stage = STAGE[variant]
    const dock = dockModes(variant).dock
    const footer = FOOTER[variant]
    const total =
      2 * FRAME.border +
      2 * FRAME.padding +
      header +
      GAPS.header +
      stage +
      GAPS.status +
      STATUS +
      GAPS.dock +
      dock +
      GAPS.footer +
      footer
    return { header, stage, dock, footer, total }
  }
  return { narrow: m('narrow'), wide: m('wide') }
}

export function listKeysFootprint(): readonly [number, number] {
  const m = listKeysMetrics()
  return [m.narrow.total, m.wide.total]
}

/** The longest choice label, for the choice grid's minimum width. */
export const LONGEST_CHOICE = Math.max(
  NONE_LABEL.length,
  ...Object.values(ITEMS).map((i) => i.text.length),
)
