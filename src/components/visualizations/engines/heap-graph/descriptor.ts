import type { AnyProgram, StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutDiagramSafe } from './layout'
import { isRef, objectById, type HeapDiagram, type HeapPanel, type HeapValue } from './model'
import { gcReachabilityCycleAndWeakEdge, retainerPaths } from './presets/memory'
import { spreadVsNestedVsDeep } from './presets/objects'
import { identityAliasRebindSpread } from './presets/data-types'

/**
 * The heap-graph visual without its renderer: pure data and functions, so
 * the registry, the manifest route and the tests use it without React. One
 * id for the shared system, one preset per lesson (as environment-records).
 */

const title = (p: HeapPanel, id: string) => objectById(p, id).title[0]
/** A line of code inside a sentence: its own closing semicolon would double the full stop. */
const code = (s: string) => s.replace(/;\s*$/, '')
const says = (p: HeapPanel, v: HeapValue) => (isRef(v) ? `${v.weak ? '⇢ (weak) ' : '→ '}${title(p, v.ref)}` : `= ${v.text}`)

function describePanel(p: HeapPanel): string[] {
  const out: string[] = []
  if (p.roots) out.push(`Roots: ${p.bindings.map((b) => b.name).join(', ')}.`)
  for (const b of p.bindings)
    out.push(isRef(b.value) ? `${b.name} identifies ${title(p, b.value.ref)}.` : `${b.name} holds ${b.value.text}.`)
  for (const o of p.objects) {
    const rows = o.rows.map((r) => `${r.key} ${says(p, r.value)}`).join(', ')
    const extra = [o.note, o.badge && `reference count ${o.badge.replace(/^rc /, '')}`].filter(Boolean).join('; ')
    out.push(`${o.title[0]}: ${rows || (o.note ? '' : 'no own properties')}${rows && extra ? '; ' : ''}${extra}${o.gone ? ' (collected by the next GC)' : ''}.`)
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
      `Marked: ${title(p, m.row.object)}.${m.row.key} ${says(p, v)}${p.changedBy ? `, written by ${code(p.changedBy)}` : ''}.`,
    )
  } else if (m && 'edge' in m) {
    const [kind, rest] = m.edge.split(':')
    const owner = kind === 'bind' ? p.bindings.find((b) => b.id === rest)?.name : (() => {
      const [oid, key] = [rest.slice(0, rest.indexOf('.')), rest.slice(rest.indexOf('.') + 1)]
      return `${title(p, oid)}.${key}`
    })()
    out.push(`Marked: the reference from ${owner}, the one that still keeps it alive.`)
  } else if (m) {
    const b = p.bindings.find((x) => x.id === m.binding)!
    out.push(
      `Marked: the arrow of ${b.name}, now to ${isRef(b.value) ? title(p, b.value.ref) : b.value.text}${p.changedBy ? `, moved by ${code(p.changedBy)}` : ''}.`,
    )
  }
  const gone = p.objects.filter((o) => o.gone)
  if (gone.length) out.push(`Collectible: ${gone.map((o) => o.title[0]).join(', ')}: no root reaches ${gone.length > 1 ? 'them' : 'it'} through strong references.`)
  for (const r of p.results ?? []) out.push(`${r.expr} logs ${r.text}.`)
  return out
}

export function describeHeapDiagram(d: HeapDiagram): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model:
      d.model ??
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

export const heapGraphDescriptor: StaticDescriptor<HeapDiagram, AnyProgram> = {
  id: 'heap-graph',
  form: 'static',
  title: 'Heap graph',
  engine: heapGraphEngineCore,
  presets: [identityAliasRebindSpread, spreadVsNestedVsDeep, gcReachabilityCycleAndWeakEdge, retainerPaths],
  defaultPreset: 'identity-alias-rebind-spread',
  since: '2026-11',
}
