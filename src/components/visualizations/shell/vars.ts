import type { CSSProperties } from 'react'
import type { PerVariant } from './types'

/**
 * Per-variant sizes without JavaScript layout: each element carries its
 * narrow and wide values as CSS custom properties, and one literal class pair
 * picks the right one at the 768 px breakpoint. Server and client render the
 * same markup, so nothing shifts on hydration.
 */
export const H_CLS = 'h-[var(--vz-h-n)] md:h-[var(--vz-h-w)]'
export const TRANSLATE_Y_CLS = '[transform:translateY(var(--vz-y-n))] md:[transform:translateY(var(--vz-y-w))]'

export function heights(h: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return { ...style, ['--vz-h-n' as string]: `${h.narrow}px`, ['--vz-h-w' as string]: `${h.wide}px` }
}

export function translateY(y: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return { ...style, ['--vz-y-n' as string]: `${y.narrow}px`, ['--vz-y-w' as string]: `${y.wide}px` }
}
