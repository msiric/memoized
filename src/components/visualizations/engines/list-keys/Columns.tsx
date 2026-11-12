'use client'

import { m } from 'framer-motion'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buttonClasses } from '../../primitives/Button'
import { cn as clsx } from '../../primitives/cn'
import { Tag as Badge } from '../../primitives/Tag'
import {
  DASH,
  focusRingHas,
  ink,
  now,
  radius,
  stroke,
  strokeWidth,
  surface,
  svgInk,
  transitionCls,
  type as typeScale,
} from '../../primitives/tokens-v3'
import { transitionFor, type MotionGate } from '../../shell/motion'
import { CARD, COLUMNS, COLUMNS_HEIGHT, rowTop } from './layout'
import type { ExploreAction, ExploreState } from './machine'
import {
  BEFORE,
  BEFORE_INSTANCES,
  ITEMS,
  afterRows,
  keyText,
  trackedRow,
  unmountedRows,
  type AfterRow,
} from './model'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'

/**
 * The stage's Before and After columns with the match lines between them
 * (spec §2.2 "Match line", §8.3).
 *
 * - A card is one instance (a fiber with its DOM node and state). Its spine
 *   names the instance; a mounted instance's spine reads `new` and its card
 *   is dashed. An unmounted instance is dashed and tagged `× unmounted`.
 * - Match lines: solid = reused, a dashed stub = mounted, a × stub = unmounted.
 *   The state chip (☑ or the count) rides on its line.
 * - The row now showing the tracked check carries the `now` emphasis inside
 *   the card (D5). A row that shows another item's state, or lost its own,
 *   carries an in-row badge (× or ✓, D17) with the words for assistive tech
 *   and on hover, so the mismatch never depends on color (A7).
 */

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

const COLS = `minmax(0,${COLUMNS.cardMax}px) minmax(${COLUMNS.linesNarrow}px,1fr) minmax(0,${COLUMNS.cardMax}px)`
const center = (i: number) => rowTop(i) + CARD.height / 2

/** Wrapper geometry: a box (label, then the Counter card), then the +1 button. */
const BOX = { pad: 4, label: 16, gap: 4, bottom: 8, border: 1 } as const
const WRAP_LABEL_Y = rowTop(0) + BOX.border + BOX.pad + BOX.label / 2
const WRAP_COUNTER_Y =
  rowTop(0) + BOX.border + BOX.pad + BOX.label + BOX.gap + CARD.height / 2

export type ColumnsProps = {
  s: ExploreState
  interactive: boolean
  gate: MotionGate
  /** Animate the reveal (lines draw, the state chip moves). */
  play: boolean
  dispatch: (a: ExploreAction) => void
}

export function Columns({
  s,
  interactive,
  gate,
  play,
  dispatch,
}: ColumnsProps) {
  const linesRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState<number>(COLUMNS.linesNarrow)
  useIsoLayoutEffect(() => {
    const el = linesRef.current
    if (!el) return
    const measure = () => setW(Math.round(el.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      data-viz-region="columns"
      className="relative grid min-w-0"
      style={{ height: COLUMNS_HEIGHT, gridTemplateColumns: COLS }}
    >
      {s.scene === 'list' ? (
        <ListColumns s={s} interactive={interactive} dispatch={dispatch} />
      ) : (
        <WrapperColumns s={s} interactive={interactive} dispatch={dispatch} />
      )}
      <div
        ref={linesRef}
        aria-hidden
        className="relative col-start-2 row-start-1 min-w-0"
      >
        {s.phase === 'reveal' ? (
          <Lines
            key={`${s.reveals}:${gate.epoch}`}
            s={s}
            w={w}
            gate={gate}
            play={play}
          />
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function ColumnLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className={clsx('m-0 h-4', typeScale.label.cls, ink.secondary)}
      style={{ marginBottom: COLUMNS.labelGap }}
    >
      {children}
    </p>
  )
}

function Spine({
  label,
  mounted,
  dashed,
}: {
  label: string
  mounted?: boolean
  dashed?: boolean
}) {
  return (
    <span
      aria-hidden
      className={clsx(
        'flex w-7 shrink-0 flex-col items-center justify-center whitespace-nowrap border-r',
        typeScale.glyphHeader.cls,
        dashed ? 'border-dashed border-zinc-500' : stroke.hairline,
        label === '?' ? ink.muted : ink.base,
      )}
    >
      {label}
      {mounted ? (
        <Badge tone="now" className="h-4 bg-transparent px-0">
          new
        </Badge>
      ) : null}
    </span>
  )
}

const CHECK_PATH = 'M3.5 8.5 6.5 11.5 12.5 5'

/** A drawn (not interactive) checkbox: filled with a ✓ when checked, `?` while unknown. */
function CheckGlyph({ state }: { state: boolean | '?' }) {
  if (state === '?')
    return (
      <span
        aria-hidden
        className={clsx(
          'flex h-4 w-4 shrink-0 items-center justify-center border border-dashed border-zinc-500',
          radius.chip.cls,
          typeScale.meta.cls,
          ink.muted,
        )}
      >
        ?
      </span>
    )
  return (
    <span
      aria-hidden
      className={clsx(
        'flex h-4 w-4 shrink-0 items-center justify-center border',
        radius.chip.cls,
        state
          ? 'border-zinc-100 bg-zinc-100 print:border-zinc-900 print:bg-zinc-900'
          : 'border-zinc-400',
      )}
    >
      {state ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className="text-zinc-900 print:text-white"
        >
          <path
            d={CHECK_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}

/**
 * An in-row status badge (D17): one glyph, in flow at the end of the card's
 * key line, never on the border. The words travel as the accessible name and
 * the tooltip.
 */
function StatusBadge({ tone, words }: { tone: 'removed' | 'kept'; words: string }) {
  return (
    <Badge tone={tone === 'removed' ? 'removed' : 'neutral'} className="ml-auto w-5 justify-center px-0">
      <span aria-hidden title={words}>
        {tone === 'removed' ? '×' : '✓'}
      </span>
      <span className="sr-only">{words}</span>
    </Badge>
  )
}

/** A word tag in a wrapper box's header line (in flow, D17). */
function HeaderTag({ tone, children }: { tone: 'kept' | 'now' | 'removed'; children: ReactNode }) {
  return (
    <Badge tone={tone === 'kept' ? 'neutral' : tone} className="h-4 bg-transparent px-0">
      {children}
    </Badge>
  )
}

/** Cards are glyphs: zinc-800 fill, 8 px corners, 1 px `line` outline (D1, drift C10). */
const cardCls = clsx('relative flex min-w-0 overflow-visible border', radius.glyph.cls, surface.glyph)
const cardStyle = { height: CARD.height }

const STATUS_TEXT: Record<NonNullable<AfterRow['status']>, string> = {
  foreign: 'not its check',
  lost: 'lost its check',
  kept: 'kept its check',
}

function ListColumns({
  s,
  interactive,
  dispatch,
}: {
  s: ExploreState
  interactive: boolean
  dispatch: (a: ExploreAction) => void
}) {
  const action = s.listAction
  const outcome = action ? LIST_OUTCOMES[`${s.key}/${action}`] : null
  const rows =
    action && outcome ? afterRows(s.key, action, outcome, s.checks) : []
  const gone = outcome && s.phase === 'reveal' ? unmountedRows(outcome) : []
  const tracked = trackedRow(s.checks)
  const revealed = s.phase === 'reveal'
  const destination =
    revealed && tracked !== null
      ? rows.findIndex((r) => r.from === tracked)
      : -1

  return (
    <>
      <div className="col-start-1 row-start-1 min-w-0" data-viz-part="before">
        <ColumnLabel>Before</ColumnLabel>
        <ul
          className="m-0 flex list-none flex-col p-0"
          style={{ gap: CARD.gap }}
          aria-label="Before: check rows to give them state"
        >
          {BEFORE.map((id, i) => {
            const item = id as 'milk' | 'dog'
            const isGone = gone.includes(i as 0 | 1)
            // The tracked check was lost: its unmounted instance is the one highlight.
            const isLostFocus = revealed && tracked === i && destination === -1
            const key = keyText(s.key, id, i, 'before')
            return (
              <li
                key={id}
                className="m-0 p-0"
                data-row={`before-${i}`}
                data-focus={isLostFocus || undefined}
              >
                <label
                  className={clsx(
                    cardCls,
                    'cursor-pointer',
                    focusRingHas,
                    isGone ? clsx('border-dashed', stroke.removed) : stroke.line,
                    isLostFocus && now.glyph,
                    !interactive && 'cursor-default',
                  )}
                  style={cardStyle}
                >
                  <Spine label={BEFORE_INSTANCES[i]} dashed={isGone} />
                  <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1.5 xs:px-2">
                    <span className="flex min-w-0 items-center gap-1.5 xs:gap-2">
                      <span className="relative flex h-4 w-4 shrink-0">
                        <input
                          type="checkbox"
                          data-viz-focus={`check-${id}`}
                          checked={s.checks[item]}
                          aria-disabled={!interactive || undefined}
                          tabIndex={interactive ? 0 : -1}
                          onChange={() =>
                            interactive && dispatch({ type: 'check', item })
                          }
                          aria-label={`${ITEMS[id].text}, instance ${BEFORE_INSTANCES[i]}, key ${key}`}
                          className={clsx(
                            'peer m-0 h-4 w-4 cursor-[inherit] appearance-none rounded border border-zinc-400 bg-transparent outline-none',
                            transitionCls.feedback,
                            'checked:border-zinc-100 checked:bg-zinc-100 print:checked:border-zinc-900 print:checked:bg-zinc-900',
                          )}
                        />
                        <svg
                          aria-hidden
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          className="pointer-events-none absolute inset-0 hidden text-zinc-900 peer-checked:block print:text-white"
                        >
                          <path
                            d={CHECK_PATH}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className={clsx('min-w-0 truncate', typeScale.item.cls, ink.base)}>
                        {ITEMS[id].text}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className={clsx('truncate', typeScale.meta.cls, ink.muted)}>{`key=${key}`}</span>
                      {isGone ? <StatusBadge tone="removed" words="unmounted" /> : null}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="col-start-3 row-start-1 min-w-0" data-viz-part="after">
        <ColumnLabel>After</ColumnLabel>
        {s.phase === 'pick' || !action ? (
          <Placeholder>Pick an action</Placeholder>
        ) : (
          <ul
            className="m-0 flex list-none flex-col p-0"
            style={{ gap: CARD.gap }}
            aria-label="After"
          >
            {rows.map((r, i) => {
              const mounted = r.from === null
              const isDest = i === destination
              const describe = revealed
                ? `${ITEMS[r.item].text}, ${r.checked ? 'checked' : 'not checked'}, ${
                    mounted
                      ? `new instance ${r.instance}`
                      : `instance ${r.instance} reused from ${ITEMS[BEFORE[r.from!]].text}`
                  }${r.status ? `, ${STATUS_TEXT[r.status]}` : ''}`
                : `${ITEMS[r.item].text}, state unknown until you predict`
              return (
                <li
                  key={`${r.item}`}
                  data-row={`after-${i}`}
                  data-instance={revealed ? r.instance : undefined}
                  data-checked={revealed ? String(r.checked) : undefined}
                  data-status={revealed ? (r.status ?? '') : undefined}
                  data-focus={isDest || undefined}
                  className={clsx(
                    cardCls,
                    'm-0 p-0',
                    revealed && mounted ? 'border-dashed border-zinc-500' : stroke.line,
                    isDest && now.glyph,
                  )}
                  style={cardStyle}
                >
                  <span className="sr-only">{describe}</span>
                  <Spine
                    label={revealed ? r.instance : '?'}
                    mounted={revealed && mounted}
                    dashed={revealed && mounted}
                  />
                  <span
                    aria-hidden
                    className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1.5 xs:px-2"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 xs:gap-2">
                      <CheckGlyph state={revealed ? r.checked : '?'} />
                      <span className={clsx('min-w-0 truncate', typeScale.item.cls, ink.base)}>
                        {ITEMS[r.item].text}
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className={clsx('truncate', typeScale.meta.cls, ink.muted)}>{`key=${r.key}`}</span>
                      {revealed && r.status ? (
                        <StatusBadge tone={r.status === 'kept' ? 'kept' : 'removed'} words={STATUS_TEXT[r.status]} />
                      ) : null}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-center border border-dashed px-2 text-center',
        radius.glyph.cls,
        stroke.hairline,
        typeScale.item.cls,
        ink.muted,
      )}
      style={{ height: COLUMNS_HEIGHT - COLUMNS.label - COLUMNS.labelGap }}
    >
      {children}
    </div>
  )
}

function WrapperBox({
  tag,
  dashed,
  removed,
  children,
  badge,
}: {
  tag: string
  dashed?: boolean
  removed?: boolean
  children: ReactNode
  badge?: ReactNode
}) {
  return (
    <div
      className={clsx(
        'relative border px-2',
        radius.glyph.cls,
        removed ? clsx('border-dashed', stroke.removed) : dashed ? 'border-dashed border-zinc-500' : stroke.line,
      )}
      style={{ paddingTop: BOX.pad, paddingBottom: BOX.bottom }}
    >
      <p
        className={clsx('m-0 flex h-4 items-center justify-between gap-2', typeScale.meta.cls, ink.secondary)}
        style={{ marginBottom: BOX.gap }}
      >
        <span className="min-w-0 truncate">{tag}</span>
        {badge}
      </p>
      {children}
    </div>
  )
}

function CounterCard({
  instance,
  count,
  mounted,
  focus,
}: {
  instance: string
  count: string
  mounted?: boolean
  focus?: boolean
}) {
  return (
    <div
      data-viz-part="counter"
      data-focus={focus || undefined}
      className={clsx(
        cardCls,
        mounted ? 'border-dashed border-zinc-500' : stroke.line,
        focus && now.glyph,
      )}
      style={cardStyle}
    >
      <Spine label={instance} mounted={mounted} dashed={mounted} />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1.5 xs:px-2">
        <span className={clsx('truncate', typeScale.item.cls, ink.base)}>Counter</span>
        <span className={clsx('truncate', typeScale.meta.cls, ink.secondary)}>
          {count}
        </span>
      </span>
    </div>
  )
}

function WrapperColumns({
  s,
  interactive,
  dispatch,
}: {
  s: ExploreState
  interactive: boolean
  dispatch: (a: ExploreAction) => void
}) {
  const action = s.wrapperAction
  const revealed = s.phase === 'reveal'
  const o = action ? WRAPPER_OUTCOMES[action] : null
  const afterTag = action === 'type' ? '<span>' : '<div>'
  const lost = revealed && o && !o.counterReused
  return (
    <>
      <div className="col-start-1 row-start-1 min-w-0" data-viz-part="before">
        <ColumnLabel>Before</ColumnLabel>
        <WrapperBox
          tag="<div>"
          removed={Boolean(lost)}
          badge={lost ? <HeaderTag tone="removed">× unmounted</HeaderTag> : null}
        >
          <CounterCard instance="A" count={`count ${s.count}`} />
        </WrapperBox>
        <button
          type="button"
          data-viz-focus="increment"
          aria-label={`Click Counter: count ${s.count}, add 1`}
          aria-disabled={!interactive || undefined}
          tabIndex={interactive ? 0 : -1}
          onClick={() => interactive && dispatch({ type: 'increment' })}
          className={clsx(buttonClasses({ variant: 'secondary', unavailable: !interactive }), 'mt-2 w-full')}
        >
          Add 1
        </button>
      </div>
      <div className="col-start-3 row-start-1 min-w-0" data-viz-part="after">
        <ColumnLabel>After</ColumnLabel>
        {s.phase === 'pick' || !action || !o ? (
          <Placeholder>Pick a change</Placeholder>
        ) : (
          <div
            data-instance={revealed ? (o.counterReused ? 'A' : 'B') : undefined}
            data-count={
              revealed ? String(o.counterReused ? s.count : 0) : undefined
            }
          >
            <span className="sr-only">
              {revealed
                ? o.counterReused
                  ? `The same <div>, now with className on. Counter instance A reused, count ${s.count}.`
                  : 'A new <span>. Counter instance A unmounted; new instance B mounted with count 0.'
                : `${action === 'class' ? '<div className="on">' : afterTag} wrapping Counter, count unknown until you predict.`}
            </span>
            <div aria-hidden>
              <WrapperBox
                tag={afterTag}
                dashed={revealed && !o.wrapperReused}
                badge={
                  action === 'class' ? (
                    <HeaderTag tone="kept">className=&quot;on&quot;</HeaderTag>
                  ) : revealed && !o.wrapperReused ? (
                    <HeaderTag tone="now">new</HeaderTag>
                  ) : null
                }
              >
                <CounterCard
                  instance={revealed ? (o.counterReused ? 'A' : 'B') : '?'}
                  count={
                    revealed
                      ? `count ${o.counterReused ? s.count : 0}`
                      : 'count ?'
                  }
                  mounted={revealed && !o.counterReused}
                  focus={revealed}
                />
              </WrapperBox>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Match lines
// ---------------------------------------------------------------------------

type Link =
  | { kind: 'reused'; y1: number; y2: number; now: boolean; chip?: string }
  | { kind: 'unmounted'; y: number }
  | { kind: 'mounted'; y: number }

function links(s: ExploreState): Link[] {
  if (s.scene === 'wrapper') {
    if (!s.wrapperAction) return []
    const o = WRAPPER_OUTCOMES[s.wrapperAction]
    return o.counterReused
      ? [
          { kind: 'reused', y1: WRAP_LABEL_Y, y2: WRAP_LABEL_Y, now: false },
          {
            kind: 'reused',
            y1: WRAP_COUNTER_Y,
            y2: WRAP_COUNTER_Y,
            now: true,
            chip: s.count ? String(s.count) : undefined,
          },
        ]
      : [
          { kind: 'unmounted', y: WRAP_LABEL_Y },
          { kind: 'mounted', y: WRAP_LABEL_Y },
          { kind: 'unmounted', y: WRAP_COUNTER_Y },
          { kind: 'mounted', y: WRAP_COUNTER_Y },
        ]
  }
  if (!s.listAction) return []
  const outcome = LIST_OUTCOMES[`${s.key}/${s.listAction}`]
  const tracked = trackedRow(s.checks)
  const out: Link[] = []
  outcome.reused.forEach((from, i) => {
    if (from === null) out.push({ kind: 'mounted', y: center(i) })
    else
      out.push({
        kind: 'reused',
        y1: center(from),
        y2: center(i),
        now: from === tracked,
        chip: s.checks[BEFORE[from] as 'milk' | 'dog'] ? '✓' : undefined,
      })
  })
  for (const r of unmountedRows(outcome))
    out.push({ kind: 'unmounted', y: center(r) })
  return out
}

function Lines({
  s,
  w,
  gate,
  play,
}: {
  s: ExploreState
  w: number
  gate: MotionGate
  play: boolean
}) {
  const ls = links(s)
  const draw = play ? transitionFor('draw', gate) : { duration: 0 }
  const move = play ? transitionFor('path', gate) : { duration: 0 }
  const stub = Math.min(14, Math.max(8, w * 0.3))
  const H = COLUMNS_HEIGHT
  // Draw the highlighted line last so it sits on top.
  const ordered = [...ls].sort(
    (a, b) =>
      Number(a.kind === 'reused' && a.now) -
      Number(b.kind === 'reused' && b.now),
  )
  return (
    <>
      <svg
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        className="absolute inset-0 overflow-visible"
        data-viz-part="lines"
      >
        {ordered.map((l, k) => {
          if (l.kind === 'reused') {
            const d = `M0 ${l.y1} C ${w / 2} ${l.y1} ${w / 2} ${l.y2} ${w} ${l.y2}`
            return (
              <g
                key={k}
                data-link="reused"
                className={l.now ? svgInk.now : svgInk.line}
              >
                <m.path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={l.now ? strokeWidth.nowConnector : strokeWidth.connector}
                  strokeLinecap="round"
                  initial={play && !gate.reduce ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }}
                  transition={draw}
                />
                <circle cx={0} cy={l.y1} r={3} fill="currentColor" />
                <circle cx={w} cy={l.y2} r={3} fill="currentColor" />
              </g>
            )
          }
          if (l.kind === 'unmounted') {
            const x = stub
            return (
              <g
                key={k}
                data-link="unmounted"
                className={svgInk.removed}
              >
                <path
                  d={`M0 ${l.y} H ${x - 3}`}
                  stroke="currentColor"
                  strokeWidth={strokeWidth.connector}
                  strokeDasharray={DASH}
                  fill="none"
                />
                <path
                  d={`M${x - 3} ${l.y - 4} l7 8 M${x + 4} ${l.y - 4} l-7 8`}
                  stroke="currentColor"
                  strokeWidth={strokeWidth.connector}
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            )
          }
          return (
            <g key={k} data-link="mounted" className={svgInk.muted}>
              <circle
                cx={w - stub}
                cy={l.y}
                r={3}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth.connector}
              />
              <path
                d={`M${w - stub + 3} ${l.y} H ${w}`}
                stroke="currentColor"
                strokeWidth={strokeWidth.connector}
                strokeDasharray={DASH}
                fill="none"
              />
            </g>
          )
        })}
      </svg>
      {ls.map((l, k) =>
        l.kind === 'reused' && l.chip ? (
          <m.span
            key={`chip-${k}`}
            className="absolute left-0 top-0 h-0 w-0"
            initial={play && !gate.reduce ? { x: 0, y: l.y1 } : false}
            animate={{ x: w / 2, y: (l.y1 + l.y2) / 2 }}
            transition={move}
          >
            <span
              data-viz-part="state-chip"
              className={clsx(
                'absolute left-0 top-0 flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center px-1 font-semibold',
                radius.chip.cls,
                typeScale.meta.cls,
                'bg-zinc-100 text-zinc-900 print:bg-zinc-900 print:text-white',
                l.now ? now.chip : 'ring-1 ring-zinc-500',
              )}
            >
              {l.chip}
            </span>
          </m.span>
        ) : null,
      )}
    </>
  )
}
