import { heights, rem } from '../shell/vars'

/**
 * Engine geometry in rem (VIZ-H D19): lengths are authored in px at the
 * default 16 px root and emitted in rem, so a reader's larger text size
 * grows every box with the text it holds. The engines' names for the
 * shell's helpers (`shell/vars.ts`), so there is one conversion.
 */
export const toRem = rem

/** Per-variant heights as rem custom properties, read by `H_CLS` (`--vz-h-n`, `--vz-h-w`). */
export const remHeights = heights
