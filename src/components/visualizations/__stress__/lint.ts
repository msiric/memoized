import { eventLoopIntrospection } from '../engines/event-loop/model'
import type { EventLoopState } from '../engines/event-loop/model'
import type { EnvDiagram } from '../engines/env-records/model'
import type { StaticPreset } from '../shell/static-types'
import type { StepThroughDescriptor } from '../shell/types'
import { lintEnvDiagram } from '../engines/env-records/lint'
import { lintHeapDiagram } from '../engines/heap-graph/lint'
import type { HeapDiagram } from '../engines/heap-graph/model'
import { lintEventLoopLogs } from '../engines/event-loop/lint'
import { LIMITS, validateDescriptor, validateStepLog } from '../step-log/validate'

/**
 * What the existing authoring checks would say about a stress fixture:
 * `validateStepLog` (run by each engine's truth test) plus the title, label
 * and caption limits `registry.test.ts` asserts for registered visuals, plus
 * whether the env-records or heap-graph layout throws. Reported on the stress page so the
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
  // VIZ-H WS3: the width lints (title, switcher, chips, queues, outputs).
  out.push(...validateDescriptor(d).map((e) => `validateDescriptor: ${e}`))
  out.push(...lintEventLoopLogs(d.presets.map((p) => p.log)).map((e) => `lintEventLoop: ${e}`))
  return out
}

export function staticLint(p: StaticPreset<EnvDiagram>): string[] {
  return [...presetLint(p), ...lintEnvDiagram(p.data).map((e) => `lintEnvDiagram: ${e}`)]
}

/** The same checks for a heap-graph fixture, with the heap-graph layout lint. */
export function heapStaticLint(p: StaticPreset<HeapDiagram>): string[] {
  return [...presetLint(p), ...lintHeapDiagram(p.data).map((e) => `lintHeapDiagram: ${e}`)]
}

function presetLint<D>(p: StaticPreset<D>): string[] {
  const out: string[] = []
  if (p.label.length > LIMITS.presetLabel) out.push(`registry.test: label ${p.label.length} > ${LIMITS.presetLabel}`)
  if (p.title.length > 40) out.push(`registry.test: title ${p.title.length} > 40`)
  if (p.caption.length > LIMITS.why) out.push(`registry.test: caption ${p.caption.length} > ${LIMITS.why}`)
  if (p.title.length > 40 || validateDescriptor({ id: p.id, title: p.title, presets: [] }).length)
    out.push(...validateDescriptor({ id: p.id, title: p.title, presets: [] }).map((e) => `validateDescriptor: ${e}`))
  return out
}
