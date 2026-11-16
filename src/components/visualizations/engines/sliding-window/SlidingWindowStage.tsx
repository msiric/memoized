'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type RefObject } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { ink, radius, strokeWidth, surface, svgInk, type as typeScale, type MotionTokenName } from '../../primitives/tokens-v3'
import { finishMoves, moveSpringToken, springCurve, useFlip } from '../../shell/flip'
import { animates, beatDelay, presence, transitionFor, type MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS } from '../../shell/vars'
import { Lane } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import { G, STRIP, chipLabel, headingItems, storeLabel, tagBox, type SlidingWindowMetrics } from './layout'
import { BEST_ID, LEFT_ID, OUTPUT_ID, RIGHT_ID, cellId, keyId, swIntrospection, type SWState } from './model'

/**
 * Sliding-window renderer (R4 shared visual 2): state -> strip, store, heading.
 *
 * The strip is one svg: the string's cells never move; under them the
 * window band runs from the left edge's cell to the right edge's, one
 * segment per cell, and each edge is a tag in its own lane, named as the
 * code names it (`windowStart`, `i`), so a tag slides along its lane without
 * crossing the other. The step moves one edge: its tag slides on the `move`
 * spring on the glyph beat and the band's segment it took in fades in, or
 * the one it let go fades out, on the same beat (part of that edge's move,
 * not a glyph of its own; nothing changes size). The cell the edge took in or let go is the
 * step's `changed` glyph (doubled neutral edge on the white/5 tint, H3 R2
 * Q9, never lime); a character the right edge has read but the Set has not
 * taken yet is drawn dashed (the spec's "read"). Cells outside the window
 * keep their place, their characters muted.
 *
 * The store (the count map's `key: count` entries or the Set's members) is
 * the shared `Lane`: a chip enters at the end or leaves from it on the glyph
 * beat; a change that makes other chips close up lands at once (as the
 * frontier's queue), so a fading chip never crosses another. The heading
 * names the limit, the window's length and the best length (amber, the
 * result role, tinted on the step that records it) and, at the end, what the
 * program printed.
 */

const MOVE_ID = 'viz-move'
const FADE_ID = 'viz-fade'

const r1 = (n: number) => Math.round(n * 10) / 10

/** One fade on a token: `in|out`, the token and its beat. */
const fade = (dir: 'in' | 'out', token: MotionTokenName, beat: 'glyph' | 'land') => `${dir} ${token} ${beat}`

/** Plays every `[data-fade]` of this step on its token and beat; instant renders and glyphs past the budget land. */
function useFades(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]'))
      for (const a of node.getAnimations?.() ?? []) if (a.id === FADE_ID) a.finish()
    if (gate.instant || typeof Element.prototype.animate !== 'function') return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]')) {
      const id = node.dataset.glyph ?? node.dataset.follows
      if (id && !animates(gate, id)) continue
      const [dir, token, beat] = node.dataset.fade!.split(' ')
      const t = transitionFor(token as MotionTokenName, gate) as { duration?: number; ease?: number[] | string }
      if (!t.duration) continue
      const anim = node.animate(dir === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
        duration: t.duration * 1000,
        easing: Array.isArray(t.ease) ? `cubic-bezier(${t.ease.join(', ')})` : 'linear',
        delay: beatDelay(gate, beat as 'glyph' | 'land') * 1000,
        fill: 'backwards',
      })
      anim.id = FADE_ID
    }
    // Once per step (and per instant epoch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}

/** Where an edge tag rests. */
type Place = { x: number; y: number }
const placeCss = (p: Place) => `translate(${r1(p.x)}px, ${r1(p.y)}px)`

/** The `move` spring (flip.ts) for the edge tags between two steps, on the glyph beat, when the edge is in the step's budget. */
function useMoves(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown, places: Map<string, Place>) {
  const last = useRef(places)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (gate.instant) finishMoves(el as unknown as HTMLElement)
    const canAnimate = !gate.instant && !gate.reduce && typeof Element.prototype.animate === 'function'
    const curve = springCurve(moveSpringToken())
    for (const node of el.querySelectorAll<SVGGElement>('[data-move]')) {
      const id = node.dataset.move!
      const to = places.get(id)
      const from = last.current.get(id)
      for (const a of node.getAnimations?.() ?? []) if (a.id === MOVE_ID) a.cancel()
      if (!to || !from || (Math.abs(to.x - from.x) < 0.5 && Math.abs(to.y - from.y) < 0.5)) continue
      if (!canAnimate || !animates(gate, id)) continue
      const frames = curve.progress.map((p, i) => ({
        offset: curve.offsets[i],
        transform: placeCss({ x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p }),
      }))
      const anim = node.animate(frames, { duration: curve.duration, delay: beatDelay(gate, 'glyph') * 1000, easing: 'linear', fill: 'backwards' })
      anim.id = MOVE_ID
    }
    last.current = places
    // Once per step (and per instant epoch), not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}

/**
 * Which store chips land at once on this step: one that leaves while others
 * close up behind it, or arrives where others make room, would cross them
 * mid-fade (G1), so the change lands in one frame, forward and back alike.
 */
function frozenChips(prev: SWState | undefined, next: SWState): Set<string> {
  const out = new Set<string>()
  if (!prev) return out
  const a = prev.store.map((e) => keyId(e.key))
  const b = next.store.map((e) => keyId(e.key))
  const kept = b.filter((id) => a.includes(id))
  const shifted = kept.some((id) => a.indexOf(id) !== b.indexOf(id))
  const leaving = a.filter((id) => !b.includes(id))
  const arriving = b.filter((id) => !a.includes(id))
  if ((leaving.length && (shifted || arriving.length)) || (arriving.length && shifted)) for (const id of [...leaving, ...arriving]) out.add(id)
  return out
}

function without(gate: MotionGate, frozen: ReadonlySet<string>, ids: Iterable<string>): MotionGate {
  if (!frozen.size) return gate
  return { ...gate, allow: new Set([...(gate.allow ?? ids)].filter((id) => !frozen.has(id))) }
}

/** An edge tag at its own origin (the caller translates it): the panel fill, a 1 px `line` edge, the name in mono 12. */
function TagBody({ name, w, changed }: { name: string; w: number; changed?: boolean }) {
  return (
    <>
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={STRIP.tag - 1}
        rx={radius.chip.px}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
        className={changed ? 'vz-ch' : 'vz-p vz-l'}
      />
      <text x={r1(w / 2)} y={r1(STRIP.tag / 2 + 4)} className="vz-12 vz-c">
        {name}
      </text>
    </>
  )
}

export function SlidingWindowStage({ step, previous, codePane, layout, motion: gate, label, index }: StageProps<SWState>) {
  const metrics = layout.detail as SlidingWindowMetrics
  const g = metrics.strip
  const state = step.state
  const { names } = state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const svg = useRef<SVGSVGElement>(null)
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)

  // The state on screen before this render (the shell's `previous` is the step before in the log, which Back
  // does not come from). Lane chips are judged in log order, so Back mirrors Next.
  const ids = swIntrospection.ids(state)
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })
  // Held for the whole step, so a re-render during its beats keeps what is leaving (a ghost tag, a fading
  // segment): the state shown before this step, or this one on a first render or another preset.
  const held = useRef<{ step: typeof step; from: SWState; shown: SWState }>({ step, from: state, shown: state })
  if (held.current.step !== step) {
    const shown = held.current.shown
    held.current = { step, from: shown.text === state.text ? shown : state, shown: state }
  }
  const from = held.current.from
  const prevIds = swIntrospection.ids(from)
  const created = new Set([...focus].filter((f) => !prevIds.has(f)))
  const frozen = useMemo(() => (gate.direction === -1 ? frozenChips(state, from) : frozenChips(from, state)), [gate.direction, from, state])
  // A change that lands at once drops its chip in the same frame: the lane's presence group remounts.
  const laneEpoch = useRef(0)
  const seen = useRef<unknown>(null)
  if (seen.current !== step) {
    seen.current = step
    if (frozen.size) laneEpoch.current++
  }
  const laneGate = without(gate, frozen, [...ids, ...prevIds])
  const storeGate = laneEpoch.current ? { ...laneGate, epoch: laneGate.epoch * 1000 + laneEpoch.current } : laneGate

  // The edges, where they rest on this step.
  const leftBox = tagBox(g, names.left, state.left, 'left')
  const rightBox = state.right === null ? null : tagBox(g, names.right, state.right, 'right')
  const places = useMemo(() => {
    const out = new Map<string, Place>([[LEFT_ID, { x: leftBox.x, y: leftBox.y }]])
    if (rightBox) out.set(RIGHT_ID, { x: rightBox.x, y: rightBox.y })
    return out
    // A function of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useMoves(svg, gate, step, places)
  useFades(svg, gate, step)

  // The cell this step's edge took in (right) or let go (left), from the step before in log order.
  const was = previous?.state
  // A Set's add after deletes changes no edge: the cell read at the right edge turns from read to held.
  const added = state.right !== null && !focus.has(LEFT_ID) && focus.has(keyId(state.text[state.right]))
  const changedCell = focus.has(RIGHT_ID) || added ? state.right : focus.has(LEFT_ID) && was ? was.left : null
  // Against what was on screen (Back included): the band's segments that arrive or leave, and the right
  // tag appearing with the first read or leaving on the way back to Start (drawn once more, fading out).
  const inside = (s: SWState, i: number) => s.right !== null && i >= s.left && i <= s.right
  const edgeOf = (i: number, s: SWState) => (s.right !== null && i > s.right ? RIGHT_ID : LEFT_ID)
  const arriving = [...state.text].flatMap((_, i) => (inside(state, i) && !inside(from, i) ? [i] : []))
  const departing = [...state.text].flatMap((_, i) => (!inside(state, i) && inside(from, i) ? [i] : []))
  const rightAppears = from.right === null && state.right !== null
  const rightLeaves = from.right !== null && state.right === null ? from.right : null
  const out = state.output.join(' ')
  const best = focus.has(BEST_ID)

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

      {/* The machine: the strip and the store. Its accessible name spells the window, the store and the best length. */}
      <div role="img" aria-label={label} className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-start-1" style={{ gap: toRem(G.gap) }}>
        <div
          data-viz-region="strip"
          className={clsx('relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1', radius.row.cls, surface.panel, H_CLS)}
          style={remHeights(metrics.stripPanel, { gap: toRem(G.labelGap) })}
        >
          <div className="flex h-4 min-w-0 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap">
            <span className={clsx(typeScale.label.cls, ink.secondary)}>s</span>
            {headingItems(state).map((v) => {
              const isBest = v.name === names.best
              return (
                <span key={v.name} data-var={v.name} className="inline-flex min-w-0 items-center gap-1">
                  <span className={clsx(typeScale.tag.cls, ink.muted)}>{v.name}</span>
                  {isBest ? (
                    // The best length is a readout: it takes its new value with the step and its tint on the step that
                    // records it (the result role, never lime); nothing fades, so it never dips.
                    <span data-glyph={BEST_ID} data-focus={best || undefined} className={clsx(typeScale.meta.cls, ink.result, radius.chip.cls, 'px-0.5', best && surface.resultTint)}>
                      {v.value}
                    </span>
                  ) : (
                    <span className={clsx(typeScale.meta.cls, ink.base)}>{v.value}</span>
                  )}
                </span>
              )
            })}
            {/* What the program printed (the observed trace), landing on the third beat. */}
            <span data-viz-region="console" className="ml-auto inline-flex min-w-0 items-center">
              <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
                {out ? (
                  <m.span
                    key={`out:${gate.epoch}`}
                    // A console line, as the event loop's (`data-out`): it arrives and leaves on the one `land` token.
                    data-out={0}
                    data-focus={focus.has(OUTPUT_ID) || undefined}
                    className={clsx('inline-flex items-center whitespace-pre', typeScale.meta.cls)}
                    {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                  >
                    <span aria-hidden className={ink.muted}>
                      {'› '}
                    </span>
                    <span className={clsx(ink.result, radius.chip.cls, 'px-0.5', focus.has(OUTPUT_ID) && surface.resultTint)}>{out}</span>
                  </m.span>
                ) : null}
              </AnimatePresence>
            </span>
          </div>
          <div className="flex min-h-0 shrink-0 items-start justify-center" style={{ height: toRem(g.height) }}>
            <svg
              ref={svg}
              aria-hidden
              data-viz-part="window-strip"
              viewBox={`0 0 ${g.width} ${g.height}`}
              width="100%"
              data-viz-width={g.width}
              className="vz-s block"
              style={{ maxWidth: toRem(g.width), height: toRem(g.height) }}
              fontSize={G.text}
            >
              {/* Indices over the cells, so an edge's position reads as the code's number. */}
              <g data-indices className="vz-12 vz-m">
                {g.x.map((x, i) => (
                  <text key={i} x={r1(x + STRIP.cell / 2)} y={11} className="vz-c">
                    {i}
                  </text>
                ))}
              </g>
              {[...state.text].map((ch, i) => {
                const inside = state.right !== null && i >= state.left && i <= state.right
                const read = state.pending && i === state.right
                const lit = changedCell === i
                return (
                  <g
                    key={i}
                    data-cell={cellId(i)}
                    data-in={inside || undefined}
                    data-read={read || undefined}
                    data-changed={lit || undefined}
                    className={svgInk.line}
                  >
                    <rect
                      x={r1(g.x[i]) + 0.5}
                      y={g.cellTop + 0.5}
                      width={STRIP.cell - 1}
                      height={STRIP.cell - 1}
                      rx={radius.glyph.px}
                      strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
                      className={clsx(lit ? 'vz-ch' : 'vz-g', read && 'vz-d')}
                    />
                    <text x={r1(g.x[i] + STRIP.cell / 2)} y={g.cellTop + STRIP.cell / 2 + 4.5} className={clsx('vz-c', !inside && 'vz-m')}>
                      {ch}
                    </text>
                  </g>
                )
              })}

              {/* The window band: one segment per cell, joined across the gaps; a segment fades with the edge that moved. */}
              {departing.map((i) => (
                <rect
                  key={`ghost-seg-${i}-${index}`}
                  data-follows={edgeOf(i, state)}
                  data-ghost=""
                  data-fade={fade('out', 'exit', 'glyph')}
                  style={{ opacity: 0 }}
                  x={r1(g.x[i] - STRIP.cellGap / 2)}
                  y={g.bandY}
                  width={STRIP.cell + STRIP.cellGap}
                  height={STRIP.band}
                  className="vz-nd"
                />
              ))}
              <g
                data-viz-part="window-band"
                data-from={state.right === null ? undefined : cellId(state.left)}
                data-to={state.right === null ? undefined : cellId(state.right)}
              >
                {[...state.text].map((_, i) =>
                  inside(state, i) ? (
                    <rect
                      key={`seg-${i}`}
                      data-follows={arriving.includes(i) ? (i > (from.right ?? -1) ? RIGHT_ID : LEFT_ID) : undefined}
                      data-fade={arriving.includes(i) ? fade('in', 'enter', 'glyph') : undefined}
                      x={r1(g.x[i] - STRIP.cellGap / 2)}
                      y={g.bandY}
                      width={STRIP.cell + STRIP.cellGap}
                      height={STRIP.band}
                      className="vz-nd"
                    />
                  ) : null,
                )}
              </g>

              {/* The edges: one tag per lane, sliding to its cell; the right one appears with the first read. */}
              {rightLeaves !== null ? (
                <g
                  key={`ghost-right-${index}`}
                  data-glyph={RIGHT_ID}
                  data-ghost=""
                  data-fade={fade('out', 'exit', 'glyph')}
                  style={{ opacity: 0 }}
                  transform={`translate(${tagBox(g, names.right, rightLeaves, 'right').x} ${g.lanes.right})`}
                >
                  <TagBody name={names.right} w={tagBox(g, names.right, rightLeaves, 'right').w} />
                </g>
              ) : null}
              <g
                key="left"
                data-tag=""
                data-move={LEFT_ID}
                data-glyph={LEFT_ID}
                data-edge-name={names.left}
                data-at={cellId(state.left)}
                transform={`translate(${leftBox.x} ${leftBox.y})`}
              >
                <TagBody name={names.left} w={leftBox.w} changed={focus.has(LEFT_ID)} />
              </g>
              {rightBox ? (
                <g
                  key="right"
                  data-tag=""
                  data-move={RIGHT_ID}
                  data-glyph={RIGHT_ID}
                  data-edge-name={names.right}
                  data-at={cellId(state.right!)}
                  data-fade={rightAppears ? fade('in', 'enter', 'glyph') : undefined}
                  transform={`translate(${rightBox.x} ${rightBox.y})`}
                >
                  <TagBody name={names.right} w={rightBox.w} changed={focus.has(RIGHT_ID)} />
                </g>
              ) : null}
            </svg>
          </div>
        </div>
        <Lane
          id="store"
          label={storeLabel(state)}
          kind="frame"
          vertical={false}
          chips={state.store.map((e) => ({ id: keyId(e.key), label: chipLabel(e) }))}
          labelAt={{ narrow: 'top', wide: 'top' }}
          height={metrics.store}
          focus={focus}
          created={created}
          present={ids}
          before={before}
          gate={storeGate}
          // The store fills at its end and empties from wherever a key leaves.
          from={{ x: 1 }}
          to={{ x: -1 }}
        />
      </div>
    </div>
  )
}

