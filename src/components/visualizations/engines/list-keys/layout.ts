import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../../primitives/tokens-v3'
import { codePaneHeight } from '../../shell/code-geometry'
import { choiceGeometry, choicesHeight } from '../../primitives/choice-geometry'
import {
  BANDS,
  CHOICE,
  FOOTER,
  FRAME,
  GLYPH,
  LAST_TIME_LINE,
  MIN_TEXT_WIDTH,
  PROMPT_LINE,
  WIDE_MIN,
  headerHeight,
  lastTimeText,
  titleLines,
  wrapLines,
} from '../../shell/footprint'
import type { PerVariant, Variant } from '../../shell/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import {
  AGAIN_LABEL,
  LIST_RULE,
  NO_CHECK_PROMPT,
  TITLE,
  WRAPPER_RULE,
  WRAPPER_TITLE,
  feedbackLead,
  listAnswer,
  listChoices,
  listPrompt,
  wrapperChoices,
  wrapperPrompt,
} from './content'
import { CODE_ROWS } from './code'
import { RECORDED_LINE } from './OutcomesAsText'
import { MAX_COUNT } from './machine'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'
import {
  AFTER,
  BEFORE,
  ITEMS,
  KEY_STRATEGIES,
  keyText,
  type Checks,
  type KeyStrategy,
  type ListAction,
  type WrapperAction,
} from './model'

/**
 * Fixed footprint of the list-keys explorable (spec §3.3, §3.4). Every region
 * has an explicit height per variant, sized to the combination on screen
 * (final polish): the key and the action (or the wrapper's change) pick the
 * stage's card rows, the choice set and the verdicts the dock reserves, so
 * nothing moves while the learner checks rows, predicts, skips or sees the
 * reveal. Choosing another key or action is a user-initiated switch, like a
 * preset switch, and may change the frame's height. Text is wrapped with the
 * foundation's conservative glyph widths at the narrowest width of each
 * variant.
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
/** The columns with `rows` card rows: the label row, then the cards. */
export const columnsHeight = (rows: number) =>
  COLUMNS.label + COLUMNS.labelGap + rows * CARD.height + (rows - 1) * CARD.gap
/** The tallest columns (three rows: an action that adds a row), and the wrapper's. */
export const COLUMNS_HEIGHT = columnsHeight(COLUMNS.rows)

/** Card rows a list action draws: the starting two, or three when it adds a row. */
export const rowsOf = (action: ListAction) => Math.max(BEFORE.length, AFTER[action].length)

/** Top of card row `i` inside a column (below its label). */
export const rowTop = (i: number) =>
  COLUMNS.label + COLUMNS.labelGap + i * (CARD.height + CARD.gap)

/** Stacked: the Before block (two rows), then the After block under it. */
export const BEFORE_BLOCK = rowTop(2) - CARD.gap
export const AFTER_TOP = BEFORE_BLOCK + COLUMNS.stackGap
export const stackedHeight = (rows: number) => AFTER_TOP + columnsHeight(rows)
export const STACKED_HEIGHT = stackedHeight(COLUMNS.rows)

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

/**
 * What the frame is sized for: the scene, and the key and action on screen
 * (the wrapper: its change). Everything the learner does within one
 * combination holds the frame still.
 */
export type Combo =
  | { scene: 'list'; key: KeyStrategy; action: ListAction }
  | { scene: 'wrapper'; action: WrapperAction }
export const comboId = (c: Combo) => (c.scene === 'list' ? `list/${c.key}/${c.action}` : `wrapper/${c.action}`)
/** Card rows: the list's per action; the wrapper's box and Counter take the three-row height. */
export const comboRows = (c: Combo) => (c.scene === 'list' ? rowsOf(c.action) : COLUMNS.rows)

/**
 * The stage per variant: the controls, then the code strip over the columns
 * (narrow, or stacked under very large text), or the code beside the
 * columns (wide), the code pane stretched to the columns' height so the
 * stage has no empty quadrant.
 */
export function stageOf(c: Combo): PerVariant<number> & { stacked: number; code: number } {
  const cols = columnsHeight(comboRows(c))
  const narrow = CONTROLS + STAGE_GAP.narrow + CODE_HEIGHT + CODE_GAP + cols
  return {
    narrow,
    wide: CONTROLS + STAGE_GAP.wide + Math.max(CODE_HEIGHT, cols),
    stacked: narrow - cols + stackedHeight(comboRows(c)),
    code: Math.max(CODE_HEIGHT, cols),
  }
}

/** The frame's own gaps (drift S05: the shell's `FRAME`). */
export const GAPS = { header: FRAME.headerGap, dock: FRAME.dockGap, footer: FRAME.footerGap } as const

/** Dock copy is UI type (H3 R3): the caption's 14/24. */
const BODY_LINE = typeScale.caption.line

export type Scene = 'list' | 'wrapper'

/** Every string the dock can show for one combination, per mode. */
export function dockStrings(c: Combo) {
  const prompts: string[] = []
  const reveals: { lead: string; rule: string }[] = []
  let choiceSet: { id: string; label: string }[]
  let tally: string
  if (c.scene === 'list') {
    choiceSet = listChoices(c.action)
    const labelOf = (id: string) => choiceSet.find((x) => x.id === id)?.label ?? id
    const rule = LIST_RULE[`${c.key}/${c.action}`]
    prompts.push(NO_CHECK_PROMPT)
    const subsets: Checks[] = [
      { milk: false, dog: false },
      { milk: true, dog: false },
      { milk: false, dog: true },
      { milk: true, dog: true },
    ]
    const outcome = LIST_OUTCOMES[`${c.key}/${c.action}`]
    for (const checks of subsets) {
      const tracked = checks.milk ? 'milk' : checks.dog ? 'dog' : null
      if (tracked) prompts.push(listPrompt(tracked))
      // The answer is React's recorded match for the tracked row: only the
      // verdicts this combination can show are reserved.
      const answer = tracked ? listAnswer(c.action, outcome, tracked === 'milk' ? 0 : 1) : choiceSet[0].id
      const picks = tracked ? [null, ...choiceSet.map((x) => x.id)] : [undefined]
      for (const pick of picks) reveals.push({ lead: feedbackLead(pick, answer, labelOf), rule })
    }
    tally = listTally(LIST_OUTCOMES[`${c.key}/${c.action}`])
  } else {
    prompts.push(wrapperPrompt(c.action))
    // The count's label is widest at the largest count (the choice set reserves it).
    choiceSet = wrapperChoices(MAX_COUNT)
    for (const count of [7, MAX_COUNT]) {
      const choices = wrapperChoices(count)
      const labelOf = (id: string) => choices.find((x) => x.id === id)?.label ?? id
      const answer = WRAPPER_OUTCOMES[c.action].counterReused ? 'kept' : 'reset'
      for (const pick of [null, 'kept', 'reset'])
        reveals.push({ lead: feedbackLead(pick, answer, labelOf), rule: WRAPPER_RULE[c.action] })
    }
    tally = wrapperTally(WRAPPER_OUTCOMES[c.action].counterReused)
  }
  const unique = [...new Map(reveals.map((r) => [`${r.lead}|${r.rule}`, r])).values()]
  // G ruling 2: the earlier answer as a line under the prompt; its slot holds the longest one.
  const lastTime = lastTimeText(
    [...choiceSet.map((x) => x.label)].sort((a, b) => sansWidth(b, 12) - sansWidth(a, 12))[0],
  )
  return { prompts: [...new Set(prompts)], reveals: unique, maxChoices: choiceSet.length, lastTime, choiceSet, tally }
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

const chars = (width: number, glyph: number) => Math.max(1, Math.floor(width / glyph))
const lines = (t: string, width: number, glyph: number) => wrapLines(t, chars(width, glyph))
const maxOf = (xs: number[]) => Math.max(0, ...xs)

/**
 * "Try another", the widest trailing action (the secondary pill, 16 px
 * sides), plus slack: the shared checkpoint's trailing cell (`trail`), so
 * Skip, "Show me" and "Try another" share one place (H3 R2 Q4).
 */
export const TRAILING_WIDTH = Math.ceil(sansWidth(AGAIN_LABEL, typeScale.control.size)) + 2 * 16 + 4

/** The verdict's text cell keeps this much room beside the choices, or the block stacks (Q4). */
export const DOCK_TEXT_MIN = 256

/**
 * The dock at content width `width` (px at the default root) for one
 * combination: the shared checkpoint layout (`primitives/Checkpoint.tsx`,
 * Q4). The text cell (the question with its note, or the verdict with its
 * tally) sits beside the choice row wherever both fit with the text keeping
 * `DOCK_TEXT_MIN`; otherwise it sits over the choices, which take one row
 * or two columns. The same model as the event loop's dock
 * (`shell/footprint.ts` `dockAt`).
 */
export function dockAt(c: Combo, width: number, variant: Variant): number {
  const s = dockStrings(c)
  const mono = c.scene === 'wrapper'
  const labels = s.choiceSet.map((x) => x.label)
  const g = choiceGeometry(labels, mono, TRAILING_WIDTH, DOCK_TEXT_MIN)
  const beside = variant === 'wide' && width >= Math.max(g.rowWide, WIDE_MIN)
  const side = beside ? width - CHOICE.textGap - 8 - (g.n * g.col + g.n * CHOICE.gap + g.trail) : width
  // The note shares the prompt's line when both fit (Q15), else wraps under it.
  const prompt = maxOf(
    s.prompts.map((t) => {
      const n = lines(t, side, GLYPH.prompt)
      const inline = n === 1 && [...t].length * GLYPH.prompt + 16 + sansWidth(s.lastTime, 12) <= side
      return n * PROMPT_LINE + (inline ? 0 : lines(s.lastTime, side, GLYPH.note) * LAST_TIME_LINE)
    }),
  )
  // The verdict (two short sentences, F2 ruling 2) with its tally under it.
  const verdict =
    maxOf(s.reveals.map((r) => lines(`${r.lead} ${r.rule}`.trim(), side, GLYPH.caption) * BODY_LINE)) +
    lines(s.tally, side, GLYPH.note) * LAST_TIME_LINE
  const text = Math.max(prompt, verdict)
  const choices = choicesHeight(labels, width, variant === 'wide', mono, TRAILING_WIDTH, DOCK_TEXT_MIN)
  return beside ? Math.max(text, choices) : text + CHOICE.textGap + choices
}

export type ListKeysMetrics = {
  header: number
  stage: number
  dock: number
  footer: number
  total: number
}

/**
 * The frame laid out at content width `width` (px at the default root) in
 * `variant`. The stage is fixed per variant (stacked below `STACK_BELOW`,
 * very large text); the title, the dock and the footer wrap with the width
 * (Q16: the text-scaled part).
 */
export function listKeysMetricsAt(c: Combo, width: number, variant: Variant): ListKeysMetrics {
  const title = c.scene === 'list' ? TITLE : WRAPPER_TITLE
  // The title only: each preset is one scene (D17).
  const header = headerHeight(1, variant, titleLines(title, width))
  const st = stageOf(c)
  const stage = variant === 'narrow' && width < STACK_BELOW ? st.stacked : st[variant]
  const dock = dockAt(c, width, variant)
  const footer =
    variant === 'wide' ? FOOTER.wide : TARGET_PX + lines(RECORDED_LINE, width, GLYPH.note) * typeScale.provenance.line
  const total =
    2 * FRAME.border + 2 * FRAME.padding + header + GAPS.header + stage + GAPS.dock + dock + GAPS.footer + footer
  return { header, stage, dock, footer, total }
}

/** Per variant: narrow at a 375 px phone (`BANDS.phone`), wide at 768. */
export function listKeysMetrics(c: Combo): PerVariant<ListKeysMetrics> {
  return { narrow: listKeysMetricsAt(c, BANDS.phone, 'narrow'), wide: listKeysMetricsAt(c, MIN_TEXT_WIDTH.wide, 'wide') }
}

/**
 * The lazy mount's reserve for one preset (its starting combination), in the
 * step-throughs' band format (H3 R2 Q16): [narrow, wide, small, tight,
 * tighter] frame heights in px at the default root, each narrow band laid
 * out at its narrowest width.
 */
export function listKeysBands(c: Combo): readonly [number, number, number, number, number] {
  const at = (w: number) => listKeysMetricsAt(c, w, 'narrow').total
  return [at(BANDS.phone), listKeysMetricsAt(c, MIN_TEXT_WIDTH.wide, 'wide').total, at(BANDS.small), at(BANDS.tight), at(BANDS.tighter)]
}

/** The lazy mount's placeholder for a preset's starting combination, per variant. */
export function listKeysFootprint(c: Combo): readonly [number, number] {
  const m = listKeysMetrics(c)
  return [m.narrow.total, m.wide.total]
}

/**
 * The strings the measured dock keeps as invisible ghosts (D15) for one
 * combination: every question and every verdict it can show. A verdict is
 * two short sentences, so there are few of them, and the line a word breaks
 * on is not predicted by length: every one is kept, so the dock holds the
 * true worst case at any width and text size.
 */
export function dockGhostStrings(c: Combo) {
  const s = dockStrings(c)
  return { prompts: s.prompts, reveals: s.reveals, lastTime: s.lastTime, tally: s.tally }
}
