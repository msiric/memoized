'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { Tag } from '../../primitives/Tag'
import { ink, motion as motionTokens, radius, strokeWidth, surface, svgInk, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { H_CLS } from '../../shell/vars'
import { presence, transitionFor, type MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { Lane } from '../../substrates/Lane'
import { remHeights, toRem } from '../../substrates/units'
import { CANVAS, G, type CanvasGeometry, type FrontierMetrics } from './layout'
import { frontierIntrospection, outId, type FEdge, type FNode, type FrontierState } from './model'

/**
 * Frontier renderer: state -> canvas, lanes and console.
 *
 * Below 768: code, the canvas panel (its heading names the locals of the
 * step, `vertex B`), the frontier lane(s), the console. From 768: code over
 * the console on the left, the canvas and the lanes on the right.
 *
 * The canvas is server-final SVG: vertex states change with the step and
 * never move (the lane carries the motion). A waiting vertex has the queued
 * chip's sky edge and tint, the one being expanded the doubled neutral edge
 * of "changed this step" (Q9, never lime), a finished one a solid fill, a
 * wall a dashed outline. Lime marks only the edge the code is examining,
 * as the code pane marks the line.
 *
 * Lanes are the shared substrate: a chip enters at the back and leaves from
 * the head (a queue), sits in key order (a heap), or stacks bottom-up with
 * its top marked (a stack). A chip that changes lane (`nq` to `q`) keeps
 * its id and travels (FLIP). The console is the event loop's: amber output
 * in run order, the newest on its quiet ground.
 */

const STATUS_SHAPE: Record<FNode['status'], string> = {
  idle: 'vz-g',
  frontier: 'vz-nq',
  current: 'vz-ch',
  done: 'vz-nd',
  wall: 'vz-l vz-d',
}
const STATUS_TEXT: Record<FNode['status'], string | undefined> = {
  idle: undefined,
  frontier: undefined,
  current: undefined,
  done: 'vz-ndt',
  wall: 'vz-m',
}

/** A recorded value beside a vertex (its distance): amber output text, `∞` muted until one is written. */
function Badge({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text data-badge className={clsx('vz-12', text === '∞' ? 'vz-m' : 'vz-r')} x={x} y={y} textAnchor="start" dominantBaseline="central">
      {text}
    </text>
  )
}

function Edge({ edge, geo, directed }: { edge: FEdge; geo: CanvasGeometry; directed?: boolean }) {
  const a = geo.at[edge.from]
  const b = geo.at[edge.to]
  const r = geo.size / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const x1 = a.x + ux * r
  const y1 = a.y + uy * r
  const tip = { x: b.x - ux * (r + 1), y: b.y - uy * (r + 1) }
  const head = CANVAS.arrow
  const x2 = directed ? tip.x - ux * head : tip.x
  const y2 = directed ? tip.y - uy * head : tip.y
  // The arrowhead: a filled triangle whose tip touches the target's edge.
  const px = -uy * head * 0.6
  const py = ux * head * 0.6
  const back = { x: tip.x - ux * head * 1.4, y: tip.y - uy * head * 1.4 }
  return (
    <g
      data-fr-edge={edge.id}
      data-active={edge.active || undefined}
      className={edge.active ? 'vz-ea' : undefined}
      style={edge.active ? ({ ['--vz-sw' as string]: `${strokeWidth.nowConnector}px` } as React.CSSProperties) : undefined}
    >
      <line className="vz-e" x1={x1} y1={y1} x2={x2} y2={y2} />
      {directed ? (
        <path className="vz-ah" d={`M${tip.x},${tip.y} L${back.x + px},${back.y + py} L${back.x - px},${back.y - py} Z`} />
      ) : null}
    </g>
  )
}

/** Where an edge's weight sits: its midpoint, pushed off the line to one side. */
function weightAt(edge: FEdge, geo: CanvasGeometry) {
  const a = geo.at[edge.from]
  const b = geo.at[edge.to]
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  // The normal that points up (or right for a vertical edge).
  let nx = -(b.y - a.y) / len
  let ny = (b.x - a.x) / len
  if (ny > 0 || (ny === 0 && nx < 0)) {
    nx = -nx
    ny = -ny
  }
  return { x: mx + nx * 9, y: my + ny * 9 }
}

function Canvas({ state, geo }: { state: FrontierState; geo: CanvasGeometry }) {
  const { scene } = state
  const r = geo.size / 2
  const grid = scene.kind === 'grid'
  return (
    <svg
      aria-hidden
      data-viz-part="frontier-canvas"
      className="vz-fr block"
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      width={geo.width}
      height={geo.height}
      fontSize={G.text}
      style={{ width: `min(100%, ${toRem(geo.width)})` }}
    >
      {grid ? <GridIndices state={state} geo={geo} /> : null}
      <g>
        {state.edges.map((e) => (
          <Edge key={e.id} edge={e} geo={geo} directed={scene.directed} />
        ))}
      </g>
      {state.edges.some((e) => e.weight !== undefined) ? (
        <g data-weights>
          {state.edges.map((e) => {
            if (e.weight === undefined) return null
            const at = weightAt(e, geo)
            return (
              <text key={e.id} className="vz-12 vz-m" x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central">
                {e.weight}
              </text>
            )
          })}
        </g>
      ) : null}
      {state.nodes.map((n) => {
        const at = geo.at[n.id]
        const shape = clsx(STATUS_SHAPE[n.status])
        const ring = n.status === 'current' ? strokeWidth.mark : strokeWidth.outline
        return (
          <g key={n.id} data-fr-node={n.id} data-status={n.status} className={n.status === 'idle' || n.status === 'wall' ? svgInk.line : undefined}>
            {grid ? (
              <rect
                className={shape}
                x={at.x}
                y={at.y}
                width={geo.size}
                height={geo.size}
                rx={radius.glyph.px}
                strokeWidth={ring}
                fill={n.status === 'wall' ? 'none' : undefined}
              />
            ) : (
              <circle className={shape} cx={at.x} cy={at.y} r={r} strokeWidth={ring} />
            )}
            <text
              className={STATUS_TEXT[n.status]}
              // In a cell with an effort in its corner, the value sits low and left of centre.
              x={grid ? at.x + r - (n.badge ? 4 : 0) : at.x}
              y={grid ? at.y + r + (n.badge ? 5 : 0) : at.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {n.label}
            </text>
            {n.badge !== undefined ? (
              grid ? (
                <text
                  className={clsx('vz-12', n.status === 'done' ? 'vz-ndt' : n.badge === '∞' ? 'vz-m' : 'vz-r')}
                  x={at.x + geo.size - 3}
                  y={at.y + 8}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {n.badge}
                </text>
              ) : (
                <Badge x={at.x + r} y={at.y - r + 2} text={n.badge} />
              )
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

/** Row and column numbers around a grid, so a lane's [i, j] finds its cell. */
function GridIndices({ state, geo }: { state: FrontierState; geo: CanvasGeometry }) {
  const rows = new Map<number, number>()
  const cols = new Map<number, number>()
  for (const n of state.nodes) {
    const [i, j] = n.id.slice(2).split('-').map(Number)
    rows.set(i, geo.at[n.id].y + geo.size / 2)
    cols.set(j, geo.at[n.id].x + geo.size / 2)
  }
  const left = Math.min(...[...state.nodes].map((n) => geo.at[n.id].x))
  const top = Math.min(...[...state.nodes].map((n) => geo.at[n.id].y))
  return (
    <g data-indices className="vz-12 vz-m">
      {[...cols].map(([j, x]) => (
        <text key={`c${j}`} className="vz-m" x={x} y={top - 8} textAnchor="middle" dominantBaseline="central">
          {j}
        </text>
      ))}
      {[...rows].map(([i, y]) => (
        <text key={`r${i}`} className="vz-m" x={left - 8} y={y} textAnchor="middle" dominantBaseline="central">
          {i}
        </text>
      ))}
    </g>
  )
}

/**
 * Which lane chips land at once on this step. A chip that enters or leaves
 * at the end of its lane, with every other chip staying put, plays its
 * enter or exit; one that leaves the head of a queue (or the middle of a
 * heap) while the rest close up behind it, or arrives where others make
 * room, would cross them mid-fade (G1), so the change lands in one frame,
 * forward and back alike (D8): the canvas shows what happened to it.
 */
function frozenChips(prev: FrontierState | undefined, next: FrontierState): Set<string> {
  const out = new Set<string>()
  if (!prev) return out
  for (const lane of next.scene.lanes) {
    const a = (prev.lanes[lane.id] ?? []).map((c) => c.id)
    const b = (next.lanes[lane.id] ?? []).map((c) => c.id)
    const kept = b.filter((id) => a.includes(id))
    const shifted = kept.some((id) => a.indexOf(id) !== b.indexOf(id))
    const leaving = a.filter((id) => !b.includes(id))
    const arriving = b.filter((id) => !a.includes(id))
    // Leaving while others close up or arrive in its place, or arriving while
    // others make room: the whole lane's change lands at once, so both
    // directions animate the same (nothing) in it.
    // A stack packs from its top edge, so a push or a pop moves every chip under it.
    const stacked = lane.vertical && (leaving.length > 0 || arriving.length > 0)
    if (stacked || (leaving.length && (shifted || arriving.length)) || (arriving.length && shifted))
      for (const id of [...leaving, ...arriving]) out.add(id)
  }
  return out
}

/** The gate with `frozen` taken out of the step's budget. */
function without(gate: MotionGate, frozen: ReadonlySet<string>, ids: Iterable<string>): MotionGate {
  if (!frozen.size) return gate
  const allow = new Set([...(gate.allow ?? ids)].filter((id) => !frozen.has(id)))
  return { ...gate, allow }
}

/** How long a leaving glyph takes (s), so "no output yet" appears only once the last output has gone. */
function exitSeconds(gate: MotionGate): number {
  if (gate.instant) return 0
  const t = gate.reduce ? motionTokens.exit.reduced : motionTokens.exit.full
  return t.type === 'tween' ? t.duration : 0
}

export function FrontierStage({ step, codePane, layout, motion: gate, label }: StageProps<FrontierState>) {
  const metrics = layout.detail as FrontierMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const ids = frontierIntrospection.ids(state)
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })
  // The state on screen before this render (the shell's `previous` is the
  // step before in the log, which Back does not come from). Both directions
  // judge the pair in log order, so Back mirrors Next.
  const shownRef = useRef<FrontierState>(state)
  const from = shownRef.current
  useEffect(() => {
    shownRef.current = state
  })
  const prevIds = frontierIntrospection.ids(from)
  const created = new Set([...focus].filter((f) => !prevIds.has(f) && !f.startsWith('out-')))
  const frozen = useMemo(
    () => (gate.direction === -1 ? frozenChips(state, from) : frozenChips(from, state)),
    [gate.direction, from, state],
  )
  const laneGate = without(gate, frozen, [...ids, ...prevIds])
  // A lane whose chip lands at once drops it in the same frame: its
  // presence group remounts (a per-lane epoch that only ever grows), so a
  // leaving chip is never painted over the chip that closes up behind it.
  const epochs = useRef<Record<string, number>>({})
  const seen = useRef<unknown>(null)
  if (seen.current !== step) {
    seen.current = step
    for (const lane of state.scene.lanes) {
      const shown = from.lanes[lane.id] ?? []
      if (shown.some((c) => frozen.has(c.id))) epochs.current[lane.id] = (epochs.current[lane.id] ?? 0) + 1
    }
  }
  const gateFor = (lane: string): MotionGate => {
    const extra = epochs.current[lane] ?? 0
    return extra ? { ...laneGate, epoch: laneGate.epoch * 1000 + extra } : laneGate
  }
  const common = { focus, created, present: ids, before }
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)
  const out = state.console
  const consoleH = {
    narrow: metrics.consoleRows.narrow * G.outLine + (metrics.consoleRows.narrow - 1) * G.outRowGap,
    wide: metrics.consoleRows.wide * G.outLine + (metrics.consoleRows.wide - 1) * G.outRowGap,
  }

  return (
    <div
      ref={root}
      className={clsx(
        'relative flex h-full flex-col',
        'vz-wide:grid vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-wide:[grid-template-rows:auto_minmax(0,1fr)] vz-col:[grid-template-columns:var(--vz-cols-xl)]',
      )}
      style={{
        gap: toRem(G.gap),
        columnGap: toRem(16),
        ['--vz-cols-md' as string]: `${toRem(metrics.codeColumn.md)} minmax(0, 1fr)`,
        ['--vz-cols-xl' as string]: `${toRem(metrics.codeColumn.xl)} minmax(0, 1fr)`,
      }}
    >
      <div className="flex min-w-0 flex-col vz-wide:col-start-1 vz-wide:row-start-1 vz-wide:[&>*]:!w-full vz-wide:[&>*]:self-stretch">{codePane}</div>

      {/* The machine: the canvas and the frontier. Its accessible name describes every vertex, lane and output. */}
      <div role="img" aria-label={label} className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-span-2 vz-wide:row-start-1" style={{ gap: toRem(G.gap) }}>
        <div
          data-viz-region="canvas"
          className={clsx('relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1', radius.row.cls, surface.panel, H_CLS)}
          style={remHeights(metrics.canvasPanel, { gap: toRem(G.labelGap) })}
        >
          <div className="flex h-4 min-w-0 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap">
            <span className={clsx(typeScale.label.cls, ink.secondary)}>{state.scene.title}</span>
            {state.vars.map((v) => (
              <span key={v.name} data-var={v.name} className="inline-flex min-w-0 items-center gap-1">
                <span className={clsx(typeScale.tag.cls, ink.muted)}>{v.name}</span>
                <span className={clsx(typeScale.meta.cls, v.stale ? clsx(ink.removed, 'line-through') : ink.base)}>{v.value}</span>
                {v.stale ? (
                  <Tag tone="removed" className="h-4">
                    stale
                  </Tag>
                ) : null}
              </span>
            ))}
          </div>
          <div className="flex shrink-0 items-start justify-center" style={{ height: toRem(metrics.canvas.height) }}>
            <Canvas state={state} geo={metrics.canvas} />
          </div>
          {/* What the run printed, under the drawing (the event loop's console line: amber output in run order). */}
        <ol
            data-viz-region="console"
            aria-label="Console"
            className={clsx('relative m-0 flex min-w-0 shrink-0 list-none flex-wrap content-start items-start overflow-hidden p-0', H_CLS)}
            style={remHeights(consoleH, { columnGap: toRem(G.outGap), rowGap: toRem(G.outRowGap) })}
          >
          <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
            {out.map((text, k) => {
              const isNew = focus.has(outId(k))
              return (
                <m.li
                  key={`${k}:${gate.epoch}`}
                  data-out={k}
                  data-focus={isNew || undefined}
                  className={clsx(
                    // A leaving output keeps the line's whole width, so a long value keeps its wrap as it fades (G1).
                    'm-0 grid min-w-0 max-w-full items-start p-0 [grid-template-columns:auto_minmax(0,1fr)] [&[data-motion-pop-id]]:!w-full',
                    typeScale.value.cls,
                  )}
                  style={{ columnGap: toRem(G.outMark) }}
                  {...presence(outId(k), gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                >
                  <span aria-hidden className={clsx('flex h-5 items-center', ink.muted)}>
                    ›
                  </span>
                  <span className={clsx('relative break-all', ink.result, radius.chip.cls, isNew && surface.resultTint)}>{text}</span>
                </m.li>
              )
            })}
          </AnimatePresence>
          {out.length === 0 ? (
            // As a lane's "empty": it appears once a leaving output has gone (G1); instant renders land it (D7).
            <m.li
              aria-hidden
              className={clsx('m-0 flex h-5 items-center p-0', typeScale.tag.cls, ink.muted)}
              initial={gate.instant ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...transitionFor('highlight', gate), delay: exitSeconds(gate) }}
            >
              no output yet
            </m.li>
          ) : null}
        </ol>
        </div>
        <div className={clsx('flex min-w-0 flex-col', state.scene.laneRow && 'grid grid-cols-2')} style={{ gap: toRem(G.gap) }}>
        {state.scene.lanes.map((lane) => (
          <Lane
            key={lane.id}
            {...common}
            gate={gateFor(lane.id)}
            id={lane.id}
            label={lane.label}
            kind="task"
            vertical={lane.vertical}
            chips={state.lanes[lane.id] ?? []}
            labelAt={{ narrow: 'top', wide: 'top' }}
            height={metrics.lanes[lane.id]}
            // A queue fills at the back and empties at the head; a stack and a heap at their own end.
            from={lane.vertical ? { y: -1 } : { x: 1 }}
            to={lane.vertical ? { y: -1 } : { x: -1 }}
          />
        ))}
        </div>
      </div>

    </div>
  )
}
