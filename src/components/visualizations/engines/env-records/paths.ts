import { isFunction, isRecord, resolve, type EnvDiagram, type EnvFunction, type EnvSection } from './model'

/**
 * The closures figure's one designed moment (VIZ-H D21, H3 R11): hovering a
 * function object, focusing it from the keyboard, or tapping it traces what
 * it remembers. In lime (`now`, here "traced", R1): the function, its
 * `[[Environment]]` link, the record that link points to, the binding row
 * its body reads (`i 3`, `count 2`) and, in the factory preset, every name
 * that refers to it with its arrow. The rest of its lookup chain (outer
 * links and the records they reach) and everything else keep their rest
 * colours: emphasis only, nothing dims (G ruling 1, WCAG 1.4.3 and 1.4.11).
 *
 * No JavaScript: the server writes one small stylesheet per figure (these
 * rules); the rest colours and the lit colours live in
 * `src/styles/tailwind.css` (`.vz-s`). Only one path is lit at a time:
 * - a hovered function always wins;
 * - keyboard focus (`:focus-visible`, never a mouse click's `:focus`) lights
 *   its path while no function is hovered;
 * - on devices that cannot hover, a tap focuses the function, and `:focus`
 *   lights it until the reader taps elsewhere.
 */

const q = (v: string) => {
  if (/["\\\n]/.test(v)) throw new Error(`env-records: unsafe name ${v}`)
  return /^[A-Za-z_][\w-]*$/.test(v) ? v : `"${v}"`
}
const node = (id: string) => `[data-node=${q(id)}]`
const edge = (id: string) => `[data-edge="${id}"]`
/** A binding row's tint, inside its record. */
const row = (record: string, name: string) => `${node(record)} [data-b=${q(name)}]`

/** The row a function reads: the record its lookup lands in, and the binding. */
export function readRow(section: EnvSection, fn: EnvFunction): { record: string; name: string } | null {
  if (!fn.reads) return null
  const hit = resolve(section, fn.id, fn.reads)
  return hit ? { record: hit.record.id, name: hit.binding.name } : null
}

/** Every binding that names a function (aliasing): `module.counter1` and `module.sameCounter` for ƒ A. */
export function aliasesOf(section: EnvSection, fnId: string): { record: string; name: string }[] {
  return section.nodes.flatMap((n) =>
    isRecord(n)
      ? n.bindings.filter((b) => 'ref' in b.value && b.value.ref === fnId).map((b) => ({ record: n.id, name: b.name }))
      : [],
  )
}

/** The rows that can light (read rows and alias rows), per record: only these carry a tint. */
export function litRows(section: EnvSection): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const add = (r: { record: string; name: string } | null) => {
    if (!r) return
    out.set(r.record, (out.get(r.record) ?? new Set()).add(r.name))
  }
  for (const fn of section.nodes.filter(isFunction)) {
    add(readRow(section, fn))
    aliasesOf(section, fn.id).forEach(add)
  }
  return out
}

export type PathParts = {
  /** Drawn in lime at full strength: what the function remembers and reads, and its names. */
  lit: string[]
  /** At full strength in rest colours: the records that hold its names (`module`), so their rows can light. */
  hold: string[]
}

/**
 * The traced path (R11). Lit: the function, its `[[Environment]]` link, the
 * record it points to, the row its body reads (and, when that row lies
 * further out, the outer links and records the lookup walks to reach it),
 * its output, and every name that refers to it with its arrow and row.
 * Everything else, the rest of the outer chain included, keeps its rest colours.
 */
export function pathParts(section: EnvSection, fn: EnvFunction): PathParts {
  const lit = [node(fn.id), edge(`env:${fn.id}`), `[data-o=${q(fn.id)}]`, node(fn.env)]
  const read = readRow(section, fn)
  if (read) {
    let at: string | null = fn.env
    const seen = new Set<string>()
    while (at && at !== read.record && !seen.has(at)) {
      seen.add(at)
      const rec = section.nodes.find((n) => n.id === at)
      if (!rec || !isRecord(rec) || !rec.outer) break
      lit.push(edge(`outer:${rec.id}`), node(rec.outer))
      at = rec.outer
    }
    lit.push(row(read.record, read.name))
  }
  const hold: string[] = []
  for (const a of aliasesOf(section, fn.id)) {
    lit.push(edge(`ref:${a.record}.${a.name}`), row(a.record, a.name))
    if (!lit.includes(node(a.record))) hold.push(node(a.record))
  }
  return { lit: [...new Set(lit)], hold: [...new Set(hold)] }
}

/** The nodes, links and outputs a function's path brings to full strength (the harness compares them). */
export function pathSelectors(section: EnvSection, fn: EnvFunction): string[] {
  const { lit, hold } = pathParts(section, fn)
  return [...lit, ...hold].filter((x) => !x.includes(' '))
}

/** Ids are CSS identifiers, so the selectors need no quotes (the markup budget). */
const safe = (id: string) => /^[A-Za-z_][\w-]*$/.test(id)

/** Lit: the `now` colour, the glyph tint and the 2.5 px connector (tailwind.css `.vz-s`). */
const LIT = '{color:var(--vz-k);--vz-t:var(--vz-kt);--vz-sw:2.5px}'

/**
 * Per function, scoped to its section: the lit rule, plus a hold rule when
 * other records carry its names. Hover wins; keyboard focus shows while
 * nothing is hovered; on a device that cannot hover, the tapped (focused)
 * function.
 */
export function pathCss(data: EnvDiagram): string {
  const main: string[] = []
  const touch: string[] = []
  for (const section of data.sections)
    for (const fn of section.nodes.filter(isFunction)) {
      if (!safe(section.id) || !safe(fn.id)) throw new Error(`env-records: unsafe id ${section.id}/${fn.id}`)
      // The held outer chain needs no rule: nothing dims, so it stays at rest.
      const { lit } = pathParts(section, fn)
      const s = `[data-viz-section=${section.id}] .vz-s`
      const f = `[data-node=${fn.id}]`
      const rules = (at: string) => `${at} :is(${lit.join(',')})${LIT}`
      main.push(rules(`${s}:is(:has(${f}:hover),:not(:has([tabindex]:hover)):has(${f}:focus-visible))`))
      touch.push(rules(`${s}:has(${f}:focus)`))
    }
  return `${main.join('')}@media (hover:none){${touch.join('')}}`
}

/** What a focused function announces: its name, its record, the names that refer to it, and what it reads. */
export function pathLabel(section: EnvSection, fn: EnvFunction): string {
  const rec = section.nodes.find((n) => n.id === fn.env)
  const recName = rec && isRecord(rec) ? rec.title[0].replace(/\n/g, ' ') : fn.env
  const names = aliasesOf(section, fn.id).map((a) => a.name)
  const named = names.length ? `, named ${names.join(' and ')}` : ''
  const hit = fn.reads ? resolve(section, fn.id, fn.reads) : undefined
  const reads =
    hit && 'text' in hit.binding.value ? `; it reads ${hit.binding.name} = ${hit.binding.value.text}` : ''
  // The short title (`#0`), as the narrow figure draws it: the label repeats in every width copy.
  return `ƒ ${fn.title[fn.title.length - 1]}${named}, created in ${recName}${reads}`
}
