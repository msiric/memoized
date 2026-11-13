import { segmentedWidth } from '../../step-log/validate'
import { rem } from '../../shell/vars'
import { ACTION_LABEL, LIST_ACTIONS } from './model'
import { BEFORE_BLOCK, CARD, COLUMNS, COLUMNS_HEIGHT, STACKED_HEIGHT, STACK_BELOW, STAGE_STACKED } from './layout'

/**
 * The columns' two layouts, chosen by the frame's width in rem (a container
 * query on `vz`, so the server markup is already right and larger text
 * switches sooner, D19):
 *
 * - side by side: Before | lines | After. The After card mirrors the Before
 *   card (checkbox on the edge that faces the lines, the instance letter on
 *   the outer edge), so a check rides only its line (H3 R6);
 * - stacked, below two whole cards and the narrow gutter (H3 R9, Chrome's
 *   "Very large" text on a phone, 200 % text): Before above After, both
 *   cards with the checkbox on the right, the lines in a rail beside them.
 *
 * Plain CSS from the layout constants, scoped to the list-keys frame.
 */
const F = '[data-viz-frame="list-keys"]'
const edge = `${CARD.border}px`
const stacked =
  `${F} [data-lk-cols]{grid-template-columns:minmax(0,1fr) ${rem(COLUMNS.rail)};grid-template-rows:${rem(BEFORE_BLOCK)} ${rem(COLUMNS_HEIGHT)};row-gap:${rem(COLUMNS.stackGap)};height:${rem(STACKED_HEIGHT)}}` +
  `${F} [data-lk-area=after]{grid-area:2/1}` +
  `${F} [data-lk-area=lines]{grid-area:1/2/3/3}` +
  // The wrapper's Before block (box and Add 1) is taller than two list rows:
  // its rows size to content (both blocks fit the stacked height).
  `${F} [data-lk-scene=wrapper]{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;align-content:start;height:auto}` +
  `${F} [data-lk-scene=wrapper] [data-lk-area=lines]{display:none}` +
  `${F} [data-lk-flip]{flex-direction:row-reverse}` +
  `${F} [data-lk-spine=after]{border-left-width:0;border-right-width:${edge}}` +
  `${F} [data-lk-stage]{height:${rem(STAGE_STACKED)}}`
const cols = `minmax(0,${rem(COLUMNS.cardMax)}) minmax(${rem(COLUMNS.linesNarrow)},1fr) minmax(0,${rem(COLUMNS.cardMax)})`

/** The width (rem) from which the four list actions fit as segments (SegmentedControl's own threshold). */
export const ACTION_FIT = segmentedWidth(LIST_ACTIONS.map((a) => ACTION_LABEL[a])) / 16
const SEG = (part: string) => `${F} [data-viz-part=${part}] [data-vz-seg]`

export const stackCss =
  `${F} [data-lk-cols]{display:grid;grid-template-columns:${cols};height:${rem(COLUMNS_HEIGHT)}}` +
  `${F} [data-lk-area=before]{grid-area:1/1}` +
  `${F} [data-lk-area=lines]{grid-area:1/2}` +
  `${F} [data-lk-area=after]{grid-area:1/3}` +
  `${F} [data-lk-flip]{flex-direction:row}` +
  `${F} [data-lk-spine=after]{border-left-width:${edge};border-right-width:0}` +
  `@container vz (max-width:${rem(STACK_BELOW - 0.02)}){${stacked}}` +
  // N2-03: Key and Action are one control block, so they take one shape.
  // Where the four actions fall back to the select, the key does too (both
  // controls are the same width, so the key's own container answers the
  // action's question). The select only where the segments cannot fit (R8).
  `@container (max-width:${ACTION_FIT - 0.001}rem){${SEG('keys')}>[role=radiogroup]{display:none}${SEG('keys')}>[data-vz-select]{display:inline-flex}}` +
  // Q17: without container queries (Safari before 16, Firefox before 110)
  // the narrow layout holds everywhere: the columns stack (no overflow at
  // any width), and every control is its select, never both drawings.
  `@supports not (container-type:inline-size){${stacked}${F} [data-vz-seg]>[role=radiogroup]{display:none}${F} [data-vz-seg]>[data-vz-select]{display:inline-flex}}` +
  // Print (H3 R10): the lines keep the gutter they were drawn in.
  `@media print{@container vz (min-width:${rem(STACK_BELOW)}){${F} [data-lk-cols]{grid-template-columns:minmax(0,1fr) var(--lk-lines-w) minmax(0,1fr)}}}`
