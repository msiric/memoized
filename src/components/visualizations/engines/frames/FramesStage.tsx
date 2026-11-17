'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { changed, ink, radius, surface, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { presence, type MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS } from '../../shell/vars'
import { Lane } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import { G, type FramesMetrics } from './layout'
import { OUTPUT_ID, framesIntrospection, type FLane, type FState } from './model'

/**
 * Frames renderer (wave 3C): state -> readouts, lanes, console.
 *
 * Each lane is the shared `Lane` (one anatomy with the event loop's and the
 * frontier's): its label names the frame or slot, its first chip says what
 * it is doing (running, paused at a line, waiting, done) and the rest are
 * the values it holds. A chip that changes this step takes the neutral
 * `changed` mark in its lane's hue (H3 R2 Q9, never lime); a chip that
 * arrives enters at its lane's end on the glyph beat, one that leaves exits
 * toward the start, and a change that would make chips close up or open a
 * gap lands at once (as the sliding window's store), so a fading chip never
 * crosses another. Readouts (a cursor, counters) sit on one line over the
 * lanes; a changed readout takes the same mark. The console prints what the
 * program printed, newest last, each line landing on the third beat.
 */

/**
 * Which chips land at once on this step, per lane: one that leaves while
 * others close up behind it, or arrives where others make room, would cross
 * them mid-fade (G1), and a group arriving or leaving together would not
 * mirror on Back, so the change lands in one frame, forward and back alike.
 */
function frozenChips(prev: FState | undefined, next: FState): Set<string> {
  const out = new Set<string>()
  if (!prev) return out
  for (const lane of next.lanes) {
    const was = prev.lanes.find((l) => l.id === lane.id)
    if (!was) continue
    const a = was.chips.map((c) => c.id)
    const b = lane.chips.map((c) => c.id)
    const kept = b.filter((id) => a.includes(id))
    const shifted = kept.some((id) => a.indexOf(id) !== b.indexOf(id))
    const leaving = a.filter((id) => !b.includes(id))
    const arriving = b.filter((id) => !a.includes(id))
    // A chip leaving from anywhere but the end, or arriving anywhere but the end, moves its neighbours.
    const midLeave = leaving.some((id) => a.indexOf(id) < a.length - leaving.length)
    const midArrive = arriving.some((id) => b.indexOf(id) < b.length - arriving.length)
    // So does a change of more than one chip in a lane (an emit's whole copy arriving or leaving): one
    // chip's enter or exit mirrors cleanly, a group's would not (Back mirrors Next, D8).
    if (shifted || midLeave || midArrive || leaving.length + arriving.length > 1) for (const id of [...leaving, ...arriving]) out.add(id)
  }
  return out
}

function without(gate: MotionGate, frozen: ReadonlySet<string>, ids: Iterable<string>): MotionGate {
  if (!frozen.size) return gate
  return { ...gate, allow: new Set([...(gate.allow ?? ids)].filter((id) => !frozen.has(id))) }
}

export function FramesStage({ step, codePane, layout, motion: gate, label }: StageProps<FState>) {
  const metrics = layout.detail as FramesMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)

  // The state on screen before this render (Back included), for the lanes' enter and exit judgement.
  const ids = framesIntrospection.ids(state)
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })
  const held = useRef<{ step: typeof step; from: FState; shown: FState }>({ step, from: state, shown: state })
  if (held.current.step !== step) {
    const shown = held.current.shown
    const same = shown.lanes.length === state.lanes.length && shown.lanes.every((l, i) => l.id === state.lanes[i].id)
    held.current = { step, from: same ? shown : state, shown: state }
  }
  const from = held.current.from
  const prevIds = framesIntrospection.ids(from)
  const created = new Set([...focus].filter((f) => !prevIds.has(f)))
  const frozen = useMemo(() => (gate.direction === -1 ? frozenChips(state, from) : frozenChips(from, state)), [gate.direction, from, state])
  // A change that lands at once drops its chips in the same frame: the lanes' presence groups remount.
  const laneEpoch = useRef(0)
  const seen = useRef<unknown>(null)
  if (seen.current !== step) {
    seen.current = step
    if (frozen.size) laneEpoch.current++
  }
  const laneGate = without(gate, frozen, [...ids, ...prevIds])
  const lanesGate = laneEpoch.current ? { ...laneGate, epoch: laneGate.epoch * 1000 + laneEpoch.current } : laneGate
  const lit = focus.has(OUTPUT_ID)

  return (
    <div
      ref={root}
      className={clsx(
        'relative flex h-full flex-col',
        'vz-wide:grid vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-wide:[grid-template-rows:minmax(0,1fr)] vz-wide:items-center vz-col:[grid-template-columns:var(--vz-cols-xl)]',
      )}
      style={
        {
          gap: toRem(G.gap),
          columnGap: toRem(G.columnGap),
          '--vz-cols-md': `${toRem(metrics.codeColumn.md)} minmax(0, 1fr)`,
          '--vz-cols-xl': `${toRem(metrics.codeColumn.xl)} minmax(0, 1fr)`,
        } as CSSProperties
      }
    >
      <div className="flex min-w-0 flex-col vz-wide:col-start-1 vz-wide:row-start-1 vz-wide:self-start vz-wide:[&>*]:!w-full vz-wide:[&>*]:self-stretch">
        {codePane}
      </div>

      {/* The machine: readouts, lanes, console. Its accessible name spells every lane and what it holds. */}
      <div role="img" aria-label={label} className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-start-1" style={{ gap: toRem(G.gap) }}>
        {metrics.readouts ? (
          <div data-viz-region="readouts" className="flex h-4 min-w-0 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap px-1.5">
            {state.vars.map((v) => (
              <span key={v.id} data-var={v.name} className="inline-flex min-w-0 items-center gap-1">
                <span className={clsx(typeScale.tag.cls, ink.muted)}>{v.name}</span>
                <span
                  data-glyph={v.id}
                  data-focus={focus.has(v.id) || undefined}
                  className={clsx(typeScale.meta.cls, ink.base, radius.chip.cls, 'px-0.5', focus.has(v.id) && changed.neutral)}
                >
                  {v.value}
                </span>
              </span>
            ))}
            {/* A preset that prints at most one line shows it here, landing on the third beat (the sliding window's heading). */}
            {metrics.inlineOut ? (
              <span data-viz-region="console" className="ml-auto inline-flex min-w-0 items-center">
                <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
                  {state.output.length ? (
                    <m.span
                      key={`out:${gate.epoch}`}
                      data-out={0}
                      data-focus={lit || undefined}
                      className={clsx('inline-flex items-center whitespace-pre', typeScale.meta.cls)}
                      {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                    >
                      <span aria-hidden className={ink.muted}>
                        {'› '}
                      </span>
                      <span className={clsx(ink.result, radius.chip.cls, 'px-0.5', lit && surface.resultTint)}>{state.output[0]}</span>
                    </m.span>
                  ) : null}
                </AnimatePresence>
              </span>
            ) : null}
          </div>
        ) : null}
        {state.lanes.map((lane: FLane) => (
          <Lane
            key={lane.id}
            // `fx-` names the frames' lanes for the motion analyzer's stage regions.
            id={`fx-${lane.id}`}
            label={lane.label}
            kind={lane.kind}
            vertical={false}
            chips={lane.chips}
            labelAt={{ narrow: 'top', wide: 'top' }}
            height={metrics.lanes[lane.id]}
            focus={focus}
            created={created}
            present={ids}
            before={before}
            gate={lanesGate}
            // A lane fills at its end and empties from wherever a value leaves.
            from={{ x: 1 }}
            to={{ x: -1 }}
          />
        ))}
        {metrics.console.narrow ? (
          <div
            data-viz-region="console"
            className={clsx('relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1', radius.row.cls, surface.panel, H_CLS)}
            style={remHeights(metrics.console, { gap: toRem(G.labelGap) })}
          >
            <span className={clsx('h-4 shrink-0', typeScale.label.cls, ink.secondary)}>Console</span>
            <div className="flex min-w-0 flex-col" style={{ gap: toRem(G.outGap) }}>
              <AnimatePresence key={gate.epoch} initial={false} custom={{ gate }}>
                {state.output.map((line, k) => {
                  const newest = k === state.output.length - 1
                  return (
                    <m.div
                      key={`out-${k}:${gate.epoch}`}
                      // A console line, as the event loop's (`data-out`): it arrives and leaves on the one `land` token.
                      data-out={k}
                      data-focus={(lit && newest) || undefined}
                      className={clsx('min-w-0 whitespace-pre-wrap break-all', typeScale.meta.cls)}
                      {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                    >
                      <span aria-hidden className={ink.muted}>
                        {'› '}
                      </span>
                      <span className={clsx(ink.result, radius.chip.cls, lit && newest && surface.resultTint)}>{line}</span>
                    </m.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
