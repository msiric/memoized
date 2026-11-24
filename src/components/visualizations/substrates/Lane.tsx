'use client'

import {
  AnimatePresence,
  m,
  useIsPresent,
  type MotionProps,
} from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { cn as clsx } from '../primitives/cn'
import { Tag } from '../primitives/Tag'
import {
  changed,
  ink,
  motion,
  radius,
  stroke,
  surface,
  type as typeScale,
} from '../primitives/tokens-v3'
import { beatDelay, presence, type MotionGate, type PresenceCustom } from '../shell/motion'
import type { PerVariant } from '../shell/types'
import { H_CLS } from '../shell/vars'
import { remHeights } from './units'

/**
 * Lanes substrate (spec §6.1): a labelled region holding chips.
 *
 * Surfaces (R2): a lane is an inner region of the frame, so it has no border
 * (a transparent one keeps the geometry), a faint white/2.5 lift, and space
 * between it and its neighbours. Only glyphs that carry state are stroked.
 *
 * Chips (R1, R7): one shape for every callback, wherever it waits or runs: a
 * 28 px chip with 4 px corners, content width, the neutral glyph fill, and
 * the lane's hue on its edge only (call stack and host: the neutral `line`,
 * the host dashed because the callback is only registered; microtasks violet;
 * tasks sky). A chip never changes hue between steps, and lime never marks a
 * chip: lime means where something lands (the code line). The glyph that
 * changed this step (`changed`, H3 R2 Q9) doubles its own edge (an inset
 * ring in the same hue, no layout shift) and takes its own tint. Arrival is
 * shown by the enter motion, so chips carry no `new` tag (D22). Stack frames
 * stack bottom-up (the newest on top), left-aligned.
 *
 * One anatomy (Q8): every lane puts its label in the same place per variant
 * (on top when narrow, in a 96 px left column when wide) and its tokens
 * start at the same x and the same first row.
 *
 * Layout (D16): queues wrap; a chip never grows past its lane and truncates
 * its label inside (F5). The engine decides which chips are visible per
 * layout variant (`show`) and adds a `more` chip for the collapsed tail
 * (A1), so the lane never overflows.
 *
 * Motion (shell/motion `presence`): a chip that changes place keeps its
 * `data-flip-id`, and the stage's `useFlip` plays the `move` spring from its
 * old position (transform only), lifted above every lane while it crosses
 * regions. New chips `enter` from their arrival side; removed chips `exit`
 * toward their departure side; Back mirrors both (D8). Toward a label on
 * top, they travel only the 4 px gap under it, never into the label (G1). The exit is resolved
 * from the live gate, so scrubs, Home, End and preset switches snap leaving
 * chips too (D7). Only glyphs inside the step's budget animate. A chip that
 * moved elsewhere leaves its old lane instantly, so it is never drawn twice.
 * The lane's "empty" word waits for a leaving chip's exit (R1M-01), so it is
 * never printed over a chip that is still fading out.
 */

export type ChipKind = 'frame' | 'task' | 'micro' | 'host'
export type LaneChip = {
  id: string
  label: string
  /** Visible per layout variant (default: both). */
  show?: PerVariant<boolean>
  /** The `+N more` summary of a collapsed queue tail: quiet, sans. */
  more?: boolean
  /**
   * In the tight frame (`vz-tight`, very large text on a phone), where a
   * queue collapses more of its tail: `false` hides the chip there, `true`
   * shows it only there (that frame's own `+N more`). Default: as narrow.
   */
  tight?: boolean
}

/** Classes that show an element only in the variants where `show` is true. */
export function showCls(show?: PerVariant<boolean>): string | undefined {
  if (!show || (show.narrow && show.wide)) return undefined
  if (show.narrow) return 'vz-wide:hidden'
  if (show.wide) return 'hidden vz-wide:block'
  return 'hidden'
}

const moreCls = clsx(
  'max-w-48 border-dashed px-2 font-sans',
  radius.chip.cls,
  stroke.line,
  typeScale.tag.cls,
  ink.muted,
  'h-7',
)

/** One chip (R7): 4 px corners, 28 px, content width up to 12 rem, the neutral glyph fill. */
// 6 px inline padding: at Chrome's "Very large" text on a 375 phone, "cb micro 2"
// keeps its whole label in a 2x2 lane (R9).
// Under very large text on a phone the lane is narrower than the 320 design
// width (the frame sits in the column, H3 R2 Q6): 12 px mono and 2 px
// padding keep a whole ten-character label (R9).
const chipBase = clsx('h-7 max-w-48 px-1.5 vz-tight:px-0.5 vz-tight:text-2xs', radius.chip.cls, surface.glyph)

/** The lane's hue, on the chip's edge only (R1). */
const chipEdge: Record<ChipKind, string> = {
  frame: stroke.line,
  task: stroke.queued,
  micro: stroke.micro,
  host: clsx('border-dashed', stroke.line),
}

/** "Changed this step" (Q9): the chip doubles its own edge and takes its own tint, in its own hue. */
const chipChanged: Record<ChipKind, string> = {
  frame: changed.neutral,
  task: changed.queued,
  micro: changed.micro,
  host: changed.neutral,
}

export type LaneProps = {
  id: string
  label: string
  kind: ChipKind
  chips: readonly LaneChip[]
  /** `top`: label above the chips. `inline`: label in a left column. */
  labelAt: PerVariant<'top' | 'inline'>
  height: PerVariant<number>
  focus: ReadonlySet<string>
  created: ReadonlySet<string>
  /** Ids present anywhere in the new state (moved chips exit instantly). */
  present: ReadonlySet<string>
  /** Ids that were on stage in the previous render (moved chips do not fade in). */
  before: ReadonlySet<string>
  gate: MotionGate
  /** Arrival side for `enter` and departure side for `exit`, going forward (Back mirrors them). */
  from: { x?: number; y?: number }
  to: { x?: number; y?: number }
  /** Chips stack bottom-up with the top marked (default: stack frames only); the frontier's stack lane sets it for queued chips. */
  vertical?: boolean
  className?: string
}

const Chip = forwardRef<
  HTMLDivElement,
  { chip: LaneChip; kind: ChipKind; focused: boolean; top?: boolean }
>(function Chip({ chip, kind, focused, top }, ref) {
  return (
    <div
      ref={ref}
      data-chip={chip.id}
      data-focus={focused || undefined}
      className={clsx(
        'flex min-w-0 items-center gap-2 border',
        typeScale.value.cls,
        ink.base,
        chip.more ? moreCls : clsx(chipBase, chipEdge[kind]),
        focused && !chip.more && chipChanged[kind],
      )}
    >
      <span className="min-w-0 truncate" title={chip.label}>
        {chip.label}
      </span>
      {top ? (
        <Tag tone="muted" className="ml-auto h-4 bg-transparent px-0">
          top
        </Tag>
      ) : null}
    </div>
  )
})

/** The share of the 8 px enter and exit travel that fits between a label on top and the first chip (its 4 px gap). */
const LABEL_GAP_SHARE = 0.5

/** One chip slot. Exiting copies drop `data-flip-id`, so FLIP measures only the live chip. */
const LaneItem = forwardRef<
  HTMLDivElement,
  { id: string; className: string; children: ReactNode } & MotionProps
>(function LaneItem({ id, className, children, ...motionProps }, ref) {
  const present = useIsPresent()
  return (
    <m.div
      ref={ref}
      data-glyph={id}
      // A leaving chip is popped out of flow at its rounded-down width; it
      // keeps its whole label until it has gone (R2M-01).
      className={clsx(className, '[&[data-motion-pop-id]]:!w-max [&[data-motion-pop-id]]:!max-w-none')}
      {...motionProps}
    >
      <div data-flip-id={present ? id : undefined}>{children}</div>
    </m.div>
  )
})

export function Lane(props: LaneProps) {
  const {
    id,
    label,
    kind,
    chips,
    labelAt,
    height,
    focus,
    present,
    before,
    gate,
    from,
    to,
    className,
  } = props
  const vertical = props.vertical ?? kind === 'frame'
  // A chip never travels into its lane's label (G1). Where the label sits on
  // top, the first chip slot is 4 px under it (gap-1), so a chip that drops
  // in from above, or leaves upward, travels half the 8 px token: the full
  // travel put its top edge on the label's baseline on a phone.
  const labelOnTop = labelAt.narrow === 'top' || labelAt.wide === 'top'
  const clear = (v: { x?: number; y?: number }) => (labelOnTop && (v.y ?? 0) < 0 ? { ...v, y: Math.max(v.y ?? 0, -LABEL_GAP_SHARE) } : v)
  const vectors = { from: clear(from), to: clear(to) }
  // The live gate and the ids on stage, handed to chips that are leaving.
  const custom: PresenceCustom = { gate, present }

  // The tight frame's own `+N more` is plain markup outside the presence group: it never moves,
  // enters or leaves with the step's glyphs, so wider frames animate exactly as without it.
  const tightOnly = chips.filter((c) => c.tight === true)
  const items: ReactNode[] = chips.filter((c) => c.tight !== true).map((chip, i) => {
    const moved = before.has(chip.id)
    return (
      <LaneItem
        key={`${chip.id}:${gate.epoch}`}
        id={chip.id}
        className={clsx('min-w-0 max-w-full flex-none', showCls(chip.show), chip.tight === false && 'vz-tight:hidden')}
        {...presence(chip.id, gate, vectors, { moved })}
        custom={custom}
      >
        <Chip
          chip={chip}
          kind={kind}
          focused={focus.has(chip.id)}
          top={vertical && chips.length > 1 && i === chips.length - 1}
        />
      </LaneItem>
    )
  })

  return (
    <div
      data-viz-region={id}
      className={clsx(
        // No visible border (R2): a transparent top and bottom keep the
        // heights; inline, 6 px and no border, so a chip keeps its whole
        // label at very large text on a phone (R9).
        // 6 px above and below on a phone, 8 from 768 (Q15: the phone fit).
        'relative flex min-w-0 border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1',
        radius.row.cls,
        surface.panel,
        labelAt.narrow === 'top'
          ? 'flex-col gap-1'
          : 'flex-row items-start gap-2',
        labelAt.wide === 'top'
          ? 'vz-wide:flex-col vz-wide:items-stretch vz-wide:gap-1'
          : 'vz-wide:flex-row vz-wide:items-start vz-wide:gap-2',
        H_CLS,
        className,
      )}
      style={remHeights(height)}
    >
      <span
        className={clsx(
          'shrink-0',
          typeScale.label.cls,
          ink.secondary,
          labelAt.narrow === 'inline' ? 'flex h-7 w-24 items-center' : 'h-4',
          labelAt.wide === 'inline' ? 'vz-wide:flex vz-wide:h-7 vz-wide:w-24 vz-wide:items-center' : 'vz-wide:h-4 vz-wide:w-auto',
        )}
      >
        {label}
      </span>
      <div
        className={clsx(
          'relative min-h-0 min-w-0 flex-1',
          // Tokens from the first row, top left, in every lane (Q8).
          vertical
            ? 'flex flex-col-reverse items-start justify-end gap-1 self-stretch'
            : 'flex flex-wrap content-start items-center gap-2 self-stretch',
        )}
      >
        {/* Keyed by the instant epoch: an instant render drops chips that are
            still leaving from an earlier step, so nothing old stays visible (D7). */}
        <AnimatePresence
          key={gate.epoch}
          initial={false}
          mode="popLayout"
          custom={custom}
        >
          {items}
        </AnimatePresence>
        {tightOnly.map((chip) => (
          <div key={chip.id} className="hidden min-w-0 max-w-full flex-none vz-tight:block">
            <Chip chip={chip} kind={kind} focused={false} />
          </div>
        ))}
        <span
          aria-hidden
          className={clsx(
            // Where the first token sits, in every lane (Q8).
            'pointer-events-none absolute left-0 top-0 flex h-7 items-center',
            typeScale.tag.cls,
            ink.muted,
            chips.length === 0 ? 'opacity-100' : 'opacity-0',
          )}
          // It appears once a leaving chip has gone (its exit), and goes at
          // once when a chip arrives; instant renders land it (D7).
          style={emptyTransition(gate, chips.length === 0)}
        >
          empty
        </span>
      </div>
    </div>
  )
}

/** The "empty" word's fade: after the exit when it appears, at once when it hides. */
function emptyTransition(gate: MotionGate, appearing: boolean) {
  if (gate.instant) return { transition: 'none' }
  // It goes when the arriving chip starts (the glyph beat, Q1).
  if (!appearing) {
    const at = beatDelay(gate, 'glyph') * 1000
    return { transition: at ? `opacity 0s linear ${at}ms` : 'none' }
  }
  const exit = gate.reduce ? motion.exit.reduced : motion.exit.full
  const fade = motion.highlight.full
  const exitMs = exit.type === 'tween' ? exit.duration * 1000 : 0
  const fadeMs = fade.type === 'tween' ? fade.duration * 1000 : 0
  // After the glyph beat's exit (Q1).
  const after = beatDelay(gate, 'glyph') * 1000 + exitMs
  return { transition: `opacity ${gate.reduce ? 0 : fadeMs}ms linear ${after}ms` }
}
