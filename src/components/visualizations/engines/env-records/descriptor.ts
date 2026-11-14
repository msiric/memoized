import type {
  StaticDescriptor,
  StaticEngineCore,
  StaticTextAlternative,
} from '../../shell/static-types'
import { layoutDiagramSafe } from './layout'
import { aliasesOf } from './paths'
import {
  isFunction,
  isRecord,
  isSlot,
  nodeById,
  resolve,
  type EnvDiagram,
  type EnvNode,
  type EnvSection,
} from './model'
import { factoryCallsVsAliases, varVsLetLoop } from './presets/closures'

/**
 * The environment-records visual without its renderer: pure data and
 * functions, so the registry, the manifest route and the tests use it
 * without React.
 */

const full = (n: EnvNode) => n.title[0].replace(/\n/g, ' ')
const quoted = (s: EnvSection, id: string) => `“${full(nodeById(s, id))}”`

function describeSection(s: EnvSection): string[] {
  const out: string[] = []
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
    model:
      'Records and links model how names are looked up (ECMA-262); they are not a memory layout. Every value shown matches a real run.',
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
  presets: [varVsLetLoop, factoryCallsVsAliases],
  defaultPreset: 'var-vs-let-loop',
  since: '2026-11',
}
