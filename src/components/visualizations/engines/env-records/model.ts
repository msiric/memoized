/**
 * Environment-records diagrams (spec §2.2, §8.2; R4 shared visual 2).
 *
 * A diagram is pure data: records with their bindings and real outer links,
 * function objects with their [[Environment]] link, and module bindings that
 * reference functions. There are no coordinates anywhere: `layout.ts`
 * derives tiers, columns, routes and label positions from these links, and
 * the truth test derives every value the picture claims from a real run.
 */

/** A label with fallbacks, longest first. `\n` splits a header into lines. */
export type Label = readonly [string, ...string[]]

export type EnvValue =
  /** A primitive or a summary such as `Array(3)`. */
  | { text: string }
  /** A reference: a 6 px dot with an arrow to another node in the section. */
  | { ref: string }

export type EnvBinding = {
  name: string
  value: EnvValue
  /** Declared but not initialized yet (TDZ): drawn hatched as ‹uninitialized›. */
  uninitialized?: boolean
}

export type EnvRecord = {
  kind: 'record'
  id: string
  /** Header naming the record: `buildFunctions() call`, `iteration i=1`, `module`. */
  title: Label
  bindings: EnvBinding[]
  /** The record's real outer environment: a node id in this section, or null when it lies outside the picture. */
  outer: string | null
  /** Draw the outer link. Off when the parent is shown only to anchor references. */
  drawOuter?: boolean
  /** Created but never read by any saved function: drawn hatched with a dashed outline. */
  unused?: boolean
}

export type EnvFunction = {
  kind: 'function'
  id: string
  /** Header after the ƒ glyph. */
  title: Label
  /** The record this function was created in: its [[Environment]]. */
  env: string
  /** What calling it printed in the verified run, shown as `› value`. */
  logs?: string
}

/** An empty place under a record, saying why nothing is there (`no ƒ`). */
export type EnvSlot = { kind: 'slot'; id: string; under: string; title: Label }

export type EnvNode = EnvRecord | EnvFunction | EnvSlot

/** Edge ids: `env:<function>`, `outer:<record>`, `ref:<record>.<binding>`. */
export type EdgeId =
  | `env:${string}`
  | `outer:${string}`
  | `ref:${string}.${string}`

export type EnvSection = {
  id: string
  /** One line of code naming the case, shown above the diagram (`for (var i = 0; …)`). */
  heading: string
  /** The part of the heading that differs between sections (`var`, `let`), set in full ink. */
  emphasis?: string
  nodes: EnvNode[]
  /** The single highlight of the section (§1 P4): the edges that teach it. */
  highlight: EdgeId[]
  /** A muted note under the diagram, for what a mark alone cannot say. */
  note?: string
}

export type EnvDiagram = {
  sections: EnvSection[]
  /**
   * `bottom`: sections side by side share the function row, so the two
   * halves of a contrast line up. `top`: each section keeps its natural height.
   */
  align: 'top' | 'bottom'
}

export const isRecord = (n: EnvNode): n is EnvRecord => n.kind === 'record'
export const isFunction = (n: EnvNode): n is EnvFunction =>
  n.kind === 'function'
export const isSlot = (n: EnvNode): n is EnvSlot => n.kind === 'slot'

export function nodeById(section: EnvSection, id: string): EnvNode {
  const node = section.nodes.find((n) => n.id === id)
  if (!node) throw new Error(`${section.id}: unknown node "${id}"`)
  return node
}

/** The value a function reads for `name`: walk its environment chain (spec: lookup follows outer links). */
export function lookup(
  section: EnvSection,
  fnId: string,
  name: string,
): EnvValue | undefined {
  const fn = nodeById(section, fnId)
  if (!isFunction(fn)) throw new Error(`${fnId} is not a function`)
  let at: string | null = fn.env
  while (at) {
    const rec = nodeById(section, at)
    if (!isRecord(rec)) throw new Error(`${at} is not a record`)
    const b = rec.bindings.find((x) => x.name === name)
    if (b) return b.value
    at =
      rec.outer && section.nodes.some((n) => n.id === rec.outer)
        ? rec.outer
        : null
  }
  return undefined
}

/** The current text value of `name` in record `recordId`. */
export function bindingText(
  section: EnvSection,
  recordId: string,
  name: string,
): string {
  const rec = nodeById(section, recordId)
  if (!isRecord(rec)) throw new Error(`${recordId} is not a record`)
  const b = rec.bindings.find((x) => x.name === name)
  if (!b || !('text' in b.value))
    throw new Error(`${recordId}.${name} has no text value`)
  return b.value.text
}

/** The function a module binding refers to. */
export function referent(
  section: EnvSection,
  recordId: string,
  name: string,
): string {
  const rec = nodeById(section, recordId)
  if (!isRecord(rec)) throw new Error(`${recordId} is not a record`)
  const b = rec.bindings.find((x) => x.name === name)
  if (!b || !('ref' in b.value))
    throw new Error(`${recordId}.${name} is not a reference`)
  return b.value.ref
}
