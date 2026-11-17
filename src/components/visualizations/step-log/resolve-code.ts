/**
 * Resolves a practice answer's pane from the content when a page is built
 * (the premium-code policy): the repo's logs carry same-width placeholders
 * and `code.premium` (locators, hashes, rows as [indent, from, to]); this
 * reads the answer from the content checkout, checks its sha256, cuts the
 * rows and tokenizes them. The result travels inside the page that shows
 * the visual (`<Viz code>`), never in a committed file or a bundle.
 *
 * Node-only: the MDX serializer (`remark-viz-code.ts`) and the dev gallery's
 * server components import this; client code never does.
 */
import { descriptorFor, vizPremiumPresets } from '../registry'
import type { VizCode } from '../shell/types'
import { rowTokens } from './code-tokens'
import { contentRoot, loadProgram } from './lesson-block'
import { displayText } from './lesson-source'

export type Resolution =
  /** The frame shows no practice answer: nothing to resolve. */
  | { kind: 'none' }
  | { kind: 'resolved'; code: VizCode }
  /** A block is absent (no checkout) or drifted: the frame renders nothing. */
  | { kind: 'missing'; why: string }

const cols = (s: string) => [...s].length

/** The panes a frame of `<Viz id preset>` needs, from the content at `root`. */
export async function resolveVizCode(id: string, preset?: string, root = contentRoot()): Promise<Resolution> {
  const need = vizPremiumPresets(id, preset)
  if (!need.length) return { kind: 'none' }
  const d = descriptorFor(id)
  if (d?.form !== 'step') return { kind: 'none' }
  const code: VizCode = {}
  for (const presetId of need) {
    const log = d.presets.find((p) => p.id === presetId)!.log
    const premium = log.code!.premium!
    let loaded
    try {
      loaded = loadProgram(premium.source, root)
    } catch (e) {
      return { kind: 'missing', why: `${presetId}: ${(e as Error).message}` }
    }
    if (!loaded.ok) return { kind: 'missing', why: `${presetId}: ${loaded.missing} is not in the content checkout` }
    const lines = displayText(loaded.text.split('\n'), premium.rows)
    // Same widths as the committed placeholders, or the reserve would be wrong.
    const bad = lines.findIndex((l, i) => cols(l) !== cols(log.code!.lines[i]))
    if (bad >= 0) return { kind: 'missing', why: `${presetId}: row ${bad + 1} is not the committed width` }
    code[presetId] = { lines, tokens: await rowTokens(loaded.text.split('\n'), premium.rows, log.code!.lang) }
  }
  return { kind: 'resolved', code }
}
