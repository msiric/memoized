'use client'

import { useMemo, useRef } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { ink, radius, strokeWidth, surface, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import type { StageProps } from '../../shell/types'
import { H_CLS } from '../../shell/vars'
import { fade, r1, useFades } from '../../substrates/svg-motion'
import { sansWidth } from '../../substrates/text-metrics'
import { remHeights, toRem } from '../../substrates/units'
import { END_TEXT, G, OUT_TOP, slotLabel, slotTop, tagW, type SsrMetrics } from './layout'
import { BADGE_TEXT, CLICK_ID, OUTPUT_ID, SCREEN_ID, SLOTS, SLOT_BUTTON, SLOT_TITLE, chunkId, slotId, type SSRState, type Slot } from './model'

/**
 * ssr-stream renderer: state -> the wire, the screen, the badges.
 *
 * Two panels, each one svg drawn 1:1 and scaled down (never clipped) under
 * very large text. The wire lists each write's lines beside its time; a
 * write arrives as one glyph, fading in on the glyph beat, and the write
 * that arrived this step takes the neutral `changed` mark (H3 R2 Q9, never
 * lime); on Back it fades out the same way. The screen is a small page: the
 * Header bar and the two slots, each showing nothing, its fallback or its
 * content, with its boundary's badge on the right (the state in words,
 * never color alone, A7). A slot whose view changes drops the old view at
 * once and fades the new one in, both ways, so two texts never share the
 * cell (G1); a badge takes its new word with the step and the changed mark.
 * A click waiting on Helpful is a dashed tag beside the button; what the
 * handler logged lands on the third beat in the result amber.
 */

const panelCls = clsx('relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1', radius.row.cls, surface.panel, H_CLS)

/** A tag at its own origin: the panel fill, a 1 px `line` edge (or the changed mark), sans 12. */
function TagBody({ text, changed, dashed }: { text: string; changed?: boolean; dashed?: boolean }) {
  const w = tagW(text)
  return (
    <>
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={G.tag - 1}
        rx={radius.chip.px}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
        className={clsx(changed ? 'vz-ch' : 'vz-p vz-l', dashed && 'vz-d')}
      />
      <text x={r1(w / 2)} y={14} className="vz-12 vz-c font-sans">
        {text}
      </text>
    </>
  )
}

function SlotBody({ slot, state, y }: { slot: Slot; state: SSRState; y: number }) {
  const v = state.slots[slot].view
  if (v === 'none') return null
  if (v === 'fallback')
    return (
      <text x={G.slotPad} y={y + 14} className="vz-m vz-12 font-sans" data-slot-view="fallback">
        Loading {slot}
      </text>
    )
  const tx = G.slotPad + Math.ceil(sansWidth(SLOT_TITLE[slot], 12)) + 8
  return (
    <g data-slot-view="content">
      <text x={G.slotPad} y={y + 14} className="vz-12 font-sans">
        {SLOT_TITLE[slot]}
      </text>
      <g transform={`translate(${tx} ${y})`}>
        <TagBody text={SLOT_BUTTON[slot]} />
      </g>
    </g>
  )
}

export function SsrStage({ step, layout, motion: gate, label, index }: StageProps<SSRState>) {
  const metrics = layout.detail as SsrMetrics
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const root = useRef<HTMLDivElement>(null)
  const wireSvg = useRef<SVGSVGElement>(null)
  const screenSvg = useRef<SVGSVGElement>(null)
  useFlip(root, gate, step)
  useFades(wireSvg, gate, step)
  useFades(screenSvg, gate, step)

  // The state shown before this step (Back included), held for the whole step.
  const held = useRef<{ step: typeof step; from: SSRState; shown: SSRState }>({ step, from: state, shown: state })
  if (held.current.step !== step) held.current = { step, from: held.current.shown.mode === state.mode ? held.current.shown : state, shown: state }
  const from = held.current.from

  const W = metrics.wireDraw
  const S = metrics.screenDraw
  const writes = (s: SSRState) => s.chunks.map((c, k) => ({ ms: c.ms, k, lines: s.wire.filter((l) => l.chunk === k) }))
  const rowOf = (s: SSRState, k: number) => s.wire.findIndex((l) => l.chunk === k)

  const wireGroup = (s: SSRState, w: ReturnType<typeof writes>[number], ghost: boolean) => {
    const top = rowOf(s, w.k) * G.row
    const lit = !ghost && focus.has(chunkId(w.k))
    const enters = !ghost && w.k >= from.chunks.length
    return (
      <g
        key={ghost ? `ghost-${w.k}-${index}` : `w-${w.k}`}
        data-glyph={chunkId(w.k)}
        data-chunk={ghost ? undefined : w.k}
        data-ghost={ghost ? '' : undefined}
        data-focus={lit || undefined}
        data-fade={ghost ? fade('out', 'exit', 'glyph') : enters ? fade('in', 'enter', 'glyph') : undefined}
        style={ghost ? { opacity: 0 } : undefined}
      >
        {lit ? <rect x={1} y={top + 1} width={W.w - 2} height={w.lines.length * G.row - 2} rx={radius.chip.px} strokeWidth={strokeWidth.mark} className="vz-ch" /> : null}
        <text x={2} y={top + 12} className="vz-m vz-12 font-sans">
          {w.ms} ms
        </text>
        {w.lines.map((l, i) => (
          <text key={i} x={G.timeCol} y={top + i * G.row + 12} className="vz-u" data-wire-line={ghost ? undefined : l.text} xmlSpace="preserve">
            {l.text}
          </text>
        ))}
        {/* The response's end, on the last write's last row (inside its write, so it lands and leaves with it). */}
        {s.ended && w.k === s.chunks.length - 1 ? (
          <text data-wire-end={ghost ? undefined : ''} x={W.w - 4} y={top + (w.lines.length - 1) * G.row + 12} textAnchor="end" className="vz-m vz-12 font-sans">
            {END_TEXT}
          </text>
        ) : null}
      </g>
    )
  }

  return (
    <div
      ref={root}
      role="img"
      aria-label={label}
      className="relative flex h-full min-w-0 flex-col vz-wide:grid vz-wide:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)] vz-wide:items-start"
      style={{ gap: toRem(G.gap), columnGap: toRem(G.columnGap) }}
    >
      {/* The wire: each write's lines beside its time, newest last. */}
      <div data-viz-region="wire" className={panelCls} style={remHeights(metrics.wire, { gap: toRem(G.labelGap) })}>
        <div className="flex h-4 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className={clsx(typeScale.label.cls, ink.secondary)}>Wire</span>
          <span className={clsx(typeScale.tag.cls, ink.muted)}>{state.mode === 'stream' ? 'renderToPipeableStream' : 'renderToString'}</span>
        </div>
        <div className="flex min-h-0 shrink-0 items-start justify-start" style={{ height: toRem(W.h) }}>
          <svg
            ref={wireSvg}
            aria-hidden
            data-viz-part="wire"
            viewBox={`0 0 ${W.w} ${W.h}`}
            width="100%"
            className="vz-s !mx-0 block"
            style={{ maxWidth: toRem(W.w), height: toRem(W.h) }}
            fontSize={13}
          >
            {writes(state).map((w) => wireGroup(state, w, false))}
            {writes(from)
              .filter((w) => w.k >= state.chunks.length)
              .map((w) => wireGroup(from, w, true))}
          </svg>
        </div>
      </div>

      {/* The screen: Header, the two slots with their badges, the handler log. */}
      <div data-viz-region="screen" className={panelCls} style={remHeights(metrics.screen, { gap: toRem(G.labelGap) })}>
        <div className="flex h-4 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className={clsx(typeScale.label.cls, ink.secondary)}>Screen</span>
          <span data-at="" className={clsx('ml-auto', typeScale.meta.cls, ink.muted)}>
            {state.at}
          </span>
        </div>
        <div className="flex min-h-0 shrink-0 items-start justify-start" style={{ height: toRem(S.h) }}>
          <svg
            ref={screenSvg}
            aria-hidden
            data-viz-part="screen"
            viewBox={`0 0 ${S.w} ${S.h}`}
            width="100%"
            className="vz-s !mx-0 block"
            style={{ maxWidth: toRem(S.w), height: toRem(S.h) }}
            fontSize={13}
          >
            {/* The page: a dashed outline until the Header paints. */}
            {!state.painted ? (
              <rect data-screen-blank="" x={0.5} y={0.5} width={S.w - 1} height={G.header - 1} rx={radius.chip.px} strokeWidth={strokeWidth.outline} className="vz-hl vz-d" />
            ) : null}
            {state.painted || from.painted ? (
              <g
                key={state.painted ? 'header' : `header-ghost-${index}`}
                data-glyph={SCREEN_ID}
                data-focus={(state.painted && focus.has(SCREEN_ID)) || undefined}
                data-fade={state.painted ? (from.painted ? undefined : fade('in', 'enter', 'glyph')) : fade('out', 'exit', 'glyph')}
                style={state.painted ? undefined : { opacity: 0 }}
              >
                <rect x={0} y={0} width={S.w} height={G.header} rx={radius.chip.px} className="vz-p" />
                <text x={8} y={14} className="vz-12 font-sans">
                  Shop
                  <tspan className="vz-m" dx={8}>
                    Header
                  </tspan>
                </text>
              </g>
            ) : null}
            {SLOTS.map((s, k) => {
              const v = state.slots[s]
              const y = slotTop(k)
              const lit = focus.has(slotId(s))
              const bw = v.badge === 'none' ? 0 : tagW(BADGE_TEXT[v.badge])
              const bodyY = y + G.slot - 4 - G.tag
              const btnX = G.slotPad + Math.ceil(sansWidth(SLOT_TITLE[s], 12)) + 8
              const clickX = btnX + tagW(SLOT_BUTTON[s]) + 6
              const clickGhost = s === 'reviews' && !state.pendingClick && from.pendingClick
              return (
                <g key={s} data-slot={s} data-view={v.view} data-badge={v.badge} data-changed={lit || undefined}>
                  <rect x={0.5} y={y + 0.5} width={S.w - 1} height={G.slot - 1} rx={radius.row.px} className="vz-hl" />
                  <text x={G.slotPad} y={y + 14} className="vz-m vz-12 font-sans">
                    {slotLabel(s, state.dataMs[s])}
                  </text>
                  <g
                    key={`${s}-${v.view}`}
                    data-glyph={slotId(s)}
                    data-fade={from.slots[s].view !== v.view && v.view !== 'none' ? fade('in', 'enter', 'glyph') : undefined}
                  >
                    <SlotBody slot={s} state={state} y={bodyY} />
                  </g>
                  {s === 'reviews' && (state.pendingClick || clickGhost) ? (
                    <g
                      key={state.pendingClick ? 'click' : `click-ghost-${index}`}
                      data-glyph={CLICK_ID}
                      data-click={state.pendingClick ? '' : undefined}
                      data-fade={state.pendingClick ? (from.pendingClick ? undefined : fade('in', 'enter', 'glyph')) : fade('out', 'exit', 'glyph')}
                      style={state.pendingClick ? undefined : { opacity: 0 }}
                      transform={`translate(${clickX} ${bodyY})`}
                    >
                      <TagBody text="click" dashed />
                    </g>
                  ) : null}
                  {v.badge !== 'none' ? (
                    <g data-badge-text="" data-focus={lit || undefined} transform={`translate(${S.w - G.slotPad - bw} ${y + (G.slot - G.tag) / 2})`}>
                      <TagBody text={BADGE_TEXT[v.badge]} changed={lit} />
                    </g>
                  ) : null}
                </g>
              )
            })}
            {/* The handler log: what onClick printed, landing on the third beat (as console output). */}
            <g data-viz-region="console">
              <text x={0} y={OUT_TOP + 14} className="vz-m vz-12 font-sans">
                onClick
              </text>
              {state.output.length || from.output.length > state.output.length ? (
                <text
                  key={state.output.length ? `out-${state.output.length}` : `out-ghost-${index}`}
                  data-out={state.output.length ? 0 : undefined}
                  data-glyph={OUTPUT_ID}
                  data-focus={(state.output.length && focus.has(OUTPUT_ID)) || undefined}
                  data-fade={state.output.length ? (from.output.length < state.output.length ? fade('in', 'land', 'land') : undefined) : fade('out', 'land', 'land')}
                  style={state.output.length ? undefined : { opacity: 0 }}
                  x={Math.ceil(sansWidth('onClick', 12)) + 8}
                  y={OUT_TOP + 14}
                  className="vz-r"
                  xmlSpace="preserve"
                >
                  <tspan>› </tspan>
                  {(state.output.length ? state.output : from.output).join(', ')}
                </text>
              ) : null}
            </g>
          </svg>
        </div>
      </div>
    </div>
  )
}
