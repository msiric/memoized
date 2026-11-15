import fs from 'node:fs'
import path from 'node:path'
import { descriptorFor, vizPremiumPresets } from '../src/components/visualizations/registry'

/**
 * Practice-answer frames are local-only (the premium-code policy): their
 * pane's text is resolved from a local content checkout (`src/content`),
 * never committed, so on CI (free samples only) the gallery renders a note
 * instead of the frame. A test that drives such a frame skips there, with
 * this reason, and runs wherever the checkout has the answers.
 */
export function localOnly(id: string, preset: string): boolean {
  const d = descriptorFor(id)
  if (d?.form !== 'step') return false
  return vizPremiumPresets(id, preset).some((p) =>
    d.presets
      .find((x) => x.id === p)!
      .log.code!.premium!.source.some((part) => 'block' in part && !fs.existsSync(path.join(process.cwd(), 'src', part.block.path.replace(/^content\//, '')))),
  )
}

export const localOnlyNote = (id: string, preset: string) =>
  `${id}/${preset} shows a practice answer: local-only (needs the premium content checkout in src/content; CI has free samples only)`

/** The frame of `preset` itself shows a practice answer's lines: its screenshots are premium text too, never committed. */
export function showsAnswer(id: string, preset: string): boolean {
  const d = descriptorFor(id)
  return d?.form === 'step' && Boolean(d.presets.find((p) => p.id === preset)?.log.code?.premium)
}

/** The step-through a gallery URL opens (`?fr=` the frontier, `?ll=` pointer rewiring), if any. */
export function galleryFrame(url: string): { id: string; preset: string } | null {
  const q = new URL(url, 'http://gallery').searchParams
  const fr = q.get('fr')
  if (fr) return { id: 'bfs-dfs-frontier', preset: fr }
  const ll = q.get('ll')
  if (ll && ll !== 'static') return { id: 'linked-list-pointer-rewiring', preset: ll }
  return null
}

/** Why a gallery URL is skipped here (its frame is local-only and the checkout lacks the answer), or null. */
export function urlLocalOnly(url: string): string | null {
  const f = galleryFrame(url)
  return f && localOnly(f.id, f.preset) ? localOnlyNote(f.id, f.preset) : null
}

/**
 * Where a screenshot of `url` is kept: a practice answer's frame under
 * `local-only/` (gitignored: rendered from the local checkout, never
 * committed), everything else with the committed baselines.
 */
export function baselineName(url: string, name: string): string {
  const f = galleryFrame(url)
  return f && showsAnswer(f.id, f.preset) ? `local-only/${name}` : name
}
