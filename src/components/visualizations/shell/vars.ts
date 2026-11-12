import type { CSSProperties } from 'react'
import type { PerVariant } from './types'

/**
 * Per-variant sizes without JavaScript layout: each element carries its
 * narrow and wide values as CSS custom properties, and one literal class pair
 * picks the right one at the 768 px breakpoint. Server and client render the
 * same markup, so nothing shifts on hydration.
 *
 * Geometry is authored in px at the default 16 px root and emitted in rem
 * (D19, F3): with the reader's text size at 150 % or 200 %, every reserved
 * height, offset and gap grows with the text it holds, instead of rem text
 * overflowing px boxes.
 */
export const H_CLS = 'h-[var(--vz-h-n)] md:h-[var(--vz-h-w)]'
export const TRANSLATE_Y_CLS = '[transform:translateY(var(--vz-y-n))] md:[transform:translateY(var(--vz-y-w))]'

/** The px-per-rem the geometry is authored at (the browser default root size). */
export const ROOT_PX = 16

/** A px length at the default root, as a rem length that follows the reader's text size. */
export function rem(px: number): string {
  return px === 0 ? '0' : `${Math.round((px / ROOT_PX) * 10_000) / 10_000}rem`
}

export function heights(h: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return {
    ...style,
    ['--vz-h-n' as string]: rem(h.narrow),
    ['--vz-h-w' as string]: rem(h.wide),
  }
}

export function translateY(y: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return {
    ...style,
    ['--vz-y-n' as string]: rem(y.narrow),
    ['--vz-y-w' as string]: rem(y.wide),
  }
}
