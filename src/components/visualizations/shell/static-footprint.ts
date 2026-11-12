import { type as typeScale } from '../primitives/tokens-v3'
import {
  FOOTER,
  CAPTION_LINE,
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
 */

export type StaticMetrics = {
  title: number
  stage: number
  caption: number
  footer: number
  total: number
}

export function captionHeight(caption: string, variant: Variant): number {
  return (
    wrapLines(caption, Math.floor(MIN_TEXT_WIDTH[variant] / GLYPH.caption)) *
    CAPTION_LINE
  )
}

export function staticMetrics<D>(
  def: StaticDescriptor<D>,
  preset: StaticPreset<D>,
): PerVariant<StaticMetrics> {
  const stage = def.engine.stageHeight(preset.data)
  const metrics = (variant: Variant): StaticMetrics => {
    const title = typeScale.title.line
    const caption = captionHeight(preset.caption, variant)
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
  return { narrow: metrics('narrow'), wide: metrics('wide') }
}

/** [narrow, wide] frame heights for every preset, default first. */
export function staticFootprints<D>(
  def: StaticDescriptor<D>,
): Record<string, readonly [number, number]> {
  const ordered = [...def.presets].sort((a, b) =>
    a.id === def.defaultPreset ? -1 : b.id === def.defaultPreset ? 1 : 0,
  )
  return Object.fromEntries(
    ordered.map((p) => {
      const m = staticMetrics(def, p)
      return [p.id, [m.narrow.total, m.wide.total] as const]
    }),
  )
}
