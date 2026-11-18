'use client'

import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { changed, ink, radius, stroke, surface, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import type { MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS } from '../../shell/vars'
import { Lane, type LaneChip } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import { G, type SwMetrics } from './layout'
import { CACHE_REGION, SLOTS, TABS, cacheId, slotRegion, swIntrospection, tabId, tabText, workerId, workerLabel, type SwState } from './model'
import type { TabId } from './programs/scenarios'

/**
 * Service-worker lifecycle renderer: state -> tabs, registration slots,
 * Cache Storage.
 *
 * The registration's slots are the shared `Lane` (one anatomy with the
 * event loop's and the frames'), one worker card each: a card keeps its id
 * as the worker moves from installing to waiting to active to redundant, so
 * the shell's FLIP plays it as one glyph travelling on the `move` spring,
 * lifted while it crosses lanes. A tab card says which worker controls it
 * (`→ v1`), that it has none, or that it is closed; a tab whose controller
 * changed this step takes the neutral `changed` mark (never lime), as does a
 * worker whose state changed in place. Cache Storage is a store lane
 * (violet edges): a cache arrives at its end on the glyph beat, and a change
 * that would make chips close up lands at once (the frames' rule).
 */

/** Which chips land at once on this step: one that leaves while others close up behind it would cross them mid-fade (the frames' rule). */
function frozenCaches(prev: SwState, next: SwState): Set<string> {
  const a = prev.caches.map(cacheId)
  const b = next.caches.map(cacheId)
  const leaving = a.filter((id) => !b.includes(id))
  const arriving = b.filter((id) => !a.includes(id))
  const midLeave = leaving.some((id) => a.indexOf(id) < a.length - leaving.length)
  return midLeave || leaving.length + arriving.length > 1 ? new Set([...leaving, ...arriving]) : new Set()
}

/**
 * A worker that leaves the registration (it became redundant) from a slot another worker arrives in on
 * the same step leaves at once: fading out under the arriving card, its label would overprint the
 * newcomer's (G1), with or without reduced motion. Back mirrors it (it returns at once).
 */
function frozenWorkers(prev: SwState, next: SwState): Set<string> {
  const out = new Set<string>()
  const where = (s: SwState, id: string) => SLOTS.find((k) => s.slots[k].some((w) => workerId(w.v) === id))
  for (const k of SLOTS)
    for (const w of prev.slots[k]) {
      const id = workerId(w.v)
      const gone = !where(next, id)
      const arrives = next.slots[k].some((x) => workerId(x.v) !== id && where(prev, workerId(x.v)) !== k)
      if (gone && arrives) out.add(id)
    }
  return out
}

function without(gate: MotionGate, frozen: ReadonlySet<string>, ids: Iterable<string>): MotionGate {
  if (!frozen.size) return gate
  return { ...gate, allow: new Set([...(gate.allow ?? ids)].filter((id) => !frozen.has(id))) }
}

function TabCard({ tab, state, lit, height }: { tab: TabId; state: SwState; lit: boolean; height: SwMetrics['band'] }) {
  const t = state.tabs[tab]
  const text = tabText(t)
  return (
    <div
      data-viz-region={`swl-tab-${tab}`}
      data-tab={tab}
      data-open={t.open || undefined}
      data-controller={t.controller ?? 'none'}
      className={clsx(
        'relative flex min-w-0 flex-col gap-1 border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1',
        radius.row.cls,
        surface.panel,
        H_CLS,
      )}
      style={remHeights(height)}
    >
      <span className={clsx('h-4 shrink-0', typeScale.label.cls, ink.secondary)}>Tab {tab}</span>
      <div className="flex h-7 min-w-0 items-center">
        {t.open && t.controller ? (
          <span
            data-glyph={tabId(tab)}
            data-focus={lit || undefined}
            className={clsx(
              'flex h-7 min-w-0 items-center border px-1.5 vz-tight:px-0.5 vz-tight:text-2xs',
              radius.chip.cls,
              surface.glyph,
              stroke.line,
              typeScale.value.cls,
              ink.base,
              lit && changed.neutral,
            )}
          >
            {text}
          </span>
        ) : (
          <span
            data-glyph={tabId(tab)}
            data-focus={lit || undefined}
            className={clsx('flex h-7 min-w-0 items-center whitespace-nowrap px-0.5', radius.chip.cls, typeScale.tag.cls, ink.muted, lit && changed.neutral)}
          >
            {text}
          </span>
        )}
      </div>
    </div>
  )
}

export function SwStage({ step, layout, motion: gate, label }: StageProps<SwState>) {
  const metrics = layout.detail as SwMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const lit = useMemo(() => new Set([...step.focus, ...state.marked]), [step.focus, state.marked])
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)

  // What was on stage before this render (Back included), for the lanes' enter, exit and move judgement.
  const ids = swIntrospection.ids(state)
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })
  const held = useRef<{ step: typeof step; from: SwState; shown: SwState }>({ step, from: state, shown: state })
  if (held.current.step !== step) held.current = { step, from: held.current.shown, shown: state }
  const from = held.current.from
  const prevIds = swIntrospection.ids(from)
  const created = new Set([...focus].filter((f) => !prevIds.has(f)))
  const frozen = useMemo(() => {
    const [a, b] = gate.direction === -1 ? [state, from] : [from, state]
    return new Set([...frozenCaches(a, b), ...frozenWorkers(a, b)])
  }, [gate.direction, from, state])
  const laneEpoch = useRef(0)
  const seen = useRef<unknown>(null)
  if (seen.current !== step) {
    seen.current = step
    if (frozen.size) laneEpoch.current++
  }
  const laneGate = without(gate, frozen, [...ids, ...prevIds])
  const lanesGate = laneEpoch.current ? { ...laneGate, epoch: laneGate.epoch * 1000 + laneEpoch.current } : laneGate

  const lane = (id: string, name: string, kind: 'frame' | 'micro', chips: LaneChip[], height = metrics.band) => (
    <Lane
      key={id}
      id={id}
      label={name}
      kind={kind}
      vertical={false}
      chips={chips}
      labelAt={{ narrow: 'top', wide: 'top' }}
      height={height}
      focus={lit}
      created={created}
      present={ids}
      before={before}
      gate={lanesGate}
      // A worker or a cache arrives at its lane's end and leaves toward its start (sideways, clear of the
      // lane's label); a worker that changes slot travels on the move spring instead. Back mirrors it.
      from={{ x: 1 }}
      to={{ x: -1 }}
    />
  )

  // One grid, one lane per band: narrow stacks tabs, slots, caches; wide puts the slots on the right,
  // spanning both rows, with the tabs over the caches on the left (centred on the slots).
  return (
    <div
      ref={root}
      role="img"
      aria-label={label}
      className="relative grid h-full content-start [grid-template-columns:minmax(0,1fr)] vz-wide:content-center vz-wide:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)]"
      style={{ rowGap: toRem(G.gap), columnGap: toRem(G.columnGap) } as CSSProperties}
    >
      <div className="grid min-w-0 grid-cols-2 vz-wide:col-start-1 vz-wide:row-start-1 vz-wide:self-end" style={{ gap: toRem(G.gap) }}>
        {TABS.map((t) => (
          <TabCard key={t} tab={t} state={state} lit={lit.has(tabId(t))} height={metrics.band} />
        ))}
      </div>
      <div data-viz-part="registration" className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-span-2 vz-wide:row-start-1" style={{ gap: toRem(G.gap) }}>
        {SLOTS.map((s) =>
          lane(
            slotRegion(s),
            s,
            'frame',
            state.slots[s].map((w) => ({ id: workerId(w.v), label: workerLabel(w) })),
          ),
        )}
      </div>
      <div className="flex min-w-0 flex-col vz-wide:col-start-1 vz-wide:row-start-2 vz-wide:self-start">
        {lane(
          CACHE_REGION,
          'Cache Storage',
          'micro',
          state.caches.map((c) => ({ id: cacheId(c), label: c })),
        )}
      </div>
    </div>
  )
}
