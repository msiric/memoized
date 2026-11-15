import type { StepLine, StepLog } from '../../step-log/types'
import type { FrontierProgram, FrontierRecording, Pause } from './programs/types'
import type { FrontierState } from './model'

/**
 * Shared helpers for building a preset's step-log from its recording. A
 * preset reads every drawn value (the queue, the distances, the heap, the
 * stack, the graph itself) from the recording's pauses; the words around
 * them are templates over those values, so a re-recording that changed the
 * run changes the picture and the captions with it.
 */

export const RUNTIME = 'node@24.x'
export const GENERATOR = 'node-inspector-frontier@1'

/** The pane's line (1-based) for a lesson line: the first display row that shows it. */
export function line(p: FrontierProgram, src: number): number {
  const i = p.display.findIndex((d) => d.src === src)
  if (i < 0) throw new Error(`${p.id}: lesson line ${src} is not on screen`)
  return i + 1
}

/** The pane's rows for lesson lines `a` to `b`: every display row that shows one of them. */
export function lines(p: FrontierProgram, a: number, b: number = a): StepLine {
  const rows = p.display.flatMap((d, i) => (d.src >= a && d.src <= b ? [i + 1] : []))
  if (!rows.length) throw new Error(`${p.id}: lesson lines ${a}-${b} are not on screen`)
  const [first, last] = [rows[0], rows[rows.length - 1]]
  return first === last ? first : ([first, last] as const)
}

/** The pauses of one probe, in run order. */
export const pausesOf = (rec: FrontierRecording, probe: string): Pause[] => rec.pauses.filter((p) => p.probe === probe)

/** A recorded number that may be `Infinity` (JSON carries it as the string). */
export const num = (v: unknown): number => (v === 'Infinity' ? Infinity : (v as number))
export const show = (n: number): string => (n === Infinity ? '∞' : String(n))

/** "B", "B and C", "B, C and D". */
export function list(xs: readonly string[]): string {
  if (xs.length <= 1) return xs.join('')
  return `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}

/** The log's source block: the program as run, which the truth test re-runs. */
export function source(p: FrontierProgram, rec: FrontierRecording): StepLog<FrontierState>['source'] {
  const snippet = p.harness ? `${p.lesson}\n${p.harness}` : p.lesson
  return { snippet, runtime: RUNTIME, generator: GENERATOR, sha256: rec.sha256 }
}

export const code = (p: FrontierProgram): NonNullable<StepLog<FrontierState>['code']> => ({
  lang: p.lang,
  lines: p.display.map((d) => d.text),
})
