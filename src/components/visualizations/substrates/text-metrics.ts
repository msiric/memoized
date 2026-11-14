/**
 * A robust width model for text that is laid out without a DOM (VIZ-H D18,
 * A6): SVG diagrams, reserved footprints and the authoring lint all measure
 * with it, so a string that passes lint is a string that fits.
 *
 * Text is split into grapheme clusters (a ZWJ emoji family, a letter with
 * combining marks and a flag each count once), and each cluster gets an
 * advance in em by its kind:
 * - emoji (pictographic, or any cluster with VS16 or ZWJ): 1.25 em, above
 *   Apple Color Emoji and Noto Color Emoji (about 1.1 to 1.2 em);
 * - East Asian wide and fullwidth (CJK, kana, Hangul, fullwidth forms): 1 em,
 *   the advance of every CJK fallback font;
 * - everything else: the face's advance (monospace or sans).
 *
 * Widths are upper bounds: a layout reserves them, a lint compares them to
 * the slot, and real rendering is never wider.
 */

/** Monospace advance as a fraction of the font size, padded slightly above
 * the widest common stack member (Menlo and DejaVu Sans Mono, 0.602). */
export const MONO_ADVANCE = 0.61
/**
 * Average sans advance for running UI text, padded about 15 % above the
 * system UI fonts measured in Chromium (about 0.47 em for mixed lowercase).
 * The same padding the shell's caption model uses (7.2 px at 14 px).
 */
export const SANS_ADVANCE = 0.54
export const WIDE_ADVANCE = 1
export const EMOJI_ADVANCE = 1.25

type Segmenter = { segment: (s: string) => Iterable<{ segment: string }> }
const segmenter: Segmenter | null =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new (Intl as unknown as { Segmenter: new (l?: string, o?: object) => Segmenter }).Segmenter(undefined, {
        granularity: 'grapheme',
      })
    : null

/** Grapheme clusters; falls back to code points with marks folded in. */
export function graphemes(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment)
  const out: string[] = []
  for (const ch of text) {
    if (out.length && /[\p{M}‍️]/u.test(ch)) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}

const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|️|‍/u
// East Asian Wide (W) and Fullwidth (F) ranges, condensed from UAX #11.
const WIDE =
  /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦]|[\u{1f200}-\u{1f2ff}\u{20000}-\u{3fffd}]/u

export type ClusterKind = 'emoji' | 'wide' | 'narrow'

export function clusterKind(cluster: string): ClusterKind {
  if (EMOJI.test(cluster)) return 'emoji'
  if (WIDE.test(cluster)) return 'wide'
  return 'narrow'
}

/** Width in em of `text` set in a face whose narrow advance is `advance` em. */
export function emWidth(text: string, advance: number): number {
  let w = 0
  for (const g of graphemes(text)) {
    const k = clusterKind(g)
    w += k === 'emoji' ? EMOJI_ADVANCE : k === 'wide' ? Math.max(WIDE_ADVANCE, advance) : advance
  }
  return w
}

export const monoWidth = (text: string, size: number) => emWidth(text, MONO_ADVANCE) * size
export const sansWidth = (text: string, size: number) => emWidth(text, SANS_ADVANCE) * size

/** True when the text holds clusters that are not one narrow column (lint reports them). */
export const hasWideText = (text: string) => graphemes(text).some((g) => clusterKind(g) !== 'narrow')

/**
 * Greedy word wrap by measured width. A word longer than the line is broken
 * between clusters, so no line is ever wider than `maxWidth`.
 */
export function wrapByWidth(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  const push = (word: string) => {
    let rest = word
    while (measure(rest) > maxWidth) {
      const gs = graphemes(rest)
      let k = gs.length - 1
      while (k > 1 && measure(gs.slice(0, k).join('')) > maxWidth) k--
      lines.push(gs.slice(0, k).join(''))
      rest = gs.slice(k).join('')
    }
    line = rest
  }
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (measure(next) <= maxWidth) line = next
    else {
      if (line) lines.push(line)
      push(word)
    }
  }
  if (line) lines.push(line)
  return lines
}
