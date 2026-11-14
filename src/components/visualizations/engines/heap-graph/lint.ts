import { layoutDiagram } from './layout'
import type { HeapDiagram } from './model'

/**
 * Heap-graph authoring lint (VIZ-H A3, A6, A9): the layout must accept the
 * diagram at both variants (it throws naming what does not fit; rendering
 * never throws, it falls back to a note), panel ids are unique and an
 * emphasis is part of its heading.
 */
export function lintHeapDiagram(d: HeapDiagram): string[] {
  const errors: string[] = []
  for (const v of ['narrow', 'wide'] as const) {
    try {
      layoutDiagram(d, v)
    } catch (e) {
      errors.push(`layout (${v}): ${(e as Error).message}; shorten a name or split the panel`)
    }
  }
  const ids = new Set<string>()
  for (const p of d.panels) {
    if (ids.has(p.id)) errors.push(`panel id ${p.id} is not unique`)
    ids.add(p.id)
    if (p.emphasis && !p.heading.includes(p.emphasis)) errors.push(`panel ${p.id}: emphasis "${p.emphasis}" is not in its heading`)
    if (p.changed && 'row' in p.changed && !p.objects.some((o) => o.id === (p.changed as { row: { object: string } }).row.object))
      errors.push(`panel ${p.id}: the mark names an object it does not draw`)
  }
  return errors
}
