import type { CSSProperties } from 'react'
import type { PerVariant } from '../shell/types'

/**
 * Engine geometry in rem (VIZ-H D19): lengths are authored in px at the
 * default 16 px root and emitted in rem, so a reader's larger text size
 * grows every box with the text it holds. Same convention as the shell's
 * reserved heights.
 */
export const toRem = (px: number) => (px === 0 ? '0' : `${Math.round((px / 16) * 10_000) / 10_000}rem`)

/** Per-variant heights as rem custom properties, read by `H_CLS` (`--vz-h-n`, `--vz-h-w`). */
export function remHeights(h: PerVariant<number>, style?: CSSProperties): CSSProperties {
  return { ...style, ['--vz-h-n' as string]: toRem(h.narrow), ['--vz-h-w' as string]: toRem(h.wide) }
}
