import type { CSSProperties } from 'react'
import type { PerVariant } from './types'

/**
 * Per-variant sizes without JavaScript layout: each element carries its
 * narrow and wide values as CSS custom properties, and one literal class pair
 * picks the right one. The variant is chosen by the frame's own width in rem
 * (a container query, D19: `vz-wide` from 37.875rem, 606 px at the default
 * size, the stage at a 768 px viewport), not the viewport, so a reader's
 * larger text gets the narrow layout wherever the wide one would not fit.
 * Server and client render the same markup, so nothing shifts on hydration.
 *
 * Geometry is authored in px at the default 16 px root and emitted in rem
 * (D19, F3): with the reader's text size at 150 % or 200 %, every reserved
 * height, offset and gap grows with the text it holds, instead of rem text
 * overflowing px boxes.
 */
export const H_CLS = 'h-[var(--vz-h-n)] vz-wide:h-[var(--vz-h-w)] vz-col:h-[var(--vz-h-c)]'
/** The same reserve as a floor, for text that may wrap past its model under very large text (a static title). */
export const MIN_H_CLS = 'min-h-[var(--vz-h-n)] vz-wide:min-h-[var(--vz-h-w)] vz-col:min-h-[var(--vz-h-c)]'
export const TRANSLATE_Y_CLS = '[transform:translateY(var(--vz-y-n))] vz-wide:[transform:translateY(var(--vz-y-w))]'

/** The px-per-rem the geometry is authored at (the browser default root size). */
export const ROOT_PX = 16

/** A px length at the default root, as a rem length that follows the reader's text size. */
export function rem(px: number): string {
  return px === 0 ? '0' : `${Math.round((px / ROOT_PX) * 10_000) / 10_000}rem`
}

/**
 * Per-variant heights. `col` is the full lesson column (`vz-col`, from
 * 47.875rem): a static figure's caption that wraps at 606 px fits one line
 * there, so it reserves less (H3 INTEG 4). Without it the column keeps the
 * wide height.
 */
export function heights(h: PerVariant<number> & { col?: number }, style?: CSSProperties): CSSProperties {
  return {
    ...style,
    ['--vz-h-n' as string]: rem(h.narrow),
    ['--vz-h-w' as string]: rem(h.wide),
    ['--vz-h-c' as string]: rem(h.col ?? h.wide),
  }
}

export function translateY(y: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return {
    ...style,
    ['--vz-y-n' as string]: rem(y.narrow),
    ['--vz-y-w' as string]: rem(y.wide),
  }
}
