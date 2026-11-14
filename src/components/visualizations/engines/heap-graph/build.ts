import type { Claim } from '../../shell/static-types'
import {
  resolvePath,
  type HeapBinding,
  type HeapMark,
  type HeapObject,
  type HeapPanel,
  type HeapProgram,
  type HeapRecording,
  type HeapValue,
  type RecordedValue,
} from './model'

/**
 * Builds a heap panel from a recording: every binding, object, value and
 * identity drawn comes from the run; the preset adds only the words around
 * it (heading, emphasis) and which recorded change to mark. Objects are
 * named in discovery order (`Object A`, `Object B`, ...), the lesson's own
 * labels for identities (data-types: "Object A is a label for the shared
 * identity in this example, not an engine memory address").
 */

export type PanelSpec = {
  program: HeapProgram
  snapshot: string
  heading: string
  emphasis?: string
  /** The recorded change to mark: a row by path (`alias.count`), or the arrow of a rebound name. */
  changed?: { path: string } | { moved: string }
  /** The line that made that change (a line of the program). */
  changedBy?: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const letter = (i: number) => (i <= LETTERS.length ? LETTERS[i - 1] : `${i}`)
const safe = (s: string) => /^[A-Za-z_][\w-]*$/.test(s)

export function buildPanel(spec: PanelSpec, recording: Record<string, HeapRecording>): HeapPanel {
  const rec = recording[spec.program.id]
  if (!rec) throw new Error(`no recording for program ${spec.program.id}: run yarn viz:heap`)
  const snap = rec.snapshots[spec.snapshot]
  if (!snap) throw new Error(`${spec.program.id}: no recorded snapshot ${spec.snapshot}: run yarn viz:heap`)
  const objId = (n: number) => `o${letter(n)}`
  const value = (v: RecordedValue): HeapValue => ('ref' in v ? { ref: objId(v.ref) } : { text: v.text })
  const bindings: HeapBinding[] = snap.bindings.map(([name, v], i) => ({
    id: safe(name) ? `v-${name}` : `v-${i}`,
    name,
    value: value(v),
  }))
  const objects: HeapObject[] = snap.objects.map((o) => ({
    id: objId(o.id),
    title: [`${o.array ? 'Array' : 'Object'} ${letter(o.id)}`],
    rows: o.rows.map(([key, v]) => ({ key, value: value(v) })),
  }))
  const panel: HeapPanel = {
    id: spec.snapshot,
    heading: spec.heading,
    emphasis: spec.emphasis,
    bindings,
    objects,
    changedBy: spec.changedBy,
    results: snap.results.map(([expr, text]) => ({ expr, text })),
  }
  let changed: HeapMark | undefined
  if (spec.changed && 'path' in spec.changed) changed = { row: resolvePath(panel, spec.changed.path) }
  else if (spec.changed) {
    const name = spec.changed.moved
    const b = bindings.find((x) => x.name === name)
    if (!b || !('ref' in b.value)) throw new Error(`${panel.id}: ${name} is not a drawn reference`)
    changed = { binding: b.id }
  }
  return changed ? { ...panel, changed } : panel
}

/** Whitespace runs collapsed: a heading may join lines of the program (`...person.address, city: 'Newtown'`). */
export const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * Identity claims derived from an end-of-program panel (spec P6): for every
 * pair of drawn names, whether they identify one object, re-checked by
 * running the program with `===` probes appended.
 */
export function identityClaims(spec: PanelSpec, panel: HeapPanel): Claim[] {
  if (spec.program.snapshots.find((s) => s.id === spec.snapshot)?.after !== 'end') return []
  const refs = panel.bindings.filter((b) => 'ref' in b.value) as (HeapBinding & { value: { ref: string } })[]
  const out: Claim[] = []
  for (let i = 0; i < refs.length; i++)
    for (let j = i + 1; j < refs.length; j++) {
      const same = refs[i].value.ref === refs[j].value.ref
      out.push({
        says: `${refs[i].name} and ${refs[j].name} identify ${same ? 'one object' : 'different objects'}`,
        program: spec.program.id,
        probe: `console.log(${refs[i].name} === ${refs[j].name})`,
        expect: [String(same)],
      })
    }
  // Nested objects reached through two names are one object (`copy.stats === original.stats`).
  const paths = new Map<string, string[]>()
  for (const b of refs) {
    const owner = panel.objects.find((o) => o.id === b.value.ref)!
    for (const r of owner.rows)
      if ('ref' in r.value) paths.set(`${b.name}.${r.key}`, [r.value.ref])
  }
  const keys = [...paths.keys()]
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const same = paths.get(keys[i])![0] === paths.get(keys[j])![0]
      out.push({
        says: `${keys[i]} and ${keys[j]} identify ${same ? 'one object' : 'different objects'}`,
        program: spec.program.id,
        probe: `console.log(${keys[i]} === ${keys[j]})`,
        expect: [String(same)],
      })
    }
  return out
}
