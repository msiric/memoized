import { type as typeScale } from '../primitives/tokens-v3'
import {
  FOOTER,
  CAPTION_LINE,
  COL_TEXT_WIDTH,
  FRAME,
  GLYPH,
  MIN_TEXT_WIDTH,
  wrapLines,
} from './footprint'
import type { StaticDescriptor, StaticPreset } from './static-types'
import type { PerVariant, Variant } from './types'

/**
 * Fixed footprint of a static figure, per preset and variant: title, stage,
 * caption (reserved at the narrowest width of the variant) and footer. The
 * lazy mount uses the same numbers for its placeholder, so a soft navigation
 * that renders the figure on the client never shifts the page.
 *
 * A third tier, `col` (the full lesson column, 766 px of content from 1280),
 * reserves only the caption lines it needs there: a caption that wraps at
 * 606 px fits one line in the column (H3 INTEG 4). The title wraps instead
 * of truncating (INTEG 5) and reserves its lines the same way.
 */

/** A static figure's tiers: the two layout variants plus the full column. */
export type StaticTier = Variant | 'col'
export const STATIC_TIERS: readonly StaticTier[] = ['narrow', 'wide', 'col']
const TEXT_WIDTH: Record<StaticTier, number> = { ...MIN_TEXT_WIDTH, col: COL_TEXT_WIDTH }

export type StaticMetrics = {
  title: number
  stage: number
  caption: number
  footer: number
  total: number
}

export function captionHeight(caption: string, tier: StaticTier): number {
  return wrapLines(caption, Math.floor(TEXT_WIDTH[tier] / GLYPH.caption)) * CAPTION_LINE
}

/** The title (16/600, the prompt's glyph width) wraps at the tier's width. */
export function titleHeight(title: string, tier: StaticTier): number {
  return wrapLines(title, Math.floor(TEXT_WIDTH[tier] / GLYPH.prompt)) * typeScale.title.line
}

export function staticMetrics<D>(
  def: StaticDescriptor<D>,
  preset: StaticPreset<D>,
): Record<StaticTier, StaticMetrics> {
  const stage = def.engine.stageHeight(preset.data)
  const metrics = (tier: StaticTier): StaticMetrics => {
    const variant: Variant = tier === 'col' ? 'wide' : tier
    const title = titleHeight(preset.title, tier)
    const caption = captionHeight(preset.caption, tier)
    const footer = FOOTER[variant]
    const total =
      2 * FRAME.border +
      2 * FRAME.padding +
      title +
      FRAME.headerGap +
      stage[variant] +
      FRAME.headerGap +
      caption +
      FRAME.footerGap +
      footer
    return { title, stage: stage[variant], caption, footer, total }
  }
  return { narrow: metrics('narrow'), wide: metrics('wide'), col: metrics('col') }
}

/** [narrow, wide, col] frame heights for every preset, default first. */
export function staticFootprints<D>(
  def: StaticDescriptor<D>,
): Record<string, readonly [number, number, number]> {
  const ordered = [...def.presets].sort((a, b) =>
    a.id === def.defaultPreset ? -1 : b.id === def.defaultPreset ? 1 : 0,
  )
  return Object.fromEntries(
    ordered.map((p) => {
      const m = staticMetrics(def, p)
      return [p.id, [m.narrow.total, m.wide.total, m.col.total] as const]
    }),
  )
}
