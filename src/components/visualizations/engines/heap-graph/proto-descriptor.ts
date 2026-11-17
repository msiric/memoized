import type { HashedProgram, StaticDescriptor, StaticEngineCore, StaticTextAlternative } from '../../shell/static-types'
import { layoutProto } from './proto-layout'
import { besideOf, isCtor, spineOf, type ProtoDiagram, type ProtoObject, type ProtoPanel } from './proto-model'
import { extendsTwoChains } from './presets/classes'
import { constructorFix, lookupAndShadowing } from './presets/prototypes'

/**
 * The prototype object graph without its renderer (R4 shared visual 3,
 * `prototype-object-graph`, built on the heap graph): React-free, for the
 * registry, the manifest and the tests.
 */

function describeObject(p: ProtoPanel, o: ProtoObject): string {
  const up = p.columns === 2 && o.fn ? `; [[Prototype]] → ${o.proto ?? 'null'}` : ''
  if (isCtor(o)) return `${o.title} (a function): prototype → ${besideOf(p, o)} (solid arrow)${up}.`
  if (o.fn) return `${o.title} (a function): ${o.hidden} own properties, not listed${up}.`
  const rows = o.rows.map((r) => ('ref' in r.value ? `${r.key} → ${r.value.ref}${r.key === 'constructor' ? ' (dashed arrow)' : ''}` : 'fn' in r.value ? `${r.key} = a function` : `${r.key} = ${r.value.text}`))
  if (o.hidden) rows.push(o.rows.length ? `and ${o.hidden} more own properties` : `${o.hidden} own properties, not listed`)
  return `${o.title}: ${rows.length ? rows.join(', ') : 'no own properties'}.`
}

function describePanel(p: ProtoPanel): string[] {
  const spine = spineOf(p)
  const lines = [`Chain of [[Prototype]] links: ${[...spine.map((o) => o.title), 'null'].join(' → ')}.`]
  if (p.columns === 2)
    for (const f of p.objects.filter(isCtor)) {
      const chain: string[] = [f.title]
      let at: ProtoObject | undefined = f
      while (at && typeof at.proto === 'string') {
        chain.push(at.proto)
        at = p.objects.find((x) => x.id === (at as ProtoObject).proto)
      }
      lines.push(`The constructor ${f.title}'s own chain: ${chain.join(' → ')}.`)
    }
  for (const o of spine) lines.push(describeObject(p, o))
  for (const o of p.objects.filter((x) => x.fn)) lines.push(describeObject(p, o))
  const l = p.lookup
  if (l?.start)
    lines.push(`Marked lookup of super.${l.key} in a method of ${l.start}: it starts at ${l.visited[0]}, the [[Prototype]] of ${l.start}, and ${l.found ? `finds ${l.key} on ${l.found}` : 'finds nothing'}.`)
  else if (l) {
    const misses = l.visited.filter((id) => id !== l.found)
    lines.push(
      `Marked lookup of ${l.from}.${l.key}: ${misses.length ? `${misses.join(', then ')} ${misses.length > 1 ? 'have' : 'has'} no own ${l.key}; ` : ''}${l.found ? `found on ${l.found}` : 'not found before null'}${l.found === l.from ? ', the object itself' : ''}.`,
    )
  }
  for (const r of p.results) lines.push(`${r.expr} logs ${r.text}.`)
  if (p.note) lines.push(`${p.note[0].toUpperCase()}${p.note.slice(1)}.`)
  return lines
}

export function describeProto(d: ProtoDiagram): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.panels.map((p) => ({ heading: p.heading, lines: describePanel(p) })),
    model:
      'Every object, own property, [[Prototype]] link and lookup path was recorded from a real run of the lesson code under the inspector; a function’s own length and name are not drawn.',
  }
}

export const protoEngineCore: StaticEngineCore<ProtoDiagram> = {
  id: 'prototype-object-graph',
  stageHeight: (d) => layoutProto(d).height,
  describe: describeProto,
}

export const protoDescriptor: StaticDescriptor<ProtoDiagram, HashedProgram> = {
  id: 'prototype-object-graph',
  form: 'static',
  title: 'Prototype object graph',
  engine: protoEngineCore,
  presets: [lookupAndShadowing, constructorFix, extendsTwoChains],
  defaultPreset: 'lookup-and-shadowing',
  since: '2026-11',
}
