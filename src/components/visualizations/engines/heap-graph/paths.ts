import { LIT } from '../env-records/paths'
import { isRef, objectById, reachable, type HeapDiagram, type HeapPanel } from './model'

/**
 * The heap graph's one interaction, the closures figure's trace on names
 * (VIZ-H D21, H3 R11, `engines/env-records/paths.ts`): hovering a name,
 * focusing it from the keyboard or tapping it traces, in lime (`now`, here
 * "traced"), the name, its arrow, the object it identifies and, through
 * that object's properties, every object it reaches with those arrows. Two
 * names for one object light the same box in turn, which is the lesson.
 * Nothing dims (G ruling 1); the panel's "changed" mark keeps its own
 * neutral colours. No JavaScript: one small stylesheet per figure; the rest
 * and lit colours live in `src/styles/tailwind.css` (`.vz-s`).
 */

const q = (v: string) => {
  if (/["\\\n]/.test(v)) throw new Error(`heap-graph: unsafe id ${v}`)
  return /^[A-Za-z_][\w-]*$/.test(v) ? v : `"${v}"`
}
const node = (id: string) => `[data-node=${q(id)}]`
const edge = (id: string) => `[data-edge="${id}"]`

/** What a name's trace lights: the name, its arrow, each object it reaches and the arrows between them. */
export function pathParts(panel: HeapPanel, bindingId: string): string[] {
  const out = [node(bindingId), edge(`bind:${bindingId}`)]
  for (const id of reachable(panel, bindingId)) {
    out.push(node(id))
    for (const r of objectById(panel, id).rows) if (isRef(r.value)) out.push(edge(`ref:${id}.${r.key}`))
  }
  return out
}

/** The names that can be traced: those whose value identifies an object. */
export const traceable = (panel: HeapPanel) => panel.bindings.filter((b) => isRef(b.value))

const safe = (id: string) => /^[A-Za-z_][\w-]*$/.test(id)

/** Per name, scoped to its panel: hover wins; keyboard focus shows while nothing is hovered; a tap where nothing can hover. */
export function pathCss(data: HeapDiagram): string {
  const main: string[] = []
  const touch: string[] = []
  for (const panel of data.panels)
    for (const b of traceable(panel)) {
      if (!safe(panel.id) || !safe(b.id)) throw new Error(`heap-graph: unsafe id ${panel.id}/${b.id}`)
      const lit = pathParts(panel, b.id)
      const s = `[data-viz-section=${panel.id}] .vz-s`
      const f = `[data-node=${b.id}]`
      const rules = (at: string) => `${at} :is(${lit.join(',')})${LIT}`
      main.push(rules(`${s}:is(:has(${f}:hover),:not(:has([tabindex]:hover)):has(${f}:focus-visible))`))
      touch.push(rules(`${s}:has(${f}:focus)`))
    }
  // Screen only (paper never shows a trace); hover rules only where the reader can hover (R2M-16).
  return `@media screen and (hover:hover){${main.join('')}}@media screen and (hover:none){${touch.join('')}}`
}

/** What a focused name announces: the object it identifies, and what it reaches through it. */
export function pathLabel(panel: HeapPanel, bindingId: string): string {
  const b = panel.bindings.find((x) => x.id === bindingId)!
  const [first, ...rest] = reachable(panel, bindingId).map((id) => objectById(panel, id).title[0])
  if (!first) return b.name
  const through = rest.length ? `, and through it ${rest.join(' and ')}` : ''
  return `${b.name} identifies ${first}${through}`
}
