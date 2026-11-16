import { hasWrapRows, placeholderText, type DisplayRow } from '../../step-log/lesson-source'
import type { Checkpoint, Step, StepLine, StepLog } from '../../step-log/types'
import { statusId, type FState } from './model'
import type { FramesProgram, FramesRecording, Pause } from './program'

/**
 * What the three frames visuals share when they turn a recording into a
 * step-through (spec P6): each visual's builder (`presets/*`) walks its
 * recorded pauses and drafts one step per event, every drawn value read from
 * a pause; this module maps the program lines a draft names onto the pane's
 * rows, ties printed lines to the trace, and assembles the log. Presets add
 * only words and checkpoints.
 */

export const FRAMES_GENERATOR = 'node-inspector-frames@1'

/** A step as a builder drafts it: lines of the program as run (or 'host'), never pane rows. */
export type Draft = {
  state: FState
  event: string
  why: string
  narration: string
  /** A line of the program as run, an inclusive range, or 'host' (the harness or the runtime acting). */
  src?: number | readonly [number, number] | 'host'
  focus: readonly string[]
}

export type FramesSpec = {
  /** `frames/<preset>`. */
  id: string
  program: FramesProgram
  recording: FramesRecording
  /**
   * The pane: the program's lines reflowed to 35 columns (only whitespace
   * may differ). Content rows carry no text (`wrap`, resolved for a page);
   * harness rows are text.
   */
  display: readonly DisplayRow[]
  checkpoints: (steps: readonly Step<FState>[]) => Checkpoint[]
}

/** A recorded value as JavaScript writes it: strings quoted, bigint with `n`, undefined spelled out. */
export function fmt(v: unknown): string {
  if (v && typeof v === 'object' && '$n' in v) return `${(v as { $n: string }).$n}n`
  if (v && typeof v === 'object' && '$u' in v) return 'undefined'
  if (typeof v === 'string') return `'${v}'`
  if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`
  return String(v)
}

/** The first pane row (1-based) of a program line: what "line N" means to the reader (the pane numbers rows). */
export function rowOf(display: readonly DisplayRow[], src: number): number {
  const i = display.findIndex((d) => d.src === src)
  if (i < 0) throw new Error(`line ${src} of the program is not in the pane`)
  return i + 1
}

/** Pauses of a recording in order, with an index cursor for builders. */
export class Walk {
  i = 0
  constructor(readonly pauses: readonly Pause[]) {}
  get done() {
    return this.i >= this.pauses.length
  }
  peek(k = 0): Pause | undefined {
    return this.pauses[this.i + k]
  }
  /** The next pause, which must be `probe` (one of them). */
  take(probe: string | readonly string[]): Pause {
    const p = this.pauses[this.i]
    const want = typeof probe === 'string' ? [probe] : probe
    if (!p || !want.includes(p.probe)) throw new Error(`pause ${this.i} is ${p?.probe ?? 'missing'}, not ${want.join(' or ')}`)
    this.i++
    return p
  }
  /** Skips pauses until the next `probe`, and takes it. */
  to(probe: string | readonly string[]): Pause {
    const want = typeof probe === 'string' ? [probe] : probe
    while (this.pauses[this.i] && !want.includes(this.pauses[this.i].probe)) this.i++
    return this.take(want)
  }
}

/** A no-break space: it neither collapses nor wraps, so a padded status keeps its width. */
export const PAD = '\u00a0'

/**
 * Every lane's status chip at one width for the whole preset (its longest
 * label, padded with no-break spaces): a status that changes length would
 * slide the chips after it, and an arriving chip would cross the old text.
 */
export function padStatus(drafts: readonly Draft[]): Draft[] {
  const widest = new Map<string, number>()
  for (const d of drafts)
    for (const l of d.state.lanes) for (const c of l.chips) if (c.id === statusId(l.id)) widest.set(c.id, Math.max(widest.get(c.id) ?? 0, [...c.label].length))
  return drafts.map((d) => ({
    ...d,
    state: {
      ...d.state,
      lanes: d.state.lanes.map((l) => ({ ...l, chips: l.chips.map((c) => (widest.has(c.id) ? { ...c, label: c.label.padEnd(widest.get(c.id)!, PAD) } : c)) })),
    },
  }))
}

export function assemble(spec: FramesSpec, raw: readonly Draft[]): StepLog<FState> {
  const drafts = padStatus(raw)
  const { program: p, recording: rec, display } = spec
  const rowsOf = (a: number, b: number) =>
    display.flatMap((d, i) => (d.src >= a && d.src <= b && ('text' in d ? d.text.trim() : d.wrap[2] > d.wrap[1]) ? [i + 1] : []))
  const lineOf = (src: Draft['src']): StepLine | undefined => {
    if (src === undefined) return undefined
    if (src === 'host') return 'host'
    const [a, b] = typeof src === 'number' ? [src, src] : src
    const rows = rowsOf(a, b)
    if (!rows.length) throw new Error(`${spec.id}: lines ${a}-${b} are not in the pane`)
    return rows.length === 1 ? rows[0] : [rows[0], rows[rows.length - 1]]
  }
  let printed = 0
  const steps: Step<FState>[] = drafts.map((d, i) => {
    const out = d.state.output.length
    if (out < printed) throw new Error(`${spec.id} step ${i}: the output shrank`)
    const observes = Array.from({ length: out - printed }, (_, k) => printed + k)
    printed = out
    const line = lineOf(d.src)
    return {
      state: d.state,
      event: d.event,
      why: d.why,
      narration: d.narration,
      ...(i > 0 && line !== undefined ? { line } : {}),
      focus: d.focus,
      claim: observes.length ? 'observed' : 'modelled',
      ...(observes.length ? { observes } : {}),
    }
  })
  if (printed !== rec.observed.length) throw new Error(`${spec.id}: the steps show ${printed} of ${rec.observed.length} printed lines`)
  const log: StepLog<FState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: p.runtime, generator: FRAMES_GENERATOR, sha256: p.sha256 },
    code: {
      lang: p.lang,
      lines: placeholderText(display),
      ...(hasWrapRows(display) ? { premium: { source: p.source, rows: display } } : {}),
    },
    steps,
    checkpoints: [],
    observed: rec.observed.length ? { log: rec.observed } : {},
  }
  return { ...log, checkpoints: spec.checkpoints(steps) }
}
