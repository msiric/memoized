import { isFunction, isRecord, type EnvDiagram, type EnvFunction, type EnvSection } from './model'

/**
 * The closures figure's one designed moment (VIZ-H D21): hovering or
 * focusing a function object brings forward its `[[Environment]]` path, the
 * record it was created in and every record its lookups walk through (outer
 * links), plus, in the factory preset, each binding that names it (the
 * aliasing). Everything else dims to 40 %.
 *
 * No JavaScript: the server writes one small stylesheet per figure (these
 * rules), the generic dimming lives in `src/styles/tailwind.css` (`.vz-s`).
 * Only opacity changes, so nothing moves and print is unaffected.
 */

/** The selectors a function's path brings forward, in a section. */
export function pathSelectors(section: EnvSection, fn: EnvFunction): string[] {
  const out = [`[data-node=${fn.id}]`, `[data-edge="env:${fn.id}"]`, `[data-o=${fn.id}]`]
  const seen = new Set<string>()
  let at: string | null = fn.env
  while (at && !seen.has(at)) {
    seen.add(at)
    const rec = section.nodes.find((n) => n.id === at)
    if (!rec || !isRecord(rec)) break
    out.push(`[data-node=${rec.id}]`)
    const outer: string | null = rec.outer && section.nodes.some((n) => n.id === rec.outer) ? rec.outer : null
    if (!outer || rec.drawOuter === false) break
    out.push(`[data-edge="outer:${rec.id}"]`)
    at = outer
  }
  // Aliasing: every binding that refers to this function, and its record.
  for (const n of section.nodes)
    if (isRecord(n))
      for (const b of n.bindings)
        if ('ref' in b.value && b.value.ref === fn.id)
          out.push(`[data-edge="ref:${n.id}.${b.name}"]`, `[data-node=${n.id}]`)
  return [...new Set(out)]
}

/** Ids are CSS identifiers, so the selectors need no quotes (the markup budget). */
const safe = (id: string) => /^[A-Za-z_][\w-]*$/.test(id)

/** One rule per function: the hovered or focused function's path stays at full strength. */
export function pathCss(data: EnvDiagram): string {
  return data.sections
    .flatMap((section) =>
      section.nodes.filter(isFunction).map((fn) => {
        if (!safe(section.id) || !safe(fn.id)) throw new Error(`env-records: unsafe id ${section.id}/${fn.id}`)
        return `[data-viz-section=${section.id}] .vz-s:has([data-node=${fn.id}]:is(:hover,:focus)) :is(${pathSelectors(section, fn).join(',')}){opacity:1}`
      }),
    )
    .join('')
}

/** What a focused function announces: its name, its record, and the names that refer to it. */
export function pathLabel(section: EnvSection, fn: EnvFunction): string {
  const rec = section.nodes.find((n) => n.id === fn.env)
  const recName = rec && isRecord(rec) ? rec.title[0].replace(/\n/g, ' ') : fn.env
  const names = section.nodes.flatMap((n) =>
    isRecord(n) ? n.bindings.filter((b) => 'ref' in b.value && b.value.ref === fn.id).map((b) => b.name) : [],
  )
  const named = names.length ? `, named ${names.join(' and ')}` : ''
  // The short title (`#0`), as the narrow figure draws it: the label repeats in every width copy.
  return `ƒ ${fn.title[fn.title.length - 1]}${named}, created in ${recName}`
}
