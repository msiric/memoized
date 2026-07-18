'use client'

import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { VizControls } from './primitives/VizControls'
import { VizFrame } from './primitives/VizFrame'
import { useMounted } from './primitives/useMounted'
import { useStepper } from './primitives/useStepper'
import { viz } from './primitives/tokens'

/**
 * A reusable, data-driven step-through for temporal JavaScript topics: the event
 * loop, the call stack, and async ordering. The author provides a step-log of
 * runtime states (which chips are in each lane per frame). Chips animate in and
 * out with framer-motion's layout animations, so there are no hand-placed
 * coordinates. Built on the shared stepper, frame, controls, and tokens.
 */

export type LaneId = 'stack' | 'webapi' | 'micro' | 'macro' | 'console'

export type SequenceFrame = {
  stack: string[]
  webapi: string[]
  micro: string[]
  macro: string[]
  console: string[]
  note: string
  /** 0-based line to highlight in the code panel, if any. */
  line?: number
}

export type SequenceStepperProps = {
  frames: SequenceFrame[]
  code?: string[]
  label?: string
}

/** Uniform chip height and gap, so reserved heights are predictable. */
const CHIP_H = 28
const CHIP_GAP = 6
const CONSOLE_LINE = 24

/** A single chip. Fixed height, single line, truncates with a tooltip so it always fits. */
function Chip({ text, chipClass }: { text: string; chipClass: string }) {
  return (
    <span title={text} className={clsx(viz.chip.base, chipClass, 'min-w-0 max-w-full')}>
      <span className="truncate">{text}</span>
    </span>
  )
}

/**
 * A lane of chips. Its height is FIXED to the reserved footprint (from the data's
 * deepest frame), so the surrounding layout can never move — not even mid-
 * animation or when Step/Back is clicked rapidly. Exiting chips use popLayout, so
 * they animate out of flow without pushing siblings. Vertical lanes (the call
 * stack) stack upward; horizontal lanes (queues) are a single row that scrolls
 * if the data ever holds more chips than fit.
 */
function Lane({
  label,
  chipClass,
  chips,
  orientation,
  reserveCount,
  reduce,
  mounted,
}: {
  label: string
  chipClass: string
  chips: string[]
  orientation: 'vertical' | 'horizontal'
  reserveCount: number
  reduce: boolean | null
  mounted: boolean
}) {
  const vertical = orientation === 'vertical'
  const height = vertical
    ? Math.max(1, reserveCount) * CHIP_H + (Math.max(1, reserveCount) - 1) * CHIP_GAP
    : CHIP_H
  // Width intentionally encodes the data structure: vertical call-stack frames are
  // full-width bars (a stack reads as stacked layers), while horizontal queue items
  // are content-width tokens (a queue holds several side by side, so each hugs its
  // text and full-width would collide). This asymmetry is deliberate, not a bug.
  const itemClass = vertical ? 'w-full' : 'max-w-[12rem] flex-none'
  const items = chips.map((chip) =>
    mounted ? (
      <motion.div
        key={chip}
        layout={!reduce}
        initial={reduce ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: reduce ? 0 : 0.24 }}
        className={clsx('min-w-0', itemClass)}
      >
        <Chip text={chip} chipClass={chipClass} />
      </motion.div>
    ) : (
      <div key={chip} className={clsx('min-w-0', itemClass)}>
        <Chip text={chip} chipClass={chipClass} />
      </div>
    ),
  )
  return (
    <div className="rounded-lg border border-zinc-200 bg-white/60 p-2.5 dark:border-zinc-700/70 dark:bg-zinc-900/40">
      <div className={viz.laneLabel}>{label}</div>
      {/* A relative wrapper so the "empty" overlay never shares a parent with the
          popLayout-managed chip row. Mixing a conditionally-mounted sibling into the
          same container that framer-motion imperatively reorders desyncs React's
          reconciliation (the label keeps a stale className after a step). Keeping the
          chips in their own row and the label as an always-mounted, opacity-toggled
          overlay makes both subtrees reconcile independently and stay stable. */}
      <div className="relative" style={{ height }}>
        <div
          className={clsx(
            'flex h-full',
            vertical ? 'flex-col-reverse justify-end gap-1.5' : 'flex-row items-center gap-1.5 overflow-x-auto',
          )}
        >
          {mounted ? (
            <AnimatePresence initial={false} mode="popLayout">
              {items}
            </AnimatePresence>
          ) : (
            items
          )}
        </div>
        {/* Plain CSS-transition span, NOT a framer-motion component: framer injects
            client-only inline styles that differ from the SSR output, tripping
            hydration for an always-mounted element; a class-toggled opacity fades
            identically on server and client. The label occupies the top chip slot
            (CHIP_H tall) in every lane, so the placeholder always reads directly under
            the lane label and lines up with where the first chip renders — horizontal
            queues fill the row from the left, the vertical call stack packs frames at
            the top — regardless of the lane's reserved height. */}
        <span
          aria-hidden={chips.length !== 0}
          style={{ height: CHIP_H }}
          className={clsx(
            'pointer-events-none absolute left-0 top-0 flex items-center text-[11px] italic text-zinc-400 transition-opacity',
            reduce ? 'duration-0' : 'duration-200',
            chips.length === 0 ? 'opacity-100' : 'opacity-0',
          )}
        >
          empty
        </span>
      </div>
    </div>
  )
}

export function SequenceStepper({ frames, code, label }: SequenceStepperProps) {
  const stepper = useStepper(frames.length, { ariaLabel: 'Event loop step-through' })
  const reduce = useReducedMotion()
  const mounted = useMounted()
  const frame = frames[stepper.index]

  // Reserve every lane from the deepest frame so the stage never reflows.
  const reserve = useMemo(() => {
    const max = { stack: 1, webapi: 1, micro: 1, macro: 1, console: 1 }
    for (const f of frames) {
      max.stack = Math.max(max.stack, f.stack.length)
      max.webapi = Math.max(max.webapi, f.webapi.length)
      max.micro = Math.max(max.micro, f.micro.length)
      max.macro = Math.max(max.macro, f.macro.length)
      max.console = Math.max(max.console, f.console.length)
    }
    return max
  }, [frames])

  const highlighted = useMemo(() => new Set(code ? [frame.line ?? -1] : []), [code, frame.line])

  return (
    <VizFrame
      label={label}
      caption={frame.note}
      captionReserve={frames.map((fr) => fr.note)}
      controls={<VizControls stepper={stepper} />}
      containerProps={stepper.containerProps}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {code ? (
          <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-2.5 font-mono text-xs leading-6 dark:border-zinc-700 dark:bg-zinc-900" data-testid="code-panel">
            {code.map((ln, i) => (
              <div
                key={i}
                className={clsx(
                  'rounded px-1.5',
                  highlighted.has(i)
                    ? 'bg-lime-400/15 text-zinc-900 ring-1 ring-inset ring-lime-500/40 dark:text-white'
                    : 'text-zinc-500 dark:text-zinc-400',
                )}
              >
                {ln === '' ? '\u00A0' : ln}
              </div>
            ))}
          </pre>
        ) : null}

        <div className="flex flex-col gap-2.5" data-testid="lanes">
          <Lane label="Call stack" chipClass={viz.chip.stack} chips={frame.stack} orientation="vertical" reserveCount={reserve.stack} reduce={reduce} mounted={mounted} />
          <Lane label="Web APIs" chipClass={viz.chip.webapi} chips={frame.webapi} orientation="horizontal" reserveCount={reserve.webapi} reduce={reduce} mounted={mounted} />
          <Lane label="Microtask queue" chipClass={viz.chip.micro} chips={frame.micro} orientation="horizontal" reserveCount={reserve.micro} reduce={reduce} mounted={mounted} />
          <Lane label="Macrotask queue" chipClass={viz.chip.macro} chips={frame.macro} orientation="horizontal" reserveCount={reserve.macro} reduce={reduce} mounted={mounted} />
        </div>
      </div>

      {/* Console: a log whose height is reserved for the most output any frame prints. */}
      <div className="mt-2.5 rounded-lg border border-zinc-200 bg-white/60 p-2.5 dark:border-zinc-700/70 dark:bg-zinc-900/40">
        <div className={viz.laneLabel}>Console</div>
        <div className="font-mono text-xs leading-6" style={{ height: reserve.console * CONSOLE_LINE }} data-testid="console">
          {frame.console.length === 0 ? (
            <span className="text-[11px] italic text-zinc-400">no output yet</span>
          ) : (
            frame.console.map((line, i) => (
              <div key={i} className="truncate text-emerald-700 dark:text-emerald-300">
                &rsaquo; {line}
              </div>
            ))
          )}
        </div>
      </div>
    </VizFrame>
  )
}
