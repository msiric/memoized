import { monoWidth } from '../../substrates/text-metrics'
import { layoutDiagram, sectionWidths } from './layout'
import type { EnvDiagram } from './model'

/**
 * Environment-records authoring lint (VIZ-H A3, A6, A9, A10): the layout
 * must accept the diagram at both variants (it throws with the box that
 * does not fit; rendering never throws, it falls back to a note), and each
 * section heading must fit its column, measured with the width model.
 */
export function lintEnvDiagram(d: EnvDiagram): string[] {
  const errors: string[] = []
  for (const v of ['narrow', 'wide'] as const) {
    try {
      layoutDiagram(d, v)
    } catch (e) {
      errors.push(`layout (${v}): ${(e as Error).message}; shorten a label or add a shorter fallback`)
    }
    const { min } = sectionWidths(d, v)
    for (const s of d.sections) {
      const w = Math.ceil(monoWidth(s.heading, 13))
      if (w > min) errors.push(`section ${s.id} heading (${v}): ${w}px > ${min}px; it would truncate`)
    }
  }
  return errors
}
