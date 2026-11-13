'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { m } from 'framer-motion'
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
  DOT_R,
  EASE_CSS,
} from '../../primitives/tokens-v3'
import { transitionFor, type MotionGate } from '../../shell/motion'
import { toRem } from '../../substrates/units'
import { CheckBox } from './CheckBox'
import { RevealDirector, type Ride } from './CheckRider'
import {
  AFTER_TOP,
  CARD,
  CHECK_Y,
  COLUMNS,
  COLUMNS_HEIGHT,
  STACKED_HEIGHT,
  rowTop,
} from './layout'
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
import { BEAT, HIGHLIGHT_MS, beatFade, beatTransition, type Beat, type RevealView } from './reveal'

/**
 * The stage's Before and After columns with the match lines between them
 * (spec §2.2 "Match line", §8.3).
 *
 * - A card is one instance (a fiber with its DOM node and state). Its spine
 *   names the instance and sits on the card's outer edge; the checkbox sits
 *   on the edge that faces the lines, on the first line, so every match line
 *   leaves and enters a card at checkbox height (H3 R6). A mounted instance
 *   is drawn dashed, spine included, with a dashed stub from an open circle;
 *   an unmounted one is dashed in the removed role with one ×.
 * - Side by side (Before | lines | After) wherever two cards keep their text
 *   whole; under very large text the columns stack, Before above After, and
 *   the lines run in a rail beside them (H3 R9). The CSS for both lives in
 *   `stackCss` (container queries on the frame, so the server markup is final).
 * - The reveal (D21, `CheckRider.tsx`): each carried checkbox lifts out of its
 *   Before box (which empties), rides its own line as the line draws, and
 *   settles into the After box its instance now renders. Each After row's
 *   instance shows when its line reaches it (an unmounted Before instance
 *   turns dashed, neutral, when the first line arrives). Then, once every
 *   check has landed, one ordered sequence (`BEAT` in `reveal.ts`, Q18): the
 *   landing row's lime, the badges and the removed role, the dock's verdict,
 *   and the Before checks as history (R2M-15).
 * - Lime is the landing (Q9): the row that received the tracked check, and
 *   nothing else in the columns but its traced line. A lost check lands
 *   nowhere; its instance takes the removed role like any unmounted one. A
 *   row that shows another item's state, or lost its own, carries a neutral
 *   in-row badge (× or ✓, H3 R1) with the words for assistive tech and on
 *   hover, so the mismatch never depends on color (A7).
 */

const useIsoLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Wrapper geometry: a box (label, then the Counter card), then the +1 button. */
const BOX = { pad: 4, label: 16, gap: 4, bottom: 8, border: 1 } as const
const WRAP_LABEL_Y = rowTop(0) + BOX.border + BOX.pad + BOX.label / 2
const WRAP_COUNTER_Y =
  rowTop(0) + BOX.border + BOX.pad + BOX.label + BOX.gap + CARD.height / 2
/** The After box's `className="on"` line pushes its Counter down by one meta line. */
const ATTR_LINE = 16

export type ColumnsProps = {
  s: ExploreState
  interactive: boolean
  gate: MotionGate
  view: RevealView
  dispatch: (a: ExploreAction) => void
}

/** The gutter's (or rail's) width in layout units, the root scale, and the layout. */
type LinesBox = { w: number; k: number; stacked: boolean }

export function Columns({ s, interactive, gate, view, dispatch }: ColumnsProps) {
  const linesRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // Layout width, not the painted box: `offsetWidth` ignores CSS zoom and
  // transforms on ancestors, so lines drawn in units stay on their cards
  // under any zoom or text size (D19, R1 correctness R13).
  const [box, setBox] = useState<LinesBox>({ w: COLUMNS.linesNarrow, k: 1, stacked: false })
  useIsoLayoutEffect(() => {
    const el = linesRef.current
    if (!el) return
    const measure = () => {
      const k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
      const w = Math.round((el.offsetWidth / k) * 10) / 10
      // Stacked when the After block sits under the Before block (the
      // container query in `stack-css.ts` decides; this reads its result).
      const root = rootRef.current
      const before = root?.querySelector<HTMLElement>('[data-lk-area="before"]')
      const after = root?.querySelector<HTMLElement>('[data-lk-area="after"]')
      const stacked = Boolean(before && after && after.offsetTop > before.offsetTop + 1)
      setBox((b) => (b.w === w && b.k === k && b.stacked === stacked ? b : { w, k, stacked }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (rootRef.current) ro.observe(rootRef.current)
    return () => ro.disconnect()
  }, [])

  const rides = s.phase === 'reveal' && s.scene === 'list' ? ridesOf(s) : []

  return (
    <div
      ref={rootRef}
      data-viz-region="columns"
      data-lk-cols
      data-lk-scene={s.scene}
      className="relative min-w-0"
      // Print lays the frame out at the paper's width, with no script to
      // redraw the lines: the gutter keeps the width they were drawn for and
      // the cards take the rest (H3 R10, `stack-css.ts`).
      style={{ ['--lk-lines-w' as string]: toRem(box.w) }}
    >
      {s.scene === 'list' ? (
        <ListColumns s={s} interactive={interactive} dispatch={dispatch} view={view} rides={rides} />
      ) : (
        <WrapperColumns s={s} interactive={interactive} dispatch={dispatch} view={view} />
      )}
      <div ref={linesRef} aria-hidden data-lk-area="lines" data-lk-lines className="relative min-w-0">
        {s.phase === 'reveal' ? (
          <Lines key={view.key} s={s} box={box} view={view} gate={gate} />
        ) : null}
      </div>
      {view.directing ? (
        <RevealDirector
          key={view.key}
          scene={s.scene}
          rides={rides}
          rootRef={rootRef}
          onArrive={view.onArrive}
          onLand={view.onLand}
          onLanded={view.onLanded}
        />
      ) : null}
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
      style={{ marginBottom: toRem(COLUMNS.labelGap) }}
    >
      {children}
    </p>
  )
}

/**
 * The instance letter. Before a reveal resolves it shows `?`; on the reveal
 * the letter replaces it when the row's line reaches it, at full size in the
 * same frame, and its ink brightens from the `?`'s muted to the letter's on
 * the `highlight` beat (120 ms), so the cell is never blank (R2M-06).
 */
function Spine({
  label,
  dashed,
  side,
  played,
}: {
  label: string
  dashed?: boolean
  /** Which column: the After spine moves to the outer edge beside the lines. */
  side: 'before' | 'after'
  played?: boolean
}) {
  return (
    <span
      aria-hidden
      data-lk-spine={side}
      data-viz-part="spine"
      className={clsx(
        'flex w-7 shrink-0 flex-col items-center justify-center whitespace-nowrap',
        side === 'before' ? 'border-r' : 'border-x',
        typeScale.glyphHeader.cls,
        dashed ? clsx('border-dashed', stroke.line) : stroke.hairline,
        label === '?' ? ink.muted : ink.base,
        played && 'transition-colors motion-reduce:transition-none',
      )}
      style={played ? ARRIVE_STYLE : undefined}
    >
      {label}
    </span>
  )
}

/**
 * An in-row verdict badge (D17, H3 R1): one glyph, in flow at the end of
 * the card's key line, never on the border. Neutral zinc for kept, lost and
 * "not its check"; rose only for an unmounted instance (the `removed` role).
 * The words travel as the accessible name and the tooltip.
 */
function StatusBadge({ glyph, removed, words }: { glyph: '×' | '✓'; removed?: boolean; words: string }) {
  return (
    <Badge tone={removed ? 'removed' : 'neutral'} className="ml-auto h-4 w-3 justify-center bg-transparent px-0">
      <span aria-hidden title={words}>
        {glyph}
      </span>
      <span className="sr-only">{words}</span>
    </Badge>
  )
}

/** Cards are glyphs: zinc-800 fill, 8 px corners, 1 px `line` outline (D1, drift C10). */
const cardCls = clsx('relative flex min-w-0 overflow-visible border', radius.glyph.cls, surface.glyph)
const cardStyle = { height: toRem(CARD.height) }
const contentCls = 'flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-1 xs:px-2'
const lineCls = 'flex min-w-0 items-center gap-2'

const STATUS_TEXT: Record<NonNullable<AfterRow['status']>, string> = {
  foreign: 'not its check',
  lost: 'lost its check',
  kept: 'kept its check',
}

/** An instance letter arrives with its line on the `highlight` beat (120 ms). */
const ARRIVE_STYLE = { transitionDuration: `${HIGHLIGHT_MS}ms`, transitionTimingFunction: EASE_CSS }

/** A part of the verdict sequence, faded in on its beat (`reveal.ts`). */
function Arrive({ played, beat, children, className }: { played: boolean; beat: Beat; children: ReactNode; className?: string }) {
  return (
    <m.span
      className={className}
      initial={played ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={beatFade(played, beat)}
      data-lk-beat={beat}
    >
      {children}
    </m.span>
  )
}

function ListColumns({
  s,
  interactive,
  dispatch,
  view,
  rides,
}: {
  s: ExploreState
  interactive: boolean
  dispatch: (a: ExploreAction) => void
  view: RevealView
  rides: readonly Ride[]
}) {
  const action = s.listAction
  const outcome = LIST_OUTCOMES[`${s.key}/${action}`]
  const rows = afterRows(s.key, action, outcome, s.checks)
  const revealed = s.phase === 'reveal'
  const gone = revealed ? unmountedRows(outcome) : []
  const tracked = trackedRow(s.checks)
  const destination =
    revealed && tracked !== null ? rows.findIndex((r) => r.from === tracked) : -1
  const sources = new Set(rides.map((r) => r.from))
  const destinations = new Set(rides.map((r) => r.to))

  return (
    <>
      <div className="min-w-0" data-lk-area="before" data-viz-part="before">
        <ColumnLabel>Before</ColumnLabel>
        <ul
          className="m-0 flex list-none flex-col p-0"
          style={{ gap: toRem(CARD.gap) }}
          aria-label="Before: check rows to give them state"
        >
          {BEFORE.map((id, i) => {
            const item = id as 'milk' | 'dog'
            const rowId = `before-${i}`
            const unmounted = gone.includes(i as 0 | 1)
            // Dashed (neutral) when the first line arrives; the removed role
            // and its badge once, on the badges beat (R2M-05).
            const isGone = unmounted && view.arrived(rowId)
            const removed = unmounted && revealed && view.landed
            // Its check is riding (D21, H3 R6): the box reads empty until every
            // check has landed; the accessible state stays checked.
            const riding = sources.has(rowId) && view.directing && !view.landed
            const key = keyText(s.key, id, i, 'before')
            return (
              <li key={id} className="m-0 p-0" data-row={rowId} data-removed={removed || undefined}>
                <label
                  className={clsx(
                    cardCls,
                    'group',
                    interactive ? 'cursor-pointer' : 'cursor-default',
                    focusRingHas,
                    transitionCls.feedback,
                    isGone && 'border-dashed',
                    removed ? stroke.removed : stroke.line,
                  )}
                  style={{ ...cardStyle, ...beatTransition(view.sequence, BEAT.badges) }}
                >
                  {/* H3 R13: the card toggles its checkbox, so it answers the
                      pointer like every control: a white/5 step on hover
                      devices and white/10 while pressed. */}
                  {interactive ? (
                    <span
                      aria-hidden
                      className={clsx(
                        'pointer-events-none absolute inset-0 rounded-[inherit] print:hidden',
                        'group-can-hover:bg-white/5 group-press:bg-white/10',
                        transitionCls.feedback,
                      )}
                    />
                  ) : null}
                  <Spine label={BEFORE_INSTANCES[i]} dashed={isGone} side="before" />
                  <span className={contentCls}>
                    <span className={lineCls}>
                      <span className={clsx('min-w-0 flex-1 truncate', typeScale.item.cls, ink.base)}>
                        {ITEMS[id].text}
                      </span>
                      <CheckBox
                        input={{
                          'data-viz-focus': `check-${id}`,
                          checked: s.checks[item],
                          'aria-disabled': !interactive || undefined,
                          tabIndex: interactive ? 0 : -1,
                          onChange: () => interactive && dispatch({ type: 'check', item }),
                          'aria-label': `${ITEMS[id].text}, instance ${BEFORE_INSTANCES[i]}, key ${key}`,
                        }}
                        shown={s.checks[item] && !riding}
                        history={{ on: revealed && view.landed, style: beatTransition(view.sequence, BEAT.history) }}
                      />
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      <span className={clsx('truncate', typeScale.meta.cls, ink.muted)}>{`key=${key}`}</span>
                      {removed ? (
                        <Arrive played={view.sequence} beat={BEAT.badges} className="ml-auto flex">
                          <StatusBadge glyph="×" removed words="unmounted" />
                        </Arrive>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="min-w-0" data-lk-area="after" data-viz-part="after">
        <ColumnLabel>After</ColumnLabel>
        <ul
          className="m-0 flex list-none flex-col p-0"
          style={{ gap: toRem(CARD.gap) }}
          aria-label="After"
        >
          {rows.map((r, i) => {
            const rowId = `after-${i}`
            const mounted = r.from === null
            const arrived = revealed && view.arrived(rowId)
            const landed = view.landedRow(rowId)
            // A row waiting for its check is an empty slot the rider settles
            // into (no outline under it, R1M-08); it shows checked once landed.
            const waiting = destinations.has(rowId) && !landed
            const isDest = i === destination && landed
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
                data-row={rowId}
                data-lk-flip
                data-instance={revealed ? r.instance : undefined}
                data-checked={revealed ? String(r.checked) : undefined}
                data-status={revealed ? (r.status ?? '') : undefined}
                data-focus={isDest || undefined}
                className={clsx(
                  cardCls,
                  'm-0 p-0',
                  arrived && mounted ? clsx('border-dashed', stroke.line) : stroke.line,
                  // Q9: lime is the landing, the row that received the check.
                  isDest && now.glyph,
                  transitionCls.feedback,
                )}
                // The lime fades in as this row's own check sets down (with
                // two checks the tracked one lands first).
                style={{ ...cardStyle, ...beatTransition(view.fade && landed, BEAT.landing) }}
              >
                <span className="sr-only">{describe}</span>
                <span aria-hidden className={contentCls}>
                  <span data-lk-flip className={lineCls}>
                    <CheckBox state={!arrived ? '?' : waiting ? 'slot' : r.checked} />
                    <span className={clsx('min-w-0 flex-1 truncate', typeScale.item.cls, ink.base)}>
                      {ITEMS[r.item].text}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1">
                    <span className={clsx('truncate', typeScale.meta.cls, ink.muted)}>{`key=${r.key}`}</span>
                    {/* The verdicts (kept, lost, not its check) arrive with the
                        dock's verdict, once every carried check has landed. */}
                    {revealed && r.status && view.landed ? (
                      <Arrive played={view.sequence} beat={BEAT.badges} className="ml-auto flex">
                        <StatusBadge glyph={r.status === 'kept' ? '✓' : '×'} words={STATUS_TEXT[r.status]} />
                      </Arrive>
                    ) : null}
                  </span>
                </span>
                <Spine label={arrived ? r.instance : '?'} dashed={arrived && mounted} side="after" played={view.played && arrived && !view.landed} />
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}

function WrapperBox({
  tag,
  attr,
  dashed,
  removed,
  children,
  badge,
  sequence = false,
}: {
  tag: string
  attr?: string
  dashed?: boolean
  removed?: boolean
  children: ReactNode
  badge?: ReactNode
  /** The removed role arrives on the badges beat (Q18). */
  sequence?: boolean
}) {
  return (
    <div
      className={clsx(
        'relative border px-2',
        radius.glyph.cls,
        transitionCls.feedback,
        removed ? clsx('border-dashed', stroke.removed) : dashed ? clsx('border-dashed', stroke.line) : stroke.line,
      )}
      style={{ paddingTop: toRem(BOX.pad), paddingBottom: toRem(BOX.bottom), ...beatTransition(sequence, BEAT.badges) }}
    >
      <p
        className={clsx('m-0 flex h-4 items-center justify-between gap-1', typeScale.meta.cls, ink.secondary)}
        style={{ marginBottom: toRem(BOX.gap) }}
      >
        <span className="min-w-0 truncate">{tag}</span>
        {badge}
      </p>
      {attr ? (
        <p
          data-viz-part="wrapper-attr"
          // The changed attribute in full ink (lime is the landing only, Q9).
          className={clsx('m-0 h-4 truncate', typeScale.meta.cls, ink.base)}
          style={{ marginTop: toRem(-BOX.gap), marginBottom: toRem(BOX.gap) }}
        >
          {attr}
        </p>
      ) : null}
      {children}
    </div>
  )
}

function CounterCard({
  instance,
  count,
  mounted,
  focus,
  sequence = false,
}: {
  instance: string
  count: string
  mounted?: boolean
  /** The count landed here (Q9): the lime landing, on the first beat. */
  focus?: boolean
  sequence?: boolean
}) {
  return (
    <div
      data-viz-part="counter"
      data-focus={focus || undefined}
      className={clsx(
        cardCls,
        transitionCls.feedback,
        mounted ? clsx('border-dashed', stroke.line) : stroke.line,
        focus && now.glyph,
      )}
      style={{ ...cardStyle, ...beatTransition(sequence, BEAT.landing) }}
    >
      <Spine label={instance} dashed={mounted} side="before" />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2">
        <span className={clsx('truncate', typeScale.item.cls, ink.base)}>Counter</span>
        <span className="flex min-w-0 items-center gap-1">
          <span className={clsx('truncate', typeScale.meta.cls, ink.secondary)}>{count}</span>
        </span>
      </span>
    </div>
  )
}

function WrapperColumns({
  s,
  interactive,
  dispatch,
  view,
}: {
  s: ExploreState
  interactive: boolean
  dispatch: (a: ExploreAction) => void
  view: RevealView
}) {
  const action = s.wrapperAction
  // The outcome shows once the lines have drawn (H3 R5).
  const revealed = s.phase === 'reveal' && view.landed
  const o = WRAPPER_OUTCOMES[action]
  const afterTag = action === 'type' ? '<span>' : '<div>'
  const lost = revealed && !o.counterReused
  return (
    <>
      <div className="min-w-0" data-lk-area="before" data-viz-part="before">
        <ColumnLabel>Before</ColumnLabel>
        <WrapperBox
          tag="<div>"
          removed={lost}
          sequence={view.sequence}
          badge={
            lost ? (
              <Arrive played={view.sequence} beat={BEAT.badges} className="flex">
                <StatusBadge glyph="×" removed words="unmounted" />
              </Arrive>
            ) : null
          }
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
          className={clsx(buttonClasses({ variant: 'secondary', unavailable: !interactive }), 'mt-2 w-full print:hidden')}
        >
          Add 1
        </button>
      </div>
      <div className="min-w-0" data-lk-area="after" data-viz-part="after">
        <ColumnLabel>After</ColumnLabel>
        <div
          data-instance={revealed ? (o.counterReused ? 'A' : 'B') : undefined}
          data-count={revealed ? String(o.counterReused ? s.count : 0) : undefined}
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
              // The className change gets its own line under the tag name, so
              // it fits at 320 and never sits on the border (D17).
              attr={action === 'class' ? 'className="on"' : undefined}
            >
              <CounterCard
                instance={revealed ? (o.counterReused ? 'A' : 'B') : '?'}
                count={revealed ? `count ${o.counterReused ? s.count : 0}` : 'count ?'}
                mounted={revealed && !o.counterReused}
                // The count lands only where it was kept; a remount loses it
                // (the answer is "count 0"), so nothing in After is lime.
                focus={revealed && o.counterReused}
                sequence={view.sequence}
              />
            </WrapperBox>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Match lines
// ---------------------------------------------------------------------------

type Link =
  | { kind: 'reused'; y1: number; y2: number; now: boolean; chip?: string; checked?: boolean; from: string; to: string }
  | { kind: 'unmounted'; y: number; from: string }
  | { kind: 'mounted'; y: number; to: string }

/** Where each row's line meets its card: at checkbox height (H3 R6). */
const beforeY = (i: number) => rowTop(i) + CHECK_Y
const afterY = (i: number, stacked: boolean) => (stacked ? AFTER_TOP : 0) + rowTop(i) + CHECK_Y

function links(s: ExploreState, stacked: boolean): Link[] {
  if (s.scene === 'wrapper') {
    const o = WRAPPER_OUTCOMES[s.wrapperAction]
    const attr = s.wrapperAction === 'class' ? ATTR_LINE : 0
    return o.counterReused
      ? [
          { kind: 'reused', y1: WRAP_LABEL_Y, y2: WRAP_LABEL_Y, now: false, from: 'before-wrapper', to: 'after-wrapper' },
          {
            kind: 'reused',
            y1: WRAP_COUNTER_Y,
            y2: WRAP_COUNTER_Y + attr,
            now: true,
            chip: s.count ? String(s.count) : undefined,
            from: 'before-counter',
            to: 'after-counter',
          },
        ]
      : [
          { kind: 'unmounted', y: WRAP_LABEL_Y, from: 'before-wrapper' },
          { kind: 'mounted', y: WRAP_LABEL_Y, to: 'after-wrapper' },
          { kind: 'unmounted', y: WRAP_COUNTER_Y, from: 'before-counter' },
          { kind: 'mounted', y: WRAP_COUNTER_Y, to: 'after-counter' },
        ]
  }
  const outcome = LIST_OUTCOMES[`${s.key}/${s.listAction}`]
  const tracked = trackedRow(s.checks)
  const out: Link[] = []
  outcome.reused.forEach((from, i) => {
    if (from === null) out.push({ kind: 'mounted', y: afterY(i, stacked), to: `after-${i}` })
    else
      out.push({
        kind: 'reused',
        y1: beforeY(from),
        y2: afterY(i, stacked),
        now: from === tracked,
        // The checkbox itself rides this line on the reveal (D21) and rests
        // in the After row, so the line carries no chip.
        checked: s.checks[BEFORE[from] as 'milk' | 'dog'],
        from: `before-${from}`,
        to: `after-${i}`,
      })
  })
  for (const r of unmountedRows(outcome)) out.push({ kind: 'unmounted', y: beforeY(r), from: `before-${r}` })
  return out
}

/** A match line: a cubic with level ends, from (0, y1) to (w, y2). */
const curve = (w: number, y1: number, y2: number) => ({
  d: `M0 ${y1} C ${w / 2} ${y1} ${w / 2} ${y2} ${w} ${y2}`,
  at: (t: number) => {
    const u = 1 - t
    return {
      x: 3 * u * u * t * (w / 2) + 3 * u * t * t * (w / 2) + t * t * t * w,
      y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2,
    }
  },
})

/**
 * Stacked: a C-shaped arc in the rail, leaving and entering the cards' edge
 * (x = 0) level. Its bulge grows with its span, so nested arcs never cross
 * and the riders on them never meet.
 */
export function arc(w: number, y1: number, y2: number): string {
  const span = Math.abs(y2 - y1)
  const max = (w - 4) / 0.75
  const b = Math.min(max, Math.max(12, (span / STACKED_HEIGHT) * max * 1.15))
  return `M0 ${y1} C ${b} ${y1} ${b} ${y2} 0 ${y2}`
}

/** The curve parameter where x reaches `x` (x grows with t on these curves). */
function tAtX(c: ReturnType<typeof curve>, x: number): number {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (c.at(mid).x < x) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Half the state chip (20 px) plus 2: it rests on its line just before the After card. */
const CHIP_REST = 12
const CHIP_SAMPLES = 12

/**
 * Where a state chip travels and rests (M09, M10, M11): along its own
 * curve, never a chord, and it rests at the destination end of the line,
 * so the chips of two crossing lines never meet. Units are layout px.
 */
export function chipPath(w: number, y1: number, y2: number): { x: number; y: number }[] {
  const c = curve(w, y1, y2)
  const end = tAtX(c, Math.max(0, w - CHIP_REST))
  return Array.from({ length: CHIP_SAMPLES + 1 }, (_, i) => c.at((end * i) / CHIP_SAMPLES))
}

function Lines({ s, box, view, gate }: { s: ExploreState; box: LinesBox; view: RevealView; gate: MotionGate }) {
  // An unmounted stub draws in `line` grey with the lines and takes the
  // removed role with its card, on the badges beat (R2M-05).
  const removedNow = view.landed
  const stubStyle = beatTransition(view.sequence, BEAT.badges)
  const { w, k } = box
  const stacked = box.stacked && s.scene === 'list'
  const ls = links(s, stacked)
  // While the reveal plays, the director draws each line from its Before
  // end (stroke dash) and fades the stubs in; until then they are hidden.
  const hidden = view.directing && !view.landed
  // The wrapper's state chip still travels its line (framer); it lands at
  // once on a resize (the reveal animates only at the width it started at).
  const first = useRef(box)
  const animateChip = view.played && !gate.reduce && first.current.w === w && first.current.k === k
  const move = transitionFor('path', gate)
  const stub = Math.min(14, Math.max(8, w * 0.3))
  const H = stacked ? STACKED_HEIGHT : COLUMNS_HEIGHT
  // Draw the highlighted line last so it sits on top.
  const ordered = [...ls].sort((a, b) => Number(a.kind === 'reused' && a.now) - Number(b.kind === 'reused' && b.now))
  const hide = hidden ? { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1.001 } : {}
  return (
    <>
      <svg
        width={w}
        height={H}
        viewBox={`0 0 ${w} ${H}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        data-viz-part="lines"
      >
        {ordered.map((l) => {
          if (l.kind === 'reused') {
            const d = stacked ? arc(w, l.y1, l.y2) : curve(w, l.y1, l.y2).d
            const x2 = stacked ? 0 : w
            return (
              <g
                key={`${l.from}-${l.to}`}
                data-link="reused"
                data-from={l.from}
                data-to={l.to}
                className={l.now ? svgInk.now : svgInk.line}
              >
                <path
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={l.now ? strokeWidth.nowConnector : strokeWidth.connector}
                  strokeLinecap="round"
                  data-lk-draw
                  {...hide}
                />
                <circle cx={0} cy={l.y1} r={DOT_R} fill="currentColor" />
                <circle cx={x2} cy={l.y2} r={DOT_R} fill="currentColor" data-lk-end style={hidden ? { opacity: 0 } : undefined} />
              </g>
            )
          }
          if (l.kind === 'unmounted') {
            const x = stub
            return (
              <g
                key={`u-${l.from}`}
                data-link="unmounted"
                data-from={l.from}
                data-lk-stub
                className={clsx(removedNow ? svgInk.removed : svgInk.line, 'transition-colors motion-reduce:transition-none')}
                style={hidden ? { opacity: 0, ...stubStyle } : stubStyle}
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
          // Mounted: an open circle with a dashed stub into the After card
          // (from the right when side by side, back to the cards when stacked).
          const cx = stacked ? stub : w - stub
          return (
            <g key={`m-${l.to}`} data-link="mounted" data-to={l.to} data-lk-stub className={svgInk.line} style={hidden ? { opacity: 0 } : undefined}>
              <circle cx={cx} cy={l.y} r={DOT_R} fill="none" stroke="currentColor" strokeWidth={strokeWidth.connector} />
              <path
                d={stacked ? `M${stub - 3} ${l.y} H 0` : `M${w - stub + 3} ${l.y} H ${w}`}
                stroke="currentColor"
                strokeWidth={strokeWidth.connector}
                strokeDasharray={DASH}
                fill="none"
              />
            </g>
          )
        })}
      </svg>
      {ls.map((l) => {
        if (l.kind !== 'reused' || !l.chip) return null
        const pts = chipPath(w, l.y1, l.y2).map((p) => ({ x: p.x * k, y: p.y * k }))
        const end = pts[pts.length - 1]
        return (
          <m.span
            key={`chip-${l.from}-${l.to}`}
            data-from={l.from}
            data-to={l.to}
            className="absolute left-0 top-0 h-0 w-0"
            initial={animateChip ? { x: pts[0].x, y: pts[0].y } : false}
            animate={animateChip ? { x: pts.map((p) => p.x), y: pts.map((p) => p.y) } : { x: end.x, y: end.y }}
            transition={animateChip ? { ...move, times: pts.map((_, i) => i / (pts.length - 1)) } : { duration: 0 }}
          >
            <span
              data-viz-part="state-chip"
              className={clsx(
                'absolute left-0 top-0 flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center px-1 font-semibold',
                radius.chip.cls,
                typeScale.meta.cls,
                'bg-zinc-100 text-zinc-900 print:border print:border-zinc-900 print:bg-transparent',
                l.now ? now.chip : 'ring-1 ring-zinc-500',
              )}
            >
              {l.chip}
            </span>
          </m.span>
        )
      })}
    </>
  )
}

/** The rides of a list reveal (D21): each checked, reused row, the tracked one first. */
export function ridesOf(s: ExploreState): Ride[] {
  return links(s, false)
    .flatMap((l) => (l.kind === 'reused' && l.checked ? [l] : []))
    .sort((a, b) => Number(b.now) - Number(a.now))
    .map((l) => ({ from: l.from, to: l.to }))
}
