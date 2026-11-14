'use client'

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { cn as clsx } from '../primitives/cn'
import { focusRingGroup, motionRules, strokeWidth, tooltipCls, transitionCls } from '../primitives/tokens-v3'
import { stepLabel } from './StepsAsText'
import type { CheckpointStatus } from './machine'

/**
 * The stepper: a single tab stop, `role="slider"` (spec §5.1, §5.2, D12). One
 * tick per step; a checkpoint is a diamond drawn on the step it gates, in
 * place of that step's tick (hollow open, filled answered, crossed skipped).
 * Thumb 28 px inside a 44 px hit area. Keys are handled by the frame so they
 * keep working after a button is clicked.
 *
 * Geometry (F1): the thumb travels on a rail inset by half a thumb on each
 * side; it is the only element that translates, by a share of the rail's own
 * width (`cqw`), so nothing ever extends past the slider. Sizes are in rem, so
 * the slider scales with the reader's text size (D19).
 *
 * Pointer (D12, M18): `touch-action: pan-y`, so a vertical swipe that starts
 * on the slider scrolls the page. A mouse or pen seeks on press and drags. A
 * touch seeks only on a tap, or once the finger has moved `SLOP_PX`
 * horizontally more than vertically; a vertical gesture never changes the
 * step. While dragging, hovering (mouse) or stepping from the keyboard (it
 * lingers `tooltipLingerMs` after the last key), a tooltip beside the thumb,
 * on the track's own line, names the step: it covers ticks, never text (the
 * dock's last line sits right above the bar, R2M-11). It flips to the
 * thumb's left near the end and stays inside the slider.
 *
 * Without container queries (Q17) the thumb is placed by `left` on the rail
 * (`--vz-at`) instead of the `cqw` transform (`src/styles/tailwind.css`).
 *
 * When the thumb sits on a checkpoint's step it carries the diamond itself,
 * so the thumb never hides whether that checkpoint was answered or skipped.
 */

/** Thumb diameter in rem (28 px at the default 16 px root). */
const THUMB_REM = 1.75
/** Finger travel (px) before a touch counts as a horizontal drag, or as a scroll. */
const SLOP_PX = 8
const MAX_TICKS = 24
const STEP_KEYS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

export type ScrubberCheckpoint = { at: number; status: CheckpointStatus }

export type ScrubberProps = {
  index: number
  total: number
  events: readonly string[]
  /** Each checkpoint on the step it gates (its reveal step). */
  checkpoints: readonly ScrubberCheckpoint[]
  valueText: string
  label: string
  interactive: boolean
  animate: boolean
  onSeek: (to: number) => void
}

/**
 * One encoding everywhere (final polish): filled light = answered, hollow =
 * open, crossed = skipped. On the thumb the outline turns dark against the
 * lime, but an answered diamond keeps its light fill, so it never reads as
 * a hole in the thumb (a dark diamond on lime looked hollow).
 */
function Diamond({ status, onThumb = false }: { status: CheckpointStatus; onThumb?: boolean }) {
  const ink = onThumb ? 'stroke-zinc-900' : 'stroke-zinc-100 print:stroke-zinc-900'
  const fill =
    status === 'answered'
      ? 'fill-zinc-100 print:fill-zinc-900'
      : onThumb
        ? 'fill-transparent'
        : 'fill-vz-frame print:fill-white'
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="block h-3 w-3" data-diamond={status}>
      <path d="M6 1 L11 6 L6 11 L1 6 Z" strokeWidth={strokeWidth.connector} className={clsx(ink, fill)} />
      {status === 'skipped' ? <path d="M4 4 L8 8 M8 4 L4 8" strokeWidth={strokeWidth.connector} className={ink} /> : null}
    </svg>
  )
}

type Gesture = { id: number; x: number; y: number; drag: boolean }

export const Scrubber = forwardRef<HTMLDivElement, ScrubberProps>(function Scrubber(
  { index, total, events, checkpoints, valueText, label, interactive, animate, onSeek },
  ref,
) {
  const railRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  // A resize moves the thumb (its offset is in container units) without a
  // change of step: that must land at once, not ease (D7, M03).
  useEffect(() => {
    const rail = railRef.current
    if (!rail || typeof ResizeObserver === 'undefined') return
    let width = rail.offsetWidth
    let raf = 0
    const ro = new ResizeObserver(() => {
      if (rail.offsetWidth === width) return
      width = rail.offsetWidth
      rail.dataset.resizing = ''
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => requestAnimationFrame(() => delete rail.dataset.resizing))
    })
    ro.observe(rail)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
  const [keyTip, setKeyTip] = useState(false)
  const keyTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(keyTimer.current), [])
  const last = Math.max(1, total - 1)
  const fraction = (n: number) => n / last

  const stepAt = (clientX: number) => {
    const rect = railRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return index
    const f = (clientX - rect.left) / rect.width
    return Math.max(0, Math.min(last, Math.round(f * last)))
  }

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    const n = stepAt(e.clientX)
    if (n !== index) onSeek(n)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || e.button !== 0) return
    gesture.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      drag: false,
    }
    // A mouse or a pen has no scroll gesture to compete with: seek on press.
    if (e.pointerType !== 'touch') {
      gesture.current.drag = true
      startDrag(e)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return
    if (e.pointerType === 'mouse') setHover(stepAt(e.clientX))
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    if (!g.drag) {
      const dx = Math.abs(e.clientX - g.x)
      const dy = Math.abs(e.clientY - g.y)
      if (dx > SLOP_PX && dx > dy) {
        g.drag = true
        startDrag(e)
      } else if (dy > SLOP_PX) {
        // A vertical swipe: the page scrolls (pan-y) and the step stays.
        gesture.current = null
      }
      return
    }
    const n = stepAt(e.clientX)
    if (n !== index) onSeek(n)
  }

  const endGesture = (e: ReactPointerEvent<HTMLDivElement>, commit: boolean) => {
    const g = gesture.current
    if (g && g.id === e.pointerId && !g.drag && commit) {
      // A tap: seek where the finger lifted.
      const n = stepAt(e.clientX)
      if (n !== index) onSeek(n)
    }
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    gesture.current = null
    setDragging(false)
  }

  const tip = !interactive ? null : dragging ? index : (hover ?? (keyTip ? index : null))
  const showTicks = total <= MAX_TICKS
  const gated = new Set(checkpoints.map((c) => c.at))
  const onThumb = checkpoints.find((c) => c.at === index)

  // Keep the tooltip inside the slider: centred on the thumb, clamped at the ends.
  useLayoutEffect(() => {
    const t = tipRef.current
    const rail = railRef.current
    if (tip === null || !t || !rail) return
    // In layout px: `style.left` is laid out before any CSS zoom or scale on
    // an ancestor, so client rects are divided by that scale (R13 under CSS zoom).
    const hostEl = rail.parentElement!
    const host = hostEl.getBoundingClientRect()
    const k = hostEl.offsetWidth > 0 ? host.width / hostEl.offsetWidth : 1
    const r = rail.getBoundingClientRect()
    const centre = (r.left - host.left) / k + fraction(tip) * rail.offsetWidth
    const w = t.offsetWidth
    // Beside the thumb (half a thumb plus a 4 px gap), on its right, or on its left where the right runs out.
    const off = (THUMB_REM / 2) * parseFloat(getComputedStyle(document.documentElement).fontSize) + 4
    const right = centre + off
    t.style.left = `${right + w <= hostEl.offsetWidth ? right : Math.max(0, centre - off - w)}px`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip, total])

  const half = `${THUMB_REM / 2}rem`
  const thumbStyle: CSSProperties = {
    width: `${THUMB_REM}rem`,
    height: `${THUMB_REM}rem`,
    marginLeft: `-${half}`,
    transform: `translate(calc(${fraction(index)} * 100cqw), -50%)`,
    ['--vz-at' as string]: `${fraction(index) * 100}%`,
    ['--vz-up' as string]: '-50%',
  }

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
      onPointerUp={(e) => endGesture(e, true)}
      onPointerCancel={(e) => endGesture(e, false)}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setKeyTip(false)}
      onKeyDown={(e) => {
        if (!STEP_KEYS.has(e.key)) return
        setKeyTip(true)
        window.clearTimeout(keyTimer.current)
        keyTimer.current = window.setTimeout(() => setKeyTip(false), motionRules.tooltipLingerMs)
      }}
      // Focus shows as the shared ring around the thumb, not a box around the track.
      className={clsx(
        'group relative h-11 w-full touch-pan-y select-none outline-none',
        interactive && 'cursor-pointer',
      )}
    >
      <div
        ref={railRef}
        data-viz-part="scrubber-rail"
        className="absolute inset-y-0 [&[data-resizing]_*]:!transition-none"
        style={{ left: half, right: half, containerType: 'inline-size' }}
      >
        {/* Track: a 2 px `line` rule between the thumb centres, progress in the accent. */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-zinc-500" />
        {/* Progress is revealed by a clip, so its box never changes size or leaves the rail. */}
        <div
          className={clsx(
            'absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-lime-500 print:bg-lime-700',
            animate ? transitionCls.highlight : transitionCls.instant,
          )}
          style={{ clipPath: `inset(0 ${(1 - fraction(index)) * 100}% 0 0)` }}
        />
        {showTicks
          ? Array.from({ length: total }, (_, n) =>
              gated.has(n) ? null : (
                <span
                  key={n}
                  aria-hidden
                  className={clsx(
                    'absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2',
                    n <= index ? 'bg-lime-500 print:bg-lime-700' : 'bg-zinc-500',
                  )}
                  style={{ left: `${fraction(n) * 100}%` }}
                />
              ),
            )
          : null}
        {checkpoints.map((cp) => (
          <span
            key={cp.at}
            aria-hidden
            data-checkpoint={cp.status}
            data-checkpoint-step={cp.at}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${fraction(cp.at) * 100}%` }}
          >
            <Diamond status={cp.status} />
          </span>
        ))}
        {/* Thumb: the only element that translates. */}
        <span
          aria-hidden
          data-viz-part="scrubber-thumb"
          className={clsx(
            'absolute left-0 top-1/2 flex items-center justify-center rounded-full border-2 border-vz-frame print:border-white print:bg-lime-700',
            dragging ? 'bg-lime-600' : 'bg-lime-500 group-active:bg-lime-600',
            focusRingGroup,
            animate ? transitionCls.highlight : transitionCls.instant,
          )}
          style={thumbStyle}
        >
          {onThumb ? <Diamond status={onThumb.status} onThumb /> : null}
        </span>
      </div>
      {tip !== null ? (
        <div
          ref={tipRef}
          aria-hidden
          data-viz-part="scrubber-tip"
          // It names the step beside the thumb, on the track (R2M-11).
          data-viz-layer="overlay"
          className={clsx('pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2 whitespace-nowrap', tooltipCls)}
        >
          {stepLabel(tip, events[tip])}
        </div>
      ) : null}
    </div>
  )
})
