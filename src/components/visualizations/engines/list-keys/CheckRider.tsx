'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { liftShadow, radius, reveal } from '../../primitives/tokens-v3'
import { liftAt } from '../../shell/flip'

/**
 * The list-keys reveal (D21): the actual checkbox rides its own match line.
 *
 * Each checked Before row whose instance React reused sends a copy of its
 * checkbox (the checked state glyph) from the Before checkbox, along the
 * row's match line, into the After row that instance now renders. It lifts
 * with the one lift shadow (D6) and sets down on the destination box, which
 * then ticks. The learner sees the state follow the instance, not the text:
 * with index keys it lands on another todo.
 *
 * - The path is one smooth curve: a level cubic from the Before checkbox to
 *   the line's start, the match line itself (the same cubic the lines use),
 *   and a level cubic into the After checkbox. Sampled by arc length, so the
 *   `reveal.ride` curve sets the pace, not the geometry.
 * - The tracked row's checkbox leaves first; a second leaves
 *   `reveal.riderGapMs` later, so riders on crossing lines never meet.
 * - Web Animations only, started before the first paint of the reveal. A
 *   resize finishes every ride at once (they land), and leaving the reveal
 *   unmounts them, so nothing ever runs after an instant command (D7).
 */

export type Ride = {
  /** Before row id (`before-0`) and After row id (`after-1`). */
  from: string
  to: string
  /** The match line's ends in layout units (px at a 16 px root), as `Lines` draws it. */
  y1: number
  y2: number
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const CHECK_PATH = 'M3.5 8.5 6.5 11.5 12.5 5'
const RIDE_ID = 'viz-ride'
const SAMPLES = 48

type P = { x: number; y: number }

const cubic = (a: P, b: P, c: P, d: P) => (t: number): P => {
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  }
}

/** A cubic with level ends from `a` to `b` (the match-line shape). */
const level = (a: P, b: P) => {
  const mx = (a.x + b.x) / 2
  return cubic(a, { x: mx, y: a.y }, { x: mx, y: b.y }, b)
}

/** Points along the whole ride, evenly spaced by arc length. */
export function ridePath(start: P, lineStart: P, lineEnd: P, end: P, n = SAMPLES): P[] {
  const parts = [level(start, lineStart), level(lineStart, lineEnd), level(lineEnd, end)]
  const dense: P[] = []
  for (const f of parts) for (let i = 0; i <= 64; i++) dense.push(f(i / 64))
  const acc = [0]
  for (let i = 1; i < dense.length; i++)
    acc.push(acc[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y))
  const total = acc[acc.length - 1] || 1
  const out: P[] = []
  let j = 0
  for (let i = 0; i <= n; i++) {
    const s = (total * i) / n
    while (j < acc.length - 2 && acc[j + 1] < s) j++
    const span = acc[j + 1] - acc[j] || 1
    const k = Math.min(1, Math.max(0, (s - acc[j]) / span))
    out.push({ x: dense[j].x + (dense[j + 1].x - dense[j].x) * k, y: dense[j].y + (dense[j + 1].y - dense[j].y) * k })
  }
  return out
}

function centerIn(el: Element | null, root: DOMRect): P | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left - root.left + r.width / 2, y: r.top - root.top + r.height / 2 }
}

/** Finishes every ride under `root` (they land at once). */
export function finishRides(root: HTMLElement | null) {
  if (!root || typeof root.getAnimations !== 'function') return
  for (const a of root.getAnimations({ subtree: true })) if (a.id === RIDE_ID) a.finish()
}

export function CheckRiders({
  rides,
  rootRef,
  linesRef,
  onLand,
}: {
  rides: Ride[]
  rootRef: RefObject<HTMLElement>
  linesRef: RefObject<HTMLElement>
  onLand: (to: string) => void
}) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const landRef = useRef(onLand)
  landRef.current = onLand

  // Before the first paint of the reveal: measure, then start every ride.
  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const lines = linesRef.current
    if (!root || !lines || typeof Element.prototype.animate !== 'function') {
      rides.forEach((r) => landRef.current(r.to))
      return
    }
    const box = root.getBoundingClientRect()
    const gutter = lines.getBoundingClientRect()
    const k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
    const left = gutter.left - box.left
    const top = gutter.top - box.top
    const anims: Animation[] = []
    rides.forEach((r, i) => {
      const node = refs.current[i]
      const start = centerIn(root.querySelector(`[data-row="${r.from}"] input[type="checkbox"]`), box)
      const end = centerIn(root.querySelector(`[data-row="${r.to}"] [data-check]`), box)
      if (!node || !start || !end) return landRef.current(r.to)
      const pts = ridePath(start, { x: left, y: top + r.y1 * k }, { x: left + gutter.width, y: top + r.y2 * k }, end)
      const timing: KeyframeAnimationOptions = {
        duration: reveal.ride.duration * 1000,
        delay: i * reveal.riderGapMs,
        easing: `cubic-bezier(${reveal.ride.ease.join(', ')})`,
        fill: 'both',
      }
      const ride = node.animate(
        pts.map((p, j) => {
          const t = j / (pts.length - 1)
          return {
            offset: t,
            opacity: 1,
            transform: `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) translate(-50%, -50%)`,
            boxShadow: liftShadow(liftAt(t)),
          }
        }),
        timing,
      )
      ride.id = RIDE_ID
      // The tick it carries sets down with it: the destination draws its own.
      const tick = node.firstElementChild as SVGElement | null
      const fade = tick?.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: 0.7, opacity: 1 },
          { offset: 1, opacity: 0 },
        ],
        timing,
      )
      if (fade) fade.id = RIDE_ID
      anims.push(ride)
      ride.finished.then(
        () => landRef.current(r.to),
        () => {},
      )
    })
    return () => anims.forEach((a) => a.cancel())
    // Once per reveal: the parent keys this component by the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A resize or a font swap mid-ride lands every rider at once.
  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    let w = root.offsetWidth
    const ro = new ResizeObserver(() => {
      if (root.offsetWidth === w) return
      w = root.offsetWidth
      finishRides(root)
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [rootRef])

  return (
    <>
      {rides.map((r, i) => (
        <span
          key={`${r.from}-${r.to}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          aria-hidden
          data-viz-reveal="rider"
          data-from={r.from}
          data-to={r.to}
          className={clsx(
            // Hidden until its ride places it (the ride starts before paint).
            'pointer-events-none absolute left-0 top-0 z-20 flex h-4 w-4 items-center justify-center border border-zinc-100 bg-zinc-100 opacity-0',
            radius.chip.cls,
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-zinc-900">
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
      ))}
    </>
  )
}
