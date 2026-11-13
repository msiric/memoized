import { rem } from '../../shell/vars'
import { CARD, COLUMNS, COLUMNS_HEIGHT, STACKED_HEIGHT, STACK_BELOW, STAGE_STACKED } from './layout'

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
const cols = `minmax(0,${rem(COLUMNS.cardMax)}) minmax(${rem(COLUMNS.linesNarrow)},1fr) minmax(0,${rem(COLUMNS.cardMax)})`
const edge = `${CARD.border}px`

export const stackCss =
  `${F} [data-lk-cols]{display:grid;grid-template-columns:${cols};height:${rem(COLUMNS_HEIGHT)}}` +
  `${F} [data-lk-area=before]{grid-area:1/1}` +
  `${F} [data-lk-area=lines]{grid-area:1/2}` +
  `${F} [data-lk-area=after]{grid-area:1/3}` +
  `${F} [data-lk-flip]{flex-direction:row}` +
  `${F} [data-lk-spine=after]{border-left-width:${edge};border-right-width:0}` +
  `${F} [data-lk-lines]{--lk-stacked:0}` +
  `@container vz (max-width:${rem(STACK_BELOW - 0.02)}){` +
  `${F} [data-lk-cols]{grid-template-columns:minmax(0,1fr) ${rem(COLUMNS.rail)};grid-template-rows:auto auto;row-gap:${rem(COLUMNS.stackGap)};height:${rem(STACKED_HEIGHT)}}` +
  `${F} [data-lk-area=after]{grid-area:2/1}` +
  `${F} [data-lk-area=lines]{grid-area:1/2/3/3}` +
  `${F} [data-lk-scene=wrapper]{grid-template-columns:minmax(0,1fr)}` +
  `${F} [data-lk-scene=wrapper] [data-lk-area=lines]{display:none}` +
  `${F} [data-lk-flip]{flex-direction:row-reverse}` +
  `${F} [data-lk-spine=after]{border-left-width:0;border-right-width:${edge}}` +
  `${F} [data-lk-lines]{--lk-stacked:1}` +
  `${F} [data-lk-stage]{height:${rem(STAGE_STACKED)}}` +
  `}`
