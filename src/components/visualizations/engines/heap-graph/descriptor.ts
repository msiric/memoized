import type { StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutDiagramSafe } from './layout'
import { isRef, objectById, type HeapDiagram, type HeapPanel, type HeapValue } from './model'
import { spreadVsNestedVsDeep } from './presets/objects'
import { identityAliasRebindSpread } from './presets/data-types'

/**
 * The heap-graph visual without its renderer: pure data and functions, so
 * the registry, the manifest route and the tests use it without React. One
 * id for the shared system, one preset per lesson (as environment-records).
 */

const title = (p: HeapPanel, id: string) => objectById(p, id).title[0]
const says = (p: HeapPanel, v: HeapValue) => (isRef(v) ? `→ ${title(p, v.ref)}` : `= ${v.text}`)

function describePanel(p: HeapPanel): string[] {
  const out: string[] = []
  for (const b of p.bindings)
    out.push(isRef(b.value) ? `${b.name} identifies ${title(p, b.value.ref)}.` : `${b.name} holds ${b.value.text}.`)
  for (const o of p.objects) {
    const rows = o.rows.map((r) => `${r.key} ${says(p, r.value)}`).join(', ')
    out.push(`${o.title[0]}: ${rows || 'no own properties'}.`)
  }
  // Shared objects: two or more arrows into one box are one object, not copies.
  for (const o of p.objects) {
    const from = [
      ...p.bindings.filter((b) => isRef(b.value) && b.value.ref === o.id).map((b) => b.name),
      ...p.objects.flatMap((x) =>
        x.rows.filter((r) => isRef(r.value) && r.value.ref === o.id).map((r) => `${x.title[0]}.${r.key}`),
      ),
    ]
    if (from.length > 1)
      out.push(`${from.slice(0, -1).join(', ')} and ${from[from.length - 1]} identify one object, ${o.title[0]}.`)
  }
  const m = p.changed
  if (m && 'row' in m) {
    const v = objectById(p, m.row.object).rows.find((r) => r.key === m.row.key)!.value
    out.push(
      `Marked: ${title(p, m.row.object)}.${m.row.key} ${says(p, v)}${p.changedBy ? `, written by ${p.changedBy}` : ''}.`,
    )
  } else if (m) {
    const b = p.bindings.find((x) => x.id === m.binding)!
    out.push(
      `Marked: the arrow of ${b.name}, now to ${isRef(b.value) ? title(p, b.value.ref) : b.value.text}${p.changedBy ? `, moved by ${p.changedBy}` : ''}.`,
    )
  }
  for (const r of p.results ?? []) out.push(`${r.expr} logs ${r.text}.`)
  return out
}

export function describeHeapDiagram(d: HeapDiagram): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model:
      'Object A, Object B and so on label identities in each example; they are not memory addresses. Every name, object and value shown was recorded from a real run.',
  }
}

export const heapGraphEngineCore: StaticEngineCore<HeapDiagram> = {
  id: 'heap-graph',
  stageHeight: (d) => ({
    narrow: layoutDiagramSafe(d, 'narrow').height,
    wide: layoutDiagramSafe(d, 'wide').height,
  }),
  describe: describeHeapDiagram,
}

export const heapGraphDescriptor: StaticDescriptor<HeapDiagram> = {
  id: 'heap-graph',
  form: 'static',
  title: 'Heap graph',
  engine: heapGraphEngineCore,
  presets: [identityAliasRebindSpread, spreadVsNestedVsDeep],
  defaultPreset: 'identity-alias-rebind-spread',
  since: '2026-11',
}
