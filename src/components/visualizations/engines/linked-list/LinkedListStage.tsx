'use client'

import { useLayoutEffect, useMemo, useRef, type CSSProperties, type RefObject } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { motion as motionTokens, strokeWidth, type MotionTokenName } from '../../primitives/tokens-v3'
import { finishMoves, moveSpringToken, springCurve } from '../../shell/flip'
import { animates, beatDelay, transitionFor, type MotionGate } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { toRem } from '../../substrates/units'
import { SIZE, linkShape, tagBox } from './geometry'
import { G, type LinkedListMetrics } from './layout'
import { Arrow, NodeBox, TagBody, r1 } from './glyphs'
import { NULL_ID, OUTPUT_ID, linkId, nodeId, pointerId, type LLState } from './model'

/**
 * Pointer-rewiring renderer (R4 shared visual 3): state -> one svg.
 *
 * Nodes never move: what a step changes is an arrow (a node's `next`) or a
 * tag (a pointer variable). An arrow that changes target cross-fades in
 * place on the step's glyph beat, its old shape out as the new one comes in
 * (one glyph, `link-i`); a tag slides along its own lane on the `move`
 * spring, so it never passes over another tag. Every fade is a Web
 * Animation on the motion tokens (framer animates svg opacity in script,
 * which an instant command or a frozen frame cannot land): what leaves is
 * drawn once more, as it was on the step the reader came from, and fades
 * out (`data-fade="out …"`, at rest invisible); what arrives fades in.
 * Both are the step's
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

const FADE_ID = 'viz-fade'

/** One fade on a token: `in|out`, the token, its beat and an extra delay (ms). */
const fade = (dir: 'in' | 'out', token: MotionTokenName, beat: 'glyph' | 'land', extraMs = 0) =>
  `${dir} ${token} ${beat} ${extraMs}`

/** The `land` token's length (ms) on this render: "no output yet" waits for a leaving output to finish. */
function landMs(gate: MotionGate): number {
  const t = motionTokens.land[gate.reduce ? 'reduced' : 'full']
  return t.type === 'tween' ? t.duration * 1000 : 0
}

/** Plays every `[data-fade]` of this step on its token and beat; instant renders and glyphs past the budget land. */
function useFades(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]'))
      for (const a of node.getAnimations?.() ?? []) if (a.id === FADE_ID) a.finish()
    if (gate.instant || typeof Element.prototype.animate !== 'function') return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]')) {
      const id = node.dataset.glyph
      if (id && !animates(gate, id)) continue
      const [dir, token, beat, extra] = node.dataset.fade!.split(' ')
      const t = transitionFor(token as MotionTokenName, gate) as { duration?: number; ease?: number[] | string }
      if (!t.duration) continue
      const anim = node.animate(dir === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
        duration: t.duration * 1000,
        easing: Array.isArray(t.ease) ? `cubic-bezier(${t.ease.join(', ')})` : 'linear',
        delay: beatDelay(gate, beat as 'glyph' | 'land') * 1000 + Number(extra || 0),
        // Before its beat a leaving glyph is still there and an arriving one not yet.
        fill: 'backwards',
      })
      anim.id = FADE_ID
    }
    // Once per step (and per instant epoch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}

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

export function LinkedListStage({ index, step, previous, codePane, layout, motion: gate, label }: StageProps<LLState>) {
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
  useFades(svg, gate, step)
  const out = state.output.join(' ')
  // What the step changed, against the step the reader came from (none on a first render).
  const was = previous?.state
  const prevOut = was ? was.output.join(' ') : out
  const prevTags = new Map((was?.pointers ?? state.pointers).map((p) => [p.name, p.at]))
  const nowTags = new Set(state.pointers.map((p) => p.name))
  const leftTags = (was?.pointers ?? []).filter((p) => !nowTags.has(p.name))
  const changedLinks = was ? state.next.flatMap((to, i) => (was.next[i] !== to ? [i] : [])) : []

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
            <NodeBox key={n.id} id={n.id} x={g.cols[i] - SIZE.node / 2} y={g.rowTop} label={n.label} />
          ))}

          {/* Arrows: one glyph per node. A new target fades in on the glyph beat while the old arrow,
              drawn once more as it was, fades out in place. */}
          {changedLinks.map((i) => {
            const shape = linkShape(g, i, was!.next[i])
            return (
              <g key={`ghost-link-${i}-${index}`} data-glyph={linkId(i)} data-ghost="" data-fade={fade('out', 'exit', 'glyph')} style={{ opacity: 0 }}>
                <Arrow d={shape.d} head={shape.head} />
              </g>
            )
          })}
          {state.next.map((to, i) => {
            const id = linkId(i)
            const shape = linkShape(g, i, to)
            const lit = focus.has(id)
            return (
              <g
                key={`${id}>${to}`}
                data-glyph={id}
                // A null stub is not an arrow between boxes: it says so (`data-stub`), and the edge checks skip it.
                {...(to === null ? { 'data-stub': id } : { 'data-edge': id })}
                data-from={nodeId(i)}
                data-to={to === null ? NULL_ID : nodeId(to)}
                data-fade={changedLinks.includes(i) ? fade('in', 'enter', 'glyph') : undefined}
                className={lit ? 'vz-cm' : undefined}
                style={lit ? ({ '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties) : undefined}
              >
                <Arrow d={shape.d} head={shape.head} />
              </g>
            )
          })}

          {/* Pointer tags, one lane each: a tag slides to its new node on the glyph beat; a new one fades
              in, one going out of scope fades out where it was. */}
          {leftTags.map((p) => {
            const box = tagBox(g, p.name, p.at)
            return (
              <g
                key={`ghost-tag-${p.name}-${index}`}
                data-glyph={pointerId(p.name)}
                data-ghost=""
                data-fade={fade('out', 'exit', 'glyph')}
                style={{ opacity: 0 }}
                transform={`translate(${box.x} ${box.y})`}
              >
                <TagBody name={p.name} w={box.w} />
              </g>
            )
          })}
          {tags.map((t) => (
            <g
              key={t.id}
              data-tag=""
              data-glyph={t.id}
              data-pointer={t.name}
              data-at={t.at === null ? NULL_ID : nodeId(t.at)}
              data-fade={was && !prevTags.has(t.name) ? fade('in', 'enter', 'glyph') : undefined}
              transform={`translate(${t.box.x} ${t.box.y})`}
            >
              <TagBody name={t.name} w={t.box.w} changed={focus.has(t.id)} />
            </g>
          ))}

          {g.consoleTop !== null ? (
            <g data-viz-part="console">
              <text x={0} y={r1(g.consoleTop + 14)} className="vz-m vz-12 font-sans">
                Console
              </text>
              {/* The output lands on the third beat (opacity only); "no output yet" comes back only once a
                  leaving output has faded, so the two never overlap (G1). */}
              {prevOut && !out ? (
                <text
                  key={`ghost-out-${index}`}
                  data-glyph={OUTPUT_ID}
                  data-ghost=""
                  data-fade={fade('out', 'land', 'land')}
                  style={{ opacity: 0 }}
                  x={56}
                  y={r1(g.consoleTop + 14)}
                  className="vz-r"
                >
                  <tspan>› </tspan>
                  {prevOut}
                </text>
              ) : null}
              {out ? (
                <text
                  key="out"
                  data-glyph={OUTPUT_ID}
                  data-fade={out !== prevOut ? fade('in', 'land', 'land') : undefined}
                  x={56}
                  y={r1(g.consoleTop + 14)}
                  className="vz-r"
                >
                  <tspan>› </tspan>
                  {out}
                </text>
              ) : (
                <text
                  key="none"
                  data-fade={prevOut ? fade('in', 'enter', 'land', landMs(gate)) : undefined}
                  x={56}
                  y={r1(g.consoleTop + 14)}
                  className="vz-m vz-12 font-sans"
                >
                  no output yet
                </text>
              )}
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  )
}
