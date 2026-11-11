'use client'

import clsx from 'clsx'
import { forwardRef, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { transitionCls } from '../primitives/tokens-v2'
import type { CheckpointStatus } from './machine'

/**
 * The stepper: a single tab stop, `role="slider"` (spec §5.1, §5.2). One tick
 * per step, diamond ticks for checkpoints (hollow open, filled answered,
 * crossed skipped). Thumb 28 px inside a 44 px hit area. Keys are handled by
 * the frame so they keep working after a button is clicked.
 */

const THUMB = 28
const MAX_TICKS = 24

export type ScrubberProps = {
  index: number
  total: number
  events: readonly string[]
  checkpoints: readonly { at: number; status: CheckpointStatus }[]
  valueText: string
  label: string
  interactive: boolean
  animate: boolean
  onSeek: (to: number) => void
  onFocus?: () => void
  onBlur?: () => void
}

function Diamond({ status }: { status: CheckpointStatus }) {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" className="block">
      <path
        d="M6 1 L11 6 L6 11 L1 6 Z"
        strokeWidth="1.5"
        className={clsx(
          'stroke-zinc-100 print:stroke-zinc-900',
          status === 'answered' ? 'fill-zinc-100 print:fill-zinc-900' : 'fill-[#1e1e21] print:fill-white',
        )}
      />
      {status === 'skipped' ? <path d="M4 4 L8 8 M8 4 L4 8" strokeWidth="1.5" className="stroke-zinc-100" /> : null}
    </svg>
  )
}

export const Scrubber = forwardRef<HTMLDivElement, ScrubberProps>(function Scrubber(
  { index, total, events, checkpoints, valueText, label, interactive, animate, onSeek, onFocus, onBlur },
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const last = Math.max(1, total - 1)
  const fraction = (n: number) => n / last
  const stepAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= THUMB) return index
    const f = (clientX - rect.left - THUMB / 2) / (rect.width - THUMB)
    return Math.max(0, Math.min(last, Math.round(f * last)))
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    onSeek(stepAt(e.clientX))
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    const n = stepAt(e.clientX)
    if (e.pointerType === 'mouse') setHover(n)
    if (dragging && n !== index) onSeek(n)
  }
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
  }
  const tip = dragging ? index : hover
  const showTicks = total <= MAX_TICKS

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={interactive ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={last}
      aria-valuenow={index}
      aria-valuetext={valueText}
      aria-disabled={interactive ? undefined : true}
      aria-keyshortcuts="ArrowRight ArrowLeft Home End Space K Escape"
      data-viz-focus="stepper"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => setHover(null)}
      onFocus={onFocus}
      onBlur={onBlur}
      // Focus shows as a 2 px `now` ring around the thumb (offset 2), not a
      // box around the whole track.
      className={clsx(
        'group relative h-11 w-full touch-none select-none outline-none',
        interactive && 'cursor-pointer',
      )}
    >
      <div ref={trackRef} className="absolute inset-0">
        {/* Track: a 2 px `line` rule between the thumb centres. */}
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-zinc-500"
          style={{ left: THUMB / 2, right: THUMB / 2 }}
        />
        <div
          className="absolute top-1/2 h-0.5 -translate-y-1/2 overflow-hidden"
          style={{ left: THUMB / 2, right: THUMB / 2 }}
        >
          <div
            className={clsx('h-full w-full bg-lime-400', animate && transitionCls.highlight)}
            style={{ transform: `translateX(${(fraction(index) - 1) * 100}%)` }}
          />
        </div>
        {/* Ticks and checkpoint diamonds, centred on each step position. */}
        <div className="absolute inset-y-0" style={{ left: THUMB / 2, right: THUMB / 2 }}>
          {showTicks
            ? Array.from({ length: total }, (_, n) => (
                <span
                  key={n}
                  aria-hidden
                  className={clsx(
                    'absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2',
                    n <= index ? 'bg-lime-400' : 'bg-zinc-500',
                  )}
                  style={{ left: `${fraction(n) * 100}%` }}
                />
              ))
            : null}
          {checkpoints.map((cp) => (
            <span
              key={cp.at}
              aria-hidden
              data-checkpoint={cp.status}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${fraction(cp.at) * 100}%` }}
            >
              <Diamond status={cp.status} />
            </span>
          ))}
        </div>
        {/* Thumb: moves by translate only. */}
        <div className="pointer-events-none absolute inset-y-0 left-0" style={{ right: THUMB }}>
          <div
            className={clsx('absolute inset-y-0 left-0 w-full', animate && transitionCls.highlight)}
            style={{ transform: `translateX(${fraction(index) * 100}%)` }}
          >
            <span
              aria-hidden
              className="absolute left-0 top-1/2 block h-7 w-7 -translate-y-1/2 rounded-full border-2 border-[#1e1e21] bg-lime-400 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-lime-400 print:border-white print:bg-lime-700"
            />
          </div>
        </div>
        {tip !== null && interactive ? (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[12px] leading-4 text-zinc-100"
            style={{ left: `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${fraction(tip)})` }}
          >
            {tip === 0 ? 'Start' : `Step ${tip}: ${events[tip]}`}
          </div>
        ) : null}
      </div>
    </div>
  )
})
