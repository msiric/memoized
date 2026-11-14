'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useLayoutEffect, useMemo, useRef, type CSSProperties, type RefObject } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import { finishMoves, moveSpringToken, springCurve } from '../../shell/flip'
import { animates, beatDelay, presence, type MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { toRem } from '../../substrates/units'
import { SIZE, linkShape, tagBox, type ListGeometry } from './geometry'
import { G, type LinkedListMetrics } from './layout'
import { NULL_ID, OUTPUT_ID, linkId, nodeId, pointerId, type LLState } from './model'

/**
 * Pointer-rewiring renderer (R4 shared visual 3): state -> one svg.
 *
 * Nodes never move: what a step changes is an arrow (a node's `next`) or a
 * tag (a pointer variable). An arrow that changes target cross-fades in
 * place on the step's glyph beat, its old shape out as the new one comes in
 * (one glyph, `link-i`); a tag slides along its own lane on the `move`
 * spring, so it never passes over another tag. Both are the step's
 * `changed` glyphs (H3 R2 Q9, never lime): the arrow at the 2.5 px weight in
 * zinc-300, the tag with its edge doubled on the white/5 tint. Back mirrors
 * Next (D8): the tag slides back, the arrow fades back.
 *
 * The svg is drawn at 288 user units, 1:1 at the default text size; under
 * very large text it scales down inside its fixed height (the stage never
 * reflows), where each unit is more than a pixel. The machine's accessible
 * name (`role="img"`) spells every link and pointer.
 */

const MOVE_ID = 'viz-move'
const r1 = (n: number) => Math.round(n * 10) / 10

type Pos = { x: number; y: number }

/** The `move` spring (flip.ts) for a tag's slide between two lane positions, on the glyph beat. */
function useTagMoves(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown, positions: Map<string, Pos>) {
  const last = useRef(positions)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (gate.instant) finishMoves(el as unknown as HTMLElement)
    const canAnimate = !gate.instant && !gate.reduce && typeof Element.prototype.animate === 'function'
    const curve = springCurve(moveSpringToken())
    for (const node of el.querySelectorAll<SVGGElement>('[data-tag]')) {
      const id = node.dataset.glyph!
      const to = positions.get(id)
      let from = last.current.get(id)
      const running = node.getAnimations?.().find((a) => a.id === MOVE_ID)
      if (running) {
        // A slide still in flight continues from where the tag is now.
        const tf = getComputedStyle(node).transform
        if (tf && tf !== 'none' && typeof DOMMatrixReadOnly !== 'undefined') {
          const mx = new DOMMatrixReadOnly(tf)
          from = { x: mx.m41, y: mx.m42 }
        }
        running.cancel()
      }
      if (!to || !from || (Math.abs(to.x - from.x) < 0.5 && Math.abs(to.y - from.y) < 0.5)) continue
      if (!canAnimate || !animates(gate, id)) continue
      const frames = curve.progress.map((p, i) => ({
        offset: curve.offsets[i],
        transform: `translate(${r1(from!.x + (to.x - from!.x) * p)}px, ${r1(from!.y + (to.y - from!.y) * p)}px)`,
      }))
      const anim = node.animate(frames, {
        duration: curve.duration,
        delay: beatDelay(gate, 'glyph') * 1000,
        easing: 'linear',
        // During the first beat the tag already waits where it was.
        fill: 'backwards',
      })
      anim.id = MOVE_ID
    }
    last.current = positions
    // Once per step (and per instant epoch), not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}

function Node({ g, i, label }: { g: ListGeometry; i: number; label: string }) {
  const x = g.cols[i] - SIZE.node / 2
  return (
    <g data-node={nodeId(i)}>
      <rect
        x={r1(x) + 0.5}
        y={g.rowTop + 0.5}
        width={SIZE.node - 1}
        height={SIZE.node - 1}
        rx={radius.glyph.px}
        strokeWidth={strokeWidth.outline}
        className="vz-g"
      />
      <text x={r1(g.cols[i])} y={r1(g.mid + 4.5)} className="vz-c">
        {label}
      </text>
    </g>
  )
}

export function LinkedListStage({ step, codePane, layout, motion: gate, label }: StageProps<LLState>) {
  const metrics = layout.detail as LinkedListMetrics
  const g = metrics.geometry
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const svg = useRef<SVGSVGElement>(null)

  const tags = state.pointers.map((p) => ({ ...p, id: pointerId(p.name), box: tagBox(g, p.name, p.at) }))
  const positions = useMemo(
    () => new Map(tags.map((t) => [t.id, { x: t.box.x, y: t.box.y }])),
    // The boxes are a function of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  )
  useTagMoves(svg, gate, step, positions)
  const custom = { gate }
  const out = state.output.join(' ')

  return (
    <div
      className={clsx(
        'relative flex h-full flex-col',
        'vz-wide:grid vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-col:[grid-template-columns:var(--vz-cols-xl)]',
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
      <div className="flex min-w-0 flex-col vz-wide:[&>*]:!w-full vz-wide:[&>*]:self-stretch">{codePane}</div>

      {/* The machine: every link and pointer in its accessible name. */}
      <div
        role="img"
        aria-label={label}
        data-viz-region="list"
        className="flex min-h-0 min-w-0 flex-1 items-center justify-center"
      >
        <svg
          ref={svg}
          aria-hidden
          viewBox={`0 0 ${g.width} ${g.height}`}
          width="100%"
          data-viz-width={g.width}
          className="vz-s block"
          style={{ maxWidth: toRem(g.width), height: toRem(g.height) }}
          fontSize={SIZE.value}
        >
          {/* The null column: where a pointer holding null sits. */}
          <text data-node={NULL_ID} x={r1(g.nullX)} y={r1(g.mid + 4)} className="vz-m vz-12 vz-c">
            null
          </text>
          {state.nodes.map((n, i) => (
            <Node key={n.id} g={g} i={i} label={n.label} />
          ))}

          {/* Arrows: one glyph per node; a new target cross-fades in place on the glyph beat. */}
          <AnimatePresence key={gate.epoch} initial={false} custom={custom}>
            {state.next.map((to, i) => {
              const id = linkId(i)
              const shape = linkShape(g, i, to)
              const lit = focus.has(id)
              return (
                <m.g
                  key={`${id}>${to}`}
                  data-glyph={id}
                  data-edge={id}
                  data-from={nodeId(i)}
                  data-to={to === null ? NULL_ID : nodeId(to)}
                  className={lit ? 'vz-cm' : undefined}
                  style={lit ? ({ '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties) : undefined}
                  {...presence(id, gate, { from: {}, to: {} })}
                >
                  <path d={shape.d} className="vz-e" />
                  {shape.head ? <path d={shape.head} className="vz-ah" /> : null}
                </m.g>
              )
            })}
          </AnimatePresence>

          {/* Pointer tags, one lane each: a tag slides to its new node on the glyph beat. */}
          <AnimatePresence key={`t${gate.epoch}`} initial={false} custom={custom}>
            {tags.map((t) => {
              const lit = focus.has(t.id)
              return (
                <m.g key={t.id} {...presence(t.id, gate, { from: {}, to: {} })}>
                  <g
                    data-tag=""
                    data-glyph={t.id}
                    data-pointer={t.name}
                    data-at={t.at === null ? NULL_ID : nodeId(t.at)}
                    transform={`translate(${t.box.x} ${t.box.y})`}
                  >
                    <rect
                      x={0.5}
                      y={0.5}
                      width={t.box.w - 1}
                      height={t.box.h - 1}
                      rx={radius.chip.px}
                      strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
                      className={lit ? 'vz-ch' : 'vz-p vz-l'}
                    />
                    <text x={r1(t.box.w / 2)} y={r1(SIZE.tag / 2 + 4)} className="vz-12 vz-c">
                      {t.name}
                    </text>
                  </g>
                </m.g>
              )
            })}
          </AnimatePresence>

          {g.consoleTop !== null ? (
            <g data-viz-part="console">
              <text x={0} y={r1(g.consoleTop + 14)} className="vz-m vz-12 font-sans">
                Console
              </text>
              <AnimatePresence key={`o${gate.epoch}`} initial={false} custom={custom} mode="popLayout">
                {out ? (
                  <m.text
                    key={out}
                    data-glyph={OUTPUT_ID}
                    x={56}
                    y={r1(g.consoleTop + 14)}
                    className="vz-r"
                    {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                  >
                    <tspan>› </tspan>
                    {out}
                  </m.text>
                ) : (
                  <m.text
                    key="none"
                    x={56}
                    y={r1(g.consoleTop + 14)}
                    className="vz-m vz-12 font-sans"
                    initial={gate.instant ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                  >
                    no output yet
                  </m.text>
                )}
              </AnimatePresence>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  )
}
