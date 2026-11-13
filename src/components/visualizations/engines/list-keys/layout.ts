import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../../primitives/tokens-v3'
import { codePaneHeight } from '../../shell/code-geometry'
import {
  CHOICE,
  FOOTER,
  FRAME,
  GLYPH,
  LAST_TIME_LINE,
  MIN_TEXT_WIDTH,
  PROMPT_LINE,
  headerHeight,
  lastTimeText,
  wrapLines,
} from '../../shell/footprint'
import type { PerVariant, Variant } from '../../shell/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import {
  LIST_RULE,
  NONE_LABEL,
  NO_CHECK_PROMPT,
  WRAPPER_RULE,
  feedbackLead,
  listChoices,
  listPrompt,
  wrapperChoices,
  wrapperPrompt,
} from './content'
import { CODE_ROWS } from './code'
import {
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  keyText,
  type Checks,
} from './model'

/**
 * Fixed footprint of the list-keys explorable (spec §3.3, §3.4). Every region
 * has an explicit height per variant, the maximum over every key, action,
 * starting state, prediction and feedback of the preset's scene, so switching
 * any of them never moves the page. Text is wrapped with the foundation's
 * conservative glyph widths at the narrowest width of each variant.
 */

/**
 * A card is one instance: its spine (the instance letter) on the outer edge,
 * the item on the first line with its checkbox at the end that faces the
 * match lines, and the key on the second line. The checkbox sits on the
 * first line, so a match line leaves a card at the checkbox's height and the
 * riding check never crosses the row's text or its instance letter (H3 R6).
 */
export const CARD = { height: TARGET_PX, gap: 12, spine: 28, border: 1, pad: 8, padTight: 4, checkGap: 8, lineGap: 2, badge: 12 + 4 } as const
export const CHECK = 16
/** The first line's centre (the checkbox's centre) from the card's top edge. */
export const CHECK_Y =
  CARD.border +
  (CARD.height - 2 * CARD.border - (typeScale.item.line + CARD.lineGap + typeScale.meta.line)) / 2 +
  typeScale.item.line / 2
/** The checkbox's centre from the card's edge that faces the lines. */
export const CHECK_INSET = CARD.border + CARD.pad + CHECK / 2

export const COLUMNS = {
  /** Column label row ("Before", "After") and its gap to the first card. */
  label: 16,
  labelGap: 8,
  rows: 3,
  /** Narrow: the gap between the columns that holds the match lines. */
  linesNarrow: 32,
  /** Cards stop growing here; the match lines take the rest. */
  cardMax: 224,
  /** Stacked (very large text, H3 R9): the rail beside the cards that holds the lines. */
  rail: 32,
  /** Stacked: the space between the Before block and the After block. */
  stackGap: 16,
} as const
export const COLUMNS_BODY =
  COLUMNS.rows * CARD.height + (COLUMNS.rows - 1) * CARD.gap
export const COLUMNS_HEIGHT = COLUMNS.label + COLUMNS.labelGap + COLUMNS_BODY

/** Top of card row `i` inside a column (below its label). */
export const rowTop = (i: number) =>
  COLUMNS.label + COLUMNS.labelGap + i * (CARD.height + CARD.gap)

/** Stacked: the Before block (two rows), then the After block under it. */
export const BEFORE_BLOCK = rowTop(2) - CARD.gap
export const AFTER_TOP = BEFORE_BLOCK + COLUMNS.stackGap
export const STACKED_HEIGHT = AFTER_TOP + COLUMNS_HEIGHT

/**
 * The narrowest card that keeps its text whole: the spine, the longest item
 * with its checkbox, or the longest key, whichever is wider. Below two of
 * them and the narrow gutter the columns stack (H3 R9: Chrome's "Very large"
 * text on a 375 phone, 200 % text). In rem, so larger text stacks sooner.
 */
const longestItem = Math.max(...Object.values(ITEMS).map((i) => sansWidth(i.text, typeScale.item.size)))
const longestKey = Math.max(
  ...KEY_STRATEGIES.flatMap((k) =>
    Object.keys(ITEMS).flatMap((id, i) =>
      (['before', 'after'] as const).map((ph) =>
        monoWidth(`key=${keyText(k, id as keyof typeof ITEMS, Math.min(i, ph === 'before' ? 1 : 2), ph)}`, typeScale.meta.size),
      ),
    ),
  ),
)
export const CARD_MIN = Math.ceil(
  // The tight padding below 375 (`px-1 xs:px-2`); the key line holds a badge.
  2 * CARD.border + CARD.spine + 2 * CARD.padTight + Math.max(longestItem + CARD.checkGap + CHECK, longestKey + CARD.badge),
)
export const STACK_BELOW = 2 * CARD_MIN + COLUMNS.linesNarrow

/** The two control rows (key and action), 8 px apart. */
export const CONTROLS = 2 * TARGET_PX + TARGET_GAP_PX
export const STAGE_GAP = { narrow: 8, wide: 16 } as const
export const CODE_HEIGHT = codePaneHeight(CODE_ROWS)
/** Narrow: the gap between the code strip and the columns. */
const CODE_GAP = 16

export const STAGE: PerVariant<number> = {
  // controls, code strip, then the columns
  narrow: CONTROLS + STAGE_GAP.narrow + CODE_HEIGHT + CODE_GAP + COLUMNS_HEIGHT,
  // controls, then code (left) beside the columns (right)
  wide: CONTROLS + STAGE_GAP.wide + Math.max(CODE_HEIGHT, COLUMNS_HEIGHT),
}
/** The narrow stage with the columns stacked (very large text only). */
export const STAGE_STACKED = STAGE.narrow - COLUMNS_HEIGHT + STACKED_HEIGHT

export const GAPS = { header: 16, dock: 16, footer: 16 } as const

/** Dock copy is UI type (H3 R3): the caption's 14/24. */
const BODY_LINE = typeScale.caption.line
const BLOCK_GAP = 8

export type Scene = 'list' | 'wrapper'

/** Every string the dock can show for a scene, per mode. */
export function dockStrings(scene: Scene) {
  const prompts: string[] = []
  const reveals: { lead: string; rule: string }[] = []
  if (scene === 'list') {
    prompts.push(NO_CHECK_PROMPT)
    const subsets: Checks[] = [
      { milk: false, dog: false },
      { milk: true, dog: false },
      { milk: false, dog: true },
      { milk: true, dog: true },
    ]
    for (const key of KEY_STRATEGIES) {
      for (const action of LIST_ACTIONS) {
        const choices = listChoices(action)
        const labelOf = (id: string) => choices.find((c) => c.id === id)?.label ?? id
        for (const checks of subsets) {
          const tracked = checks.milk ? 'milk' : checks.dog ? 'dog' : null
          if (tracked) prompts.push(listPrompt(tracked))
          const picks = tracked ? [null, ...choices.map((c) => c.id)] : [undefined]
          for (const pick of picks)
            for (const answer of choices.map((c) => c.id))
              reveals.push({ lead: feedbackLead(pick, answer, labelOf), rule: LIST_RULE[`${key}/${action}`] })
        }
      }
    }
  } else {
    for (const action of WRAPPER_ACTIONS) {
      prompts.push(wrapperPrompt(action))
      for (const count of [7, 99]) {
        const choices = wrapperChoices(count)
        const labelOf = (id: string) => choices.find((c) => c.id === id)?.label ?? id
        for (const pick of [null, 'kept', 'reset'])
          reveals.push({ lead: feedbackLead(pick, 'kept', labelOf), rule: WRAPPER_RULE[action] })
      }
    }
  }
  const maxChoices =
    scene === 'list'
      ? Math.max(...LIST_ACTIONS.map((a) => listChoices(a).length))
      : wrapperChoices(0).length
  const unique = [...new Map(reveals.map((r) => [`${r.lead}|${r.rule}`, r])).values()]
  // G ruling 2: the earlier answer as a line under the prompt; its slot holds the longest one.
  const labels =
    scene === 'list' ? LIST_ACTIONS.flatMap((a) => listChoices(a).map((c) => c.label)) : wrapperChoices(99).map((c) => c.label)
  const lastTime = lastTimeText([...labels].sort((a, b) => sansWidth(b, 12) - sansWidth(a, 12))[0])
  return { prompts: [...new Set(prompts)], reveals: unique, maxChoices, lastTime }
}

/** "2 reused · 1 mounted": what React did, counted. */
export function listTally(outcome: { reused: readonly (0 | 1 | null)[] }): string {
  const reused = outcome.reused.filter((r) => r !== null).length
  const mounted = outcome.reused.length - reused
  const gone = ([0, 1] as const).filter((r) => !outcome.reused.includes(r)).length
  return [reused && `${reused} reused`, mounted && `${mounted} mounted`, gone && `${gone} unmounted`]
    .filter(Boolean)
    .join(' · ')
}
export const wrapperTally = (reused: boolean) => (reused ? 'Counter reused' : 'Counter remounted')

const chars = (width: number, glyph: number) => Math.floor(width / glyph)
const lines = (t: string, width: number, glyph: number) => wrapLines(t, chars(width, glyph))
const maxOf = (xs: number[]) => Math.max(0, ...xs)

export const choicesHeight = (count: number) => {
  const rows = Math.ceil(count / 2)
  return rows * CHOICE.height + (rows - 1) * CHOICE.gap
}

/**
 * List-keys choices from 768: two 148 px columns (labels are at most about
 * 9 characters, so the shell's 168 is not needed), beside the text.
 */
export const LK_CHOICE_WIDTH = 148
export const WIDE_CHOICES = 2 * LK_CHOICE_WIDTH + CHOICE.gap
export const WIDE_SIDE = MIN_TEXT_WIDTH.wide - CHOICE.sideGap - WIDE_CHOICES

/**
 * The verdict (H3 F2 ruling 2): at most two short sentences, the lead and
 * the rule, in the shared feedback style. What happened to each row is drawn
 * (the ride, the instance letters, the badges) and narrated; the tally sits
 * in the action row.
 */
function revealTextHeight(r: { lead: string; rule: string }, width: number) {
  return lines(`${r.lead} ${r.rule}`.trim(), width, GLYPH.caption) * BODY_LINE
}

/** The dock's one action row: Skip, Show me or Try another (44 px targets), and the tally once revealed. */
const ACTION_ROW = TARGET_PX

export function dockModes(variant: Variant, scene: Scene) {
  const s = dockStrings(scene)
  const w = MIN_TEXT_WIDTH[variant]
  const choices = choicesHeight(s.maxChoices)
  const side = variant === 'narrow' ? w : WIDE_SIDE
  const text = Math.max(
    maxOf(s.prompts.map((t) => lines(t, side, GLYPH.prompt))) * PROMPT_LINE +
      lines(s.lastTime, side, GLYPH.note) * LAST_TIME_LINE,
    maxOf(s.reveals.map((r) => revealTextHeight(r, side))),
  )
  // Narrow: text, choices, the action row. Wide: the text with the action
  // row under it, beside the choices.
  const dock =
    variant === 'narrow'
      ? text + BLOCK_GAP + choices + BLOCK_GAP + ACTION_ROW
      : Math.max(text + BLOCK_GAP + ACTION_ROW, choices)
  return { text, choices, dock }
}

export type ListKeysMetrics = {
  header: number
  stage: number
  dock: number
  footer: number
  total: number
}

export function listKeysMetrics(scene: Scene = 'list'): PerVariant<ListKeysMetrics> {
  const m = (variant: Variant): ListKeysMetrics => {
    // The title only: each preset is one scene (D17).
    const header = headerHeight(1, variant)
    const stage = STAGE[variant]
    const dock = dockModes(variant, scene).dock
    const footer = FOOTER[variant]
    const total =
      2 * FRAME.border +
      2 * FRAME.padding +
      header +
      GAPS.header +
      stage +
      GAPS.dock +
      dock +
      GAPS.footer +
      footer
    return { header, stage, dock, footer, total }
  }
  return { narrow: m('narrow'), wide: m('wide') }
}

/** The lazy mount's placeholder: the taller scene (the list), per variant. */
export function listKeysFootprint(): readonly [number, number] {
  const a = listKeysMetrics('list')
  const b = listKeysMetrics('wrapper')
  return [Math.max(a.narrow.total, b.narrow.total), Math.max(a.wide.total, b.wide.total)]
}

/** The longest choice label, for the choice grid's minimum width. */
export const LONGEST_CHOICE = Math.max(
  NONE_LABEL.length,
  ...Object.values(ITEMS).map((i) => i.text.length),
)

/**
 * The strings the measured dock keeps as invisible ghosts (D15) for one
 * scene: the longest prompts, and every distinct verdict. A verdict is two
 * short sentences, so there are few of them, and the line a word breaks on
 * is not predicted by length: every one is kept, so the dock holds the true
 * worst case at any width and text size.
 */
export function dockGhostStrings(scene: Scene, keep = 3) {
  const s = dockStrings(scene)
  const prompts = [...s.prompts].sort((a, b) => b.length - a.length).slice(0, keep)
  return { prompts, reveals: s.reveals, maxChoices: s.maxChoices, lastTime: s.lastTime }
}
