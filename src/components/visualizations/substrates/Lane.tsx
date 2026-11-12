'use client'

import { AnimatePresence, m, useIsPresent, type MotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { cn as clsx } from '../primitives/cn'
import { Tag } from '../primitives/Tag'
import { ink, now, radius, stroke, surface, type as typeScale } from '../primitives/tokens-v3'
import { transitionFor, travel, type MotionGate } from '../shell/motion'
import type { PerVariant } from '../shell/types'
import { H_CLS } from '../shell/vars'
import { remHeights } from './units'

/**
 * Lanes substrate (spec §6.1): a labelled region holding chips. Glyphs follow
 * §2.2: stack frames are full-width neutral bars, task chips have 4 px corners
 * (`queued`), microtasks are pills (`micro`), host slots are dashed. Changed
 * elements get the `now` emphasis inside the glyph (a lime border doubled by
 * an inset ring, and a tint, D5): never an outline, so it can never be
 * mistaken for keyboard focus. Arrival is shown by the enter motion and the
 * `now` emphasis, so chips carry no `new` tag (D22).
 *
 * Layout (D16): queues wrap; a chip never grows past its lane and truncates
 * its label inside (F5). The engine decides which chips are visible per
 * layout variant (`show`) and adds a `more` chip for the collapsed tail
 * (A1), so the lane never overflows.
 *
 * Motion: a chip that changes place keeps its `data-flip-id`, and the stage's
 * `useFlip` plays the `move` spring from its old position (transform only).
 * New chips `enter` from their arrival side; removed chips `exit`. A chip
 * that moved elsewhere leaves its old lane instantly, so it is never drawn
 * twice.
 */

export type ChipKind = 'frame' | 'task' | 'micro' | 'host'
export type LaneChip = {
  id: string
  label: string
  /** Visible per layout variant (default: both). */
  show?: PerVariant<boolean>
  /** The `+N more` summary of a collapsed queue tail: quiet, sans. */
  more?: boolean
}

/** Classes that show an element only in the variants where `show` is true. */
export function showCls(show?: PerVariant<boolean>): string | undefined {
  if (!show || (show.narrow && show.wide)) return undefined
  if (show.narrow) return 'md:hidden'
  if (show.wide) return 'hidden md:block'
  return 'hidden'
}

const moreCls = clsx('max-w-48 border-dashed px-2 font-sans', radius.chip.cls, stroke.line, typeScale.tag.cls, ink.muted, 'h-7')

/** Chips: 4 px corners (S: §2.2), pills for microtasks, at most 12 rem (`max-w-48`). */
const chipCls: Record<ChipKind, string> = {
  frame: clsx('w-full px-2', radius.chip.cls, stroke.line, surface.glyph, 'h-7 md:h-8'),
  task: clsx('max-w-48 px-2', radius.chip.cls, stroke.queued, surface.chipQueued, 'h-7'),
  micro: clsx('max-w-48 rounded-full px-3', stroke.micro, surface.chipMicro, 'h-7'),
  host: clsx('max-w-48 border-dashed px-2', radius.chip.cls, stroke.line, surface.glyph, 'h-7'),
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
  /** Arrival side for `enter`, departure side for `exit`. */
  from: { x?: number; y?: number }
  to: { x?: number; y?: number }
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
        chip.more ? moreCls : chipCls[kind],
        focused && now.glyph,
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

/** One chip slot. Exiting copies drop `data-flip-id`, so FLIP measures only the live chip. */
const LaneItem = forwardRef<HTMLDivElement, { id: string; className: string; children: ReactNode } & MotionProps>(
  function LaneItem({ id, className, children, ...motionProps }, ref) {
    const present = useIsPresent()
    return (
      <m.div ref={ref} data-glyph={id} className={className} {...motionProps}>
        <div data-flip-id={present ? id : undefined}>{children}</div>
      </m.div>
    )
  },
)

export function Lane(props: LaneProps) {
  const { id, label, kind, chips, labelAt, height, focus, present, before, gate, from, to, className } = props
  const vertical = kind === 'frame'
  const enterT = transitionFor('enter', gate)
  const exitT = transitionFor('exit', gate)
  const dIn = travel('enter', gate)
  const dOut = travel('exit', gate)

  const items: ReactNode[] = chips.map((chip, i) => {
    const moved = before.has(chip.id)
    return (
      <LaneItem
        key={`${chip.id}:${gate.epoch}`}
        id={chip.id}
        className={clsx('min-w-0', vertical ? 'w-full' : 'max-w-full flex-none', showCls(chip.show))}
        initial={moved || gate.instant ? false : { opacity: 0, x: (from.x ?? 0) * dIn, y: (from.y ?? 0) * dIn }}
        animate={{ opacity: 1, x: 0, y: 0, transition: enterT }}
        exit="leave"
        custom={present}
        variants={{
          leave: (stillPresent: ReadonlySet<string> | undefined) =>
            (stillPresent ?? present).has(chip.id)
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0, x: (to.x ?? 0) * dOut, y: (to.y ?? 0) * dOut, transition: exitT },
        }}
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
        'relative flex min-w-0 border p-2',
        radius.row.cls,
        stroke.hairline,
        surface.panel,
        labelAt.narrow === 'top' ? 'flex-col gap-1' : 'flex-row items-center gap-2',
        labelAt.wide === 'top' ? 'md:flex-col md:items-stretch md:gap-1' : 'md:flex-row md:items-center md:gap-2',
        focus.has(id) && now.panel,
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
          labelAt.narrow === 'inline' ? 'w-24' : 'h-4',
          labelAt.wide === 'inline' ? 'md:h-auto md:w-24' : 'md:h-4 md:w-auto',
        )}
      >
        {label}
      </span>
      <div
        className={clsx(
          'relative min-h-0 min-w-0 flex-1',
          vertical
            ? 'flex flex-col-reverse justify-start gap-1 self-stretch'
            : 'flex flex-wrap content-center items-center gap-2 self-stretch',
        )}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={present}>
          {items}
        </AnimatePresence>
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute left-0 flex h-7 items-center',
            typeScale.tag.cls,
            vertical && labelAt.narrow === 'top' ? 'bottom-0' : 'top-1/2 -translate-y-1/2',
            vertical && labelAt.wide === 'inline' && 'md:bottom-auto md:top-1/2 md:-translate-y-1/2',
            ink.muted,
            chips.length === 0 ? 'visible' : 'invisible',
          )}
        >
          empty
        </span>
      </div>
    </div>
  )
}
