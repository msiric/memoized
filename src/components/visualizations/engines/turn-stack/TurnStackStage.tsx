'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useMemo, useRef, type CSSProperties } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { changed, ink, radius, strokeWidth, surface, svgInk, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { presence } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS, heights } from '../../shell/vars'
import { fade, useFades } from '../../substrates/svg-motion'
import { toRem } from '../../substrates/units'
import { COLUMN, COLUMN_LABEL, G, PLOT, at, chainName, outputRows, plotLabel, ruleText, turnArrow, type TurnStackMetrics } from './layout'
import { CHAIN_ID, OUTPUT_ID, TURN_ID, key, label, pointId, signed, stackOf, turnWord, type HullState, type Pt } from './model'

/**
 * turn-stack renderer (R4 convex hull): state -> plot, turn arrow, turn
 * column, heading.
 *
 * The plot is one svg on a faint lattice: the points never move, each with
 * its coordinates beside it. The current chain's stack is a polyline through
 * its points in stack order (its points filled); the finished lower chain
 * stays as a dashed line while the upper one is built. The step's turn test
 * is the `changed` connector (zinc-300 at 2.5 px, never lime) from `o`
 * through `a` to an arrowhead at the arriving point `p`, landing on the glyph
 * beat; a popped point is left as a dashed ring. Beside the plot the turn
 * column spells the test: `cross(o, a, p)`, the three points, the value with
 * its turn (left, right or straight) and what the loop does. Once the chains
 * are trimmed the hull is closed in the same connector, and the last step
 * puts the printed line in the column, broken after each point.
 */

type Role = 'stack' | 'popped' | 'arriving' | 'idle'

function roleOf(s: HullState, p: Pt, stack: ReadonlySet<string>): Role {
  const k = key(p)
  if (s.popped && key(s.popped) === k) return 'popped'
  if (s.p && key(s.p) === k && !s.turn?.pops) return stack.has(k) ? 'arriving' : 'idle'
  return stack.has(k) ? 'stack' : 'idle'
}

const pathOf = (g: TurnStackMetrics['plot'], pts: readonly Pt[], closed = false) =>
  pts.length < 2 ? '' : pts.map((p, i) => `${i ? 'L' : 'M'}${at(g, p).x} ${at(g, p).y}`).join('') + (closed ? 'Z' : '')

export function TurnStackStage({ step, codePane, layout, motion: gate, label: aria, index }: StageProps<HullState>) {
  const metrics = layout.detail as TurnStackMetrics
  const g = metrics.plot
  const state = step.state
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const svg = useRef<SVGSVGElement>(null)
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)
  useFades(svg, gate, step)

  const stack = stackOf(state)
  const onStack = new Set(stack.map(key))
  const t = state.turn
  const arrow = t ? turnArrow(at(g, t.a), at(g, t.p)) : null
  const out = state.output.join(' ')
  const chainLit = focus.has(CHAIN_ID)

  return (
    <div
      ref={root}
      className={clsx(
        'relative flex h-full flex-col',
        'vz-wide:grid vz-wide:items-center vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-wide:[grid-template-rows:minmax(0,1fr)] vz-col:[grid-template-columns:var(--vz-cols-xl)]',
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

      {/* The machine: the plot and the turn column. Its accessible name spells the chains, the test and the verdict. */}
      <div role="img" aria-label={aria} className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-start-1">
        <div
          data-viz-region="plot"
          className={clsx(
            'relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1',
            radius.row.cls,
            surface.panel,
            H_CLS,
          )}
          style={heights({ ...metrics.panel, col: metrics.panelCol }, { gap: toRem(G.labelGap) })}
        >
          <div className="flex h-4 min-w-0 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap">
            <span
              data-glyph={CHAIN_ID}
              data-chain={state.chain ?? 'none'}
              data-focus={chainLit || undefined}
              className={clsx(typeScale.label.cls, ink.secondary, radius.chip.cls, 'px-0.5', chainLit && changed.neutral)}
            >
              {chainName(state)}
            </span>
            <span data-rule className={clsx('ml-auto font-mono vz-tight:hidden', typeScale.meta.cls, ink.muted)}>
              {ruleText(state)}
            </span>
          </div>
          <div
            className="flex min-h-0 min-w-0 flex-1 items-center justify-center vz-wide:flex-col vz-col:flex-row"
            style={{ gap: toRem(G.split) }}
          >
            <div className="flex min-w-0 shrink items-center justify-center" style={{ height: toRem(g.height) }}>
              <svg
                ref={svg}
                aria-hidden
                data-viz-part="hull-plot"
                viewBox={`0 0 ${g.width} ${g.height}`}
                width="100%"
                data-viz-width={g.width}
                className="vz-s block"
                style={{ maxWidth: toRem(g.width), height: 'auto', maxHeight: toRem(g.height) }}
                fontSize={G.text}
              >
                {/* The lattice: one hairline per whole coordinate. */}
                <g data-lattice>
                  {Array.from({ length: g.max[0] - g.min[0] + 1 }, (_, i) => {
                    const x = at(g, [g.min[0] + i, g.min[1]]).x
                    return <path key={`x${i}`} d={`M${x} ${at(g, [0, g.max[1]]).y}V${at(g, [0, g.min[1]]).y}`} className="vz-hl" strokeWidth={strokeWidth.outline} />
                  })}
                  {Array.from({ length: g.max[1] - g.min[1] + 1 }, (_, i) => {
                    const y = at(g, [g.min[0], g.min[1] + i]).y
                    return <path key={`y${i}`} d={`M${at(g, [g.min[0], 0]).x} ${y}H${at(g, [g.max[0], 0]).x}`} className="vz-hl" strokeWidth={strokeWidth.outline} />
                  })}
                </g>
                {/* The finished lower chain, dashed, while the upper chain is built. */}
                {state.chain === 'upper' && state.lower.length > 1 ? (
                  <path data-done={state.lower.map(key).join(' ')} d={pathOf(g, state.lower)} className={clsx('vz-e vz-d', svgInk.line)} />
                ) : null}
                {/* The current stack (or the closed hull), through its points in stack order. */}
                {state.chain === 'hull' ? (
                  <g
                    key={`hull-${index}`}
                    data-hull={stack.map(key).join(' ')}
                    data-follows={CHAIN_ID}
                    data-fade={fade('in', 'enter', 'glyph')}
                    className={ink.secondary}
                    style={{ '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties}
                  >
                    <path d={pathOf(g, stack, true)} className="vz-e" />
                  </g>
                ) : stack.length > 1 ? (
                  <path data-stack={stack.map(key).join(' ')} d={pathOf(g, stack)} className={clsx('vz-e', svgInk.line)} />
                ) : null}
                {/* The turn test: o -> a -> p in the changed connector, landing on the glyph beat. */}
                {t && arrow ? (
                  <g
                    key={`turn-${index}`}
                    data-viz-part="turn"
                    data-turn-glyph={TURN_ID}
                    // It lands with the point it decides (the one popped, or the one pushed): one glyph, the point's.
                    data-follows={pointId(t.pops ? t.a : t.p)}
                    data-turn={`${key(t.o)} ${key(t.a)} ${key(t.p)}`}
                    data-cross={t.cross}
                    data-pops={t.pops || undefined}
                    data-fade={fade('in', 'enter', 'glyph')}
                    className={ink.secondary}
                    style={{ '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties}
                  >
                    <path d={`M${at(g, t.o).x} ${at(g, t.o).y}L${at(g, t.a).x} ${at(g, t.a).y}`} className="vz-e" />
                    {/* The arrow from a to the arriving point: the dp table's connector, an edge between two points. */}
                    <g data-edge="" data-from={pointId(t.a)} data-to={pointId(t.p)} className="vz-cm">
                      <path d={arrow.line} className="vz-e" />
                      <path d={arrow.head} className="vz-ah" />
                    </g>
                  </g>
                ) : null}
                {/* The points: filled on the stack, a changed ring for the one just pushed, a dashed ring for the one just popped. */}
                {state.points.map((p) => {
                  const c = at(g, p)
                  const role = roleOf(state, p, onStack)
                  const lit = focus.has(pointId(p))
                  return (
                    <g key={key(p)} data-node={pointId(p)} data-point={key(p)} data-role={role} data-changed={lit || undefined} className={svgInk.line}>
                      <circle
                        key={lit ? `lit-${index}` : 'rest'}
                        data-glyph={lit ? pointId(p) : undefined}
                        data-fade={lit ? fade('in', 'enter', 'glyph') : undefined}
                        cx={c.x}
                        cy={c.y}
                        r={PLOT.r}
                        strokeWidth={role === 'arriving' ? strokeWidth.mark : strokeWidth.outline}
                        className={role === 'stack' ? 'vz-nd' : role === 'arriving' ? 'vz-ch' : role === 'popped' ? 'vz-g vz-d' : 'vz-g'}
                      />
                    </g>
                  )
                })}
                <g data-labels className="vz-12">
                  {state.points.map((p) => {
                    const l = g.labels[key(p)]
                    const lit = focus.has(pointId(p)) || (t !== null && [t.o, t.a, t.p].some((q) => key(q) === key(p)))
                    return (
                      <text key={key(p)} data-label={key(p)} x={l.x} y={l.y} textAnchor={l.anchor} className={lit ? undefined : 'vz-m'}>
                        {plotLabel(p)}
                      </text>
                    )
                  })}
                </g>
              </svg>
            </div>
            {/* The turn column: the test spelled out, or what the program printed. */}
            <div
              data-viz-region="turn"
              className={clsx('flex shrink-0 flex-col justify-center font-mono', typeScale.meta.cls)}
              style={{ width: toRem(metrics.column), height: toRem(COLUMN.row * COLUMN.rows) }}
            >
              {out ? (
                <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
                  <m.div
                    key={`out:${gate.epoch}`}
                    data-viz-region="console"
                    className="flex flex-col"
                    {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                  >
                    <span className="flex whitespace-pre">
                      <span aria-hidden className={clsx('flex flex-col', ink.muted)}>
                        {outputRows(out).map((_, i) => (
                          <span key={i} className="flex h-4 items-center">
                            {i === 0 ? '› ' : '  '}
                          </span>
                        ))}
                      </span>
                      {/* The printed line itself, broken after each point: its text is exactly what the program printed. */}
                      <span data-out={0} data-focus={focus.has(OUTPUT_ID) || undefined} className="flex flex-col">
                        {outputRows(out).map((r, i) => (
                          <span key={i} className={clsx('flex h-4 items-center self-start', ink.result, radius.chip.cls, focus.has(OUTPUT_ID) && surface.resultTint)}>
                            {r}
                          </span>
                        ))}
                      </span>
                    </span>
                  </m.div>
                </AnimatePresence>
              ) : (
                <div data-turn-column className="flex flex-col">
                  <span className={clsx('flex h-4 items-center', ink.muted)}>{COLUMN_LABEL}</span>
                  {(['o', 'a', 'p'] as const).map((n) => {
                    const v = n === 'p' ? (t?.p ?? state.p) : t?.[n]
                    return (
                      <span key={n} data-term={n} className="flex h-4 items-center gap-2 whitespace-pre">
                        <span className={ink.muted}>{n}</span>
                        <span className={v ? ink.base : ink.muted}>{v ? label(v) : '–'}</span>
                      </span>
                    )
                  })}
                  <span data-value={t ? t.cross : undefined} className="flex h-4 items-center gap-2 whitespace-pre">
                    <span className={clsx(t ? ink.strong : ink.muted, 'font-semibold')}>{t ? signed(t.cross) : '–'}</span>
                    {t ? <span className={ink.secondary}>{turnWord(t.cross)}</span> : null}
                  </span>
                  <span data-verdict={t ? (t.pops ? 'pop' : 'keep') : undefined} className="flex h-4 items-center whitespace-pre">
                    {t ? (
                      <span className={clsx(radius.chip.cls, 'px-0.5', ink.base, focus.has(TURN_ID) && changed.neutral)}>
                        {t.pops ? 'pop' : 'keep'} {label(t.a)}
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
