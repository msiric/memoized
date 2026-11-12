import { eventLoopIntrospection } from '../engines/event-loop/model'
import type { EventLoopState } from '../engines/event-loop/model'
import { layoutDiagram } from '../engines/env-records/layout'
import type { EnvDiagram } from '../engines/env-records/model'
import type { StaticPreset } from '../shell/static-types'
import type { StepThroughDescriptor } from '../shell/types'
import { LIMITS, validateStepLog } from '../step-log/validate'

/**
 * What the existing authoring checks would say about a stress fixture:
 * `validateStepLog` (run by each engine's truth test) plus the title, label
 * and caption limits `registry.test.ts` asserts for registered visuals, plus
 * whether the env-records layout throws. Reported on the stress page so the
 * audit can separate "rejected before rendering" from "rendered broken".
 */

export function stepThroughLint(d: StepThroughDescriptor<EventLoopState>): string[] {
  const out: string[] = []
  if (d.title.length > 40) out.push(`registry.test: title ${d.title.length} > 40`)
  for (const p of d.presets) {
    if (p.label.length > LIMITS.presetLabel)
      out.push(`registry.test: preset label "${p.label}" ${p.label.length} > ${LIMITS.presetLabel}`)
    out.push(...validateStepLog(p.log, eventLoopIntrospection).map((e) => `validateStepLog: ${e}`))
  }
  return out
}

export function staticLint(p: StaticPreset<EnvDiagram>): string[] {
  const out: string[] = []
  if (p.label.length > LIMITS.presetLabel) out.push(`registry.test: label ${p.label.length} > ${LIMITS.presetLabel}`)
  if (p.title.length > 40) out.push(`registry.test: title ${p.title.length} > 40`)
  if (p.caption.length > LIMITS.why) out.push(`registry.test: caption ${p.caption.length} > ${LIMITS.why}`)
  for (const v of ['narrow', 'wide'] as const) {
    try {
      layoutDiagram(p.data, v)
    } catch (e) {
      out.push(`layout (${v}) throws: ${(e as Error).message}`)
    }
  }
  return out
}
