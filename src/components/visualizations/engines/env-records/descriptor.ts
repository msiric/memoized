import type {
  StaticDescriptor,
  StaticEngineCore,
  StaticTextAlternative,
} from '../../shell/static-types'
import { layoutDiagramSafe } from './layout'
import { aliasesOf } from './paths'
import {
  isFrame,
  isFunction,
  isRecord,
  isSlot,
  nodeById,
  resolve,
  type EnvDiagram,
  type EnvNode,
  type EnvFrame,
  type EnvSection,
} from './model'
import { factoryCallsVsAliases, varVsLetLoop } from './presets/closures'
import { callerIsNotLexicalParent, tdzStopsLookup } from './presets/scope-chain'

/**
 * The environment-records visual without its renderer: pure data and
 * functions, so the registry, the manifest route and the tests use it
 * without React.
 */

const full = (n: EnvNode) => n.title[0].replace(/\n/g, ' ')
const quoted = (s: EnvSection, id: string) => `“${full(nodeById(s, id))}”`

/** The records a lookup from `f` visits, in order, up to the first match (or the end of the chain). */
export function lookupChain(s: EnvSection, f: EnvFrame, stop = true): string[] {
  const chain: string[] = []
  let at: string | null = f.env
  while (at && !chain.includes(at)) {
    const rec = s.nodes.find((n) => n.id === at)
    if (!rec || !isRecord(rec)) break
    chain.push(at)
    if (stop && f.reads && rec.bindings.some((b) => b.name === f.reads)) break
    at = rec.outer
  }
  return chain
}

function describeStack(s: EnvSection): string[] {
  const frames = s.nodes.filter(isFrame)
  if (!frames.length) return []
  const out = [`Call stack, top first: ${frames.map(full).join(', ')}.`]
  for (const f of frames) {
    if (!f.reads) continue
    const chain = lookupChain(s, f)
    const hit = resolve(s, f.id, f.reads)
    const path = chain.map((id) => quoted(s, id)).join(', then ')
    const found = !hit
      ? `${f.reads} is not found`
      : hit.binding.uninitialized
        ? `the first ${f.reads} it meets is in ${quoted(s, hit.record.id)} and is uninitialized, so the search stops there and the read throws ${f.throws ?? 'an error'}`
        : 'text' in hit.binding.value
          ? `it stops at the first ${f.reads}, ${hit.binding.value.text} in ${quoted(s, hit.record.id)}${f.logs !== undefined ? `, and logs ${f.logs}` : ''}`
          : ''
    out.push(`${full(f)} reads ${f.reads}: the lookup visits ${path}; ${found}.`)
    // The calls below it are running, but their records are not on its chain at all.
    const outerChain = lookupChain(s, f, false)
    for (const g of frames)
      if (g !== f && !outerChain.includes(g.env))
        out.push(`${full(g)} is on the call stack, but its record ${quoted(s, g.env)} is not on this lookup's chain.`)
  }
  return out
}

function describeSection(s: EnvSection): string[] {
  const out: string[] = describeStack(s)
  for (const n of s.nodes) {
    if (isRecord(n)) {
      const values = n.bindings
        .map((b) =>
          b.uninitialized
            ? `${b.name} (uninitialized)`
            : 'text' in b.value
              ? `${b.name} = ${b.value.text}`
              : `${b.name} → ƒ ${full(nodeById(s, b.value.ref))}`,
        )
        .join(', ')
      let line = `Record ${quoted(s, n.id)}${values ? `: ${values}` : ' (no bindings shown)'}.`
      if (
        n.outer &&
        n.drawOuter !== false &&
        s.nodes.some((x) => x.id === n.outer)
      )
        line += ` Its outer link points to ${quoted(s, n.outer)}.`
      if (n.unused) line += ' Hatched: no saved function links to it.'
      out.push(line)
    } else if (isFunction(n)) {
      const logs = n.logs === undefined ? '' : `; calling it logs ${n.logs}`
      const hit = n.reads ? resolve(s, n.id, n.reads) : undefined
      const reads =
        hit && 'text' in hit.binding.value
          ? `; it reads ${hit.binding.name} = ${hit.binding.value.text}${hit.record.id === n.env ? '' : ` in ${quoted(s, hit.record.id)}`}`
          : ''
      out.push(
        // The drawing labels this link `env` at every width (layout `LABELS`); the text spells it out.
        `Function ƒ ${full(n)}: its [[Environment]] link (drawn as env) points to ${quoted(s, n.env)}${reads}${logs}.`,
      )
    } else if (isSlot(n)) {
      out.push(`Under ${quoted(s, n.under)}: ${full(n)}.`)
    }
  }
  // Aliasing: two names for one function are one closure, not two.
  for (const fn of s.nodes.filter(isFunction)) {
    const names = aliasesOf(s, fn.id).map((a) => a.name)
    if (names.length > 1)
      out.push(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} name the same function, ƒ ${full(fn)}.`)
  }
  if (s.note) out.push(s.noteMark === 'hatch' ? `Hatched: ${s.note}` : s.note)
  return out
}

export function describeEnvDiagram(
  d: EnvDiagram,
): Omit<StaticTextAlternative, 'outputs'> {
  return {
    parts: d.sections.map((s) => ({
      heading: s.heading,
      lines: describeSection(s),
    })),
    model: d.sections.some((s) => s.nodes.some(isFrame))
      ? 'Records and links model how names are looked up (ECMA-262); they are not a memory layout. Records show only the bindings these reads need. Every value shown matches a real run, and an inspector pause confirms each call\'s scope chain.'
      : 'Records and links model how names are looked up (ECMA-262); they are not a memory layout. Every value shown matches a real run.',
  }
}

export const envRecordsEngineCore: StaticEngineCore<EnvDiagram> = {
  id: 'env-records',
  stageHeight: (d) => ({
    narrow: layoutDiagramSafe(d, 'narrow').height,
    wide: layoutDiagramSafe(d, 'wide').height,
  }),
  describe: describeEnvDiagram,
}

export const envRecordsDescriptor: StaticDescriptor<EnvDiagram> = {
  id: 'environment-records',
  form: 'static',
  title: 'Environment records',
  engine: envRecordsEngineCore,
  presets: [varVsLetLoop, factoryCallsVsAliases, callerIsNotLexicalParent, tdzStopsLookup],
  defaultPreset: 'var-vs-let-loop',
  since: '2026-11',
}
