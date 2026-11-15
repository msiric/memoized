'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { Tag } from '../../primitives/Tag'
import { ink, radius, strokeWidth, surface, svgInk, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { H_CLS } from '../../shell/vars'
import { presence } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { Lane } from '../../substrates/Lane'
import { monoWidth } from '../../substrates/text-metrics'
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

/** A small value tag: the plate in the glyph fill, so no edge runs through it. */
function Badge({ x, y, text, anchor }: { x: number; y: number; text: string; anchor: 'start' | 'end' }) {
  const w = Math.ceil(monoWidth(text, G.small)) + 6
  const h = 16
  const left = anchor === 'start' ? x : x - w
  return (
    <g data-badge>
      <rect className="vz-p" x={left} y={y - h / 2} width={w} height={h} rx={radius.chip.px} />
      <text className={clsx('vz-12', text === '∞' ? 'vz-m' : 'vz-r')} x={left + w / 2} y={y} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    </g>
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
      data-edge={edge.id}
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
            const text = String(e.weight)
            const w = Math.ceil(monoWidth(text, G.small)) + 4
            return (
              <g key={e.id}>
                <rect className="vz-p" x={at.x - w / 2} y={at.y - 7} width={w} height={14} rx={radius.chip.px} />
                <text className="vz-12 vz-m" x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central">
                  {text}
                </text>
              </g>
            )
          })}
        </g>
      ) : null}
      {state.nodes.map((n) => {
        const at = geo.at[n.id]
        const shape = clsx(STATUS_SHAPE[n.status])
        const ring = n.status === 'current' ? strokeWidth.mark : strokeWidth.outline
        return (
          <g key={n.id} data-node={n.id} data-status={n.status} className={n.status === 'idle' || n.status === 'wall' ? svgInk.line : undefined}>
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
              x={grid ? at.x + r : at.x}
              y={grid ? at.y + r + (n.badge ? 4 : 0) : at.y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {n.label}
            </text>
            {n.badge !== undefined ? (
              grid ? (
                <text
                  className={clsx('vz-12', n.status === 'done' ? 'vz-ndt' : n.badge === '∞' ? 'vz-m' : 'vz-r')}
                  x={at.x + geo.size - 5}
                  y={at.y + 10}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {n.badge}
                </text>
              ) : (
                <Badge x={at.x + r - 2} y={at.y - r + 1} text={n.badge} anchor="start" />
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

export function FrontierStage({ step, previous, codePane, layout, motion: gate, label }: StageProps<FrontierState>) {
  const metrics = layout.detail as FrontierMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const ids = frontierIntrospection.ids(state)
  const prevIds = previous ? frontierIntrospection.ids(previous.state) : new Set<string>()
  const created = new Set([...focus].filter((f) => !prevIds.has(f) && !f.startsWith('out-')))
  const rendered = useRef<ReadonlySet<string>>(ids)
  const before = rendered.current
  useEffect(() => {
    rendered.current = ids
  })
  const common = { focus, created, present: ids, before, gate }
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)
  const out = state.console

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
          <div className="flex min-h-0 flex-1 items-start justify-center">
            <Canvas state={state} geo={metrics.canvas} />
          </div>
        </div>
        {state.scene.lanes.map((lane) => (
          <Lane
            key={lane.id}
            {...common}
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

      <div
        aria-hidden
        data-viz-region="console"
        className={clsx(
          'relative flex min-w-0 flex-col border border-transparent px-1.5 py-1.5 vz-wide:col-start-1 vz-wide:row-start-2 vz-wide:min-h-[var(--vz-h-w)] vz-wide:self-stretch vz-wide:p-2',
          'h-[var(--vz-h-n)] vz-wide:h-auto',
          radius.row.cls,
          surface.panel,
        )}
        style={remHeights(metrics.console, { gap: toRem(G.labelGap) })}
      >
        <span className={clsx('h-4 shrink-0', typeScale.label.cls, ink.secondary)}>Console</span>
        <ol className="m-0 flex min-h-0 min-w-0 list-none flex-wrap content-start items-start p-0" style={{ columnGap: toRem(G.outGap), rowGap: toRem(G.outRowGap) }}>
          <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
            {out.map((text, k) => {
              const isNew = focus.has(outId(k))
              return (
                <m.li
                  key={`${k}:${gate.epoch}`}
                  data-out={k}
                  data-focus={isNew || undefined}
                  className={clsx(
                    'm-0 grid min-w-0 max-w-full items-start p-0 [grid-template-columns:auto_minmax(0,1fr)] [&[data-motion-pop-id]]:!w-max [&[data-motion-pop-id]]:whitespace-nowrap',
                    typeScale.value.cls,
                  )}
                  style={{ columnGap: toRem(G.outMark) }}
                  {...presence(outId(k), gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                >
                  <span aria-hidden className={clsx('flex h-5 items-center', ink.muted)}>
                    ›
                  </span>
                  <span className={clsx('relative -mx-1 break-all px-1', ink.result, radius.chip.cls, isNew && surface.resultTint)}>{text}</span>
                </m.li>
              )
            })}
          </AnimatePresence>
          {out.length === 0 ? <li className={clsx('m-0 flex h-5 items-center p-0', typeScale.tag.cls, ink.muted)}>no output yet</li> : null}
        </ol>
      </div>
    </div>
  )
}
