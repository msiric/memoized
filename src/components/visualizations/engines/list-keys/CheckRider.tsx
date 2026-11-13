'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { liftShadow } from '../../primitives/tokens-v3'
import { checkedBoxCls, Tick } from './CheckBox'
import { RIDE, WRAPPER_DRAW_MS, VERDICT_FADE_MS } from './reveal'

/**
 * The list-keys reveal (D21), directed as one gesture (H3 R6).
 *
 * - **Lift-off.** Each carried check starts exactly on its Before box, which
 *   reads empty from the first frame (the state leaves the instance, it is
 *   not copied). It lifts (scale and the one lift shadow, D6) as it moves.
 * - **The path.** Out of the box along the first line's height to the card
 *   edge that faces the lines, along its match line, and into the After box
 *   at the same height: the checkbox sits on that edge, so the path never
 *   crosses row text or an instance letter. The path is the drawn SVG line
 *   itself (`getPointAtLength`), so the rider can never leave it, side by
 *   side or stacked.
 * - **One curve.** The rider and every line share the stage curve. The
 *   ridden line draws behind the rider (its head is under the rider), so the
 *   state pulls its own thread; the other lines draw on the same timing.
 * - **Landing.** The tick rides at full strength; at the box the rider sets
 *   down with a single 120 ms settle (scale and shadow to rest), identical to
 *   the checked box under it, which takes over in the same frame.
 * - **Two checks.** The second leaves only when it can no longer meet the
 *   first: the gap is the smallest that keeps the riders `clearance` apart
 *   along both paths (it waits for the first to clear a crossing).
 * - **Arrivals.** A row's instance shows when its line reaches it; mounted
 *   rows and unmounted instances when the first line arrives. The verdict
 *   follows the last landing (`onLanded`).
 *
 * Web Animations only, started before the first paint of the reveal. A
 * resize lands everything at once; leaving the reveal unmounts the director,
 * which cancels everything, so nothing runs after an instant command (D7).
 */

export type Ride = {
  /** Before row id (`before-0`) and After row id (`after-1`). */
  from: string
  to: string
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Every animation the reveal starts carries this id (the harness finds them by it). */
const RIDE_ID = 'viz-ride'
const SAMPLES = 64

type P = { x: number; y: number }

/** A CSS cubic-bezier as a function of progress, and its inverse (bisection). */
function bezier([x1, y1, x2, y2]: readonly number[]) {
  const coord = (a: number, b: number) => (t: number) => {
    const u = 1 - t
    return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
  }
  const X = coord(x1, x2)
  const Y = coord(y1, y2)
  const solve = (f: (t: number) => number, v: number) => {
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (f(mid) < v) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }
  return {
    /** Eased progress at time fraction `x`. */
    at: (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : Y(solve(X, x))),
    /** Time fraction at which eased progress reaches `y`. */
    when: (y: number) => (y <= 0 ? 0 : y >= 1 ? 1 : X(solve(Y, y))),
  }
}

const EASE_FN = bezier(RIDE.ease)
const EASE_CSS = `cubic-bezier(${RIDE.ease.join(', ')})`
const smooth = (t: number) => t * t * (3 - 2 * t)
/** A line's end dot appears the moment its line arrives. */
const SNAP: KeyframeAnimationOptions = { duration: RIDE.settleMs, easing: 'steps(1, start)', fill: 'both' }

/** A polyline with its cumulative arc length. */
function measure(pts: P[]) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  const total = acc[acc.length - 1] || 1
  const at = (s: number): P => {
    let j = 0
    while (j < acc.length - 2 && acc[j + 1] < s) j++
    const span = acc[j + 1] - acc[j] || 1
    const k = Math.min(1, Math.max(0, (s - acc[j]) / span))
    return { x: pts[j].x + (pts[j + 1].x - pts[j].x) * k, y: pts[j].y + (pts[j + 1].y - pts[j].y) * k }
  }
  return { total, at, acc }
}

type Plan = {
  ride: Ride
  /** A check rides this line (otherwise it only draws). */
  rider: boolean
  path: ReturnType<typeof measure>
  /** Arc length of the first leg (box to line) and of the line. */
  lead: number
  line: number
  draw: SVGPathElement | null
  end: SVGElement | null
}

/** Rider position at `t` ms after its own start (at rest before and after). */
function positionAt(plan: Plan, travel: number, t: number): P {
  if (t <= 0) return plan.path.at(0)
  if (t >= travel) return plan.path.at(plan.path.total)
  return plan.path.at(EASE_FN.at(t / travel) * plan.path.total)
}

/** The smallest departure gap that keeps two riders `clear` px apart everywhere. */
export function riderGap(a: Plan, b: Plan, travel: number, clear: number): number {
  const end = travel + RIDE.settleMs
  for (let gap = RIDE.minGapMs; gap <= end; gap += 10) {
    let ok = true
    for (let t = 0; t <= end + gap && ok; t += 8) {
      const p = positionAt(a, travel, t)
      const q = positionAt(b, travel, t - gap)
      if (Math.hypot(p.x - q.x, p.y - q.y) < clear) ok = false
    }
    if (ok) return gap
  }
  return end
}

export function RevealDirector({
  scene,
  rides,
  rootRef,
  onArrive,
  onLand,
  onLanded,
}: {
  scene: 'list' | 'wrapper'
  rides: readonly Ride[]
  rootRef: RefObject<HTMLElement>
  onArrive: (row: string) => void
  onLand: (row: string) => void
  onLanded: (instant: boolean) => void
}) {
  const refs = useRef<(HTMLSpanElement | null)[]>([])
  const cb = useRef({ onArrive, onLand, onLanded })
  cb.current = { onArrive, onLand, onLanded }

  useIsoLayoutEffect(() => {
    const root = rootRef.current
    const { onArrive: arrive, onLand: land, onLanded: landed } = cb.current
    const rows = () => [...(root?.querySelectorAll<HTMLElement>('[data-row]') ?? [])].map((r) => r.dataset.row!)
    if (!root || typeof Element.prototype.animate !== 'function') {
      rows().forEach(arrive)
      rides.forEach((r) => land(r.to))
      landed(true)
      return
    }

    // Local layout px inside the root: client rects divided by any zoom.
    const rect = root.getBoundingClientRect()
    const z = rect.width / (root.offsetWidth || rect.width) || 1
    const local = (x: number, y: number): P => ({ x: (x - rect.left) / z, y: (y - rect.top) / z })
    const centerOf = (el: Element | null): P | null => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return local(r.left + r.width / 2, r.top + r.height / 2)
    }
    const linePoints = (path: SVGPathElement): P[] => {
      const ctm = path.getScreenCTM()
      const L = path.getTotalLength()
      if (!ctm || !L) return []
      return Array.from({ length: 41 }, (_, i) => {
        const p = path.getPointAtLength((L * i) / 40)
        const q = new DOMPoint(p.x, p.y).matrixTransform(ctm)
        return local(q.x, q.y)
      })
    }

    const anims: Animation[] = []
    const timers: number[] = []
    let done = false
    const track = (a: Animation) => {
      a.id = RIDE_ID
      anims.push(a)
      return a
    }

    // One plan per reused line: ridden lines carry their rider's path.
    const plans: Plan[] = []
    for (const g of root.querySelectorAll<SVGGElement>('[data-link="reused"]')) {
      const from = g.getAttribute('data-from')!
      const to = g.getAttribute('data-to')!
      const draw = g.querySelector<SVGPathElement>('[data-lk-draw]')
      const line = draw ? linePoints(draw) : []
      if (line.length < 2) continue
      const ride = rides.find((r) => r.from === from && r.to === to)
      const start = ride ? centerOf(root.querySelector(`[data-row="${from}"] [data-lk-check]`)) : null
      const end = ride ? centerOf(root.querySelector(`[data-row="${to}"] [data-lk-check]`)) : null
      const pts = start && end ? [start, ...line, end] : line
      const path = measure(pts)
      const lineLen = measure(line).total
      const rider = Boolean(ride && start && end)
      plans.push({
        ride: { from, to },
        rider,
        path,
        lead: rider ? Math.hypot(line[0].x - start!.x, line[0].y - start!.y) : 0,
        line: lineLen,
        draw,
        end: g.querySelector<SVGElement>('[data-lk-end]'),
      })
    }
    const ridden = rides
      .map((r) => plans.find((p) => p.rider && p.ride.from === r.from && p.ride.to === r.to))
      .filter((p): p is Plan => Boolean(p))

    // Timing: travel shortened (never below the floor) until the whole
    // moment, verdict fade included, fits the reveal budget (D21).
    const k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1
    const clear = 16 * k * RIDE.clearance
    let travel = scene === 'wrapper' ? WRAPPER_DRAW_MS : RIDE.travelMs
    let gaps = ridden.map(() => 0)
    for (;;) {
      gaps = ridden.map((p, i) => (i === 0 ? 0 : riderGap(ridden[0], p, travel, clear)))
      const total = Math.max(0, ...gaps) + travel + (ridden.length ? RIDE.settleMs : 0) + VERDICT_FADE_MS
      if (total <= RIDE.maxMs || travel <= RIDE.minTravelMs) break
      travel = Math.max(RIDE.minTravelMs, travel - 20)
    }
    const span = travel + RIDE.settleMs
    const travelShare = travel / span

    const arrivals: { at: number; row: string }[] = []

    // Riders: arc-length samples placed in time by the shared curve.
    ridden.forEach((plan, i) => {
      const node = refs.current[rides.findIndex((r) => r.from === plan.ride.from && r.to === plan.ride.to)]
      const delay = gaps[i]
      const frames: Keyframe[] = []
      const dash: Keyframe[] = []
      for (let j = 0; j <= SAMPLES; j++) {
        const u = j / SAMPLES
        const when = EASE_FN.when(u)
        const p = plan.path.at(u * plan.path.total)
        const lift = smooth(Math.min(1, when / 0.3))
        frames.push({
          offset: when * travelShare,
          transform: `translate(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px) translate(-50%, -50%) scale(${(1 + RIDE.liftScale * lift).toFixed(3)})`,
          boxShadow: liftShadow(lift),
          opacity: 1,
        })
        const drawn = Math.min(1, Math.max(0, (u * plan.path.total - plan.lead) / (plan.line || 1)))
        dash.push({ offset: when * travelShare, strokeDashoffset: String(drawn >= 1 ? 0 : 1.001 - drawn) })
      }
      const endP = plan.path.at(plan.path.total)
      frames[frames.length - 1].easing = EASE_CSS
      frames.push({
        offset: 1,
        transform: `translate(${endP.x.toFixed(2)}px, ${endP.y.toFixed(2)}px) translate(-50%, -50%) scale(1)`,
        boxShadow: 'none',
        opacity: 1,
      })
      dash.push({ offset: 1, strokeDashoffset: '0' })
      const timing: KeyframeAnimationOptions = { duration: span, delay, fill: 'both', easing: 'linear' }
      if (node) {
        const a = track(node.animate(frames, timing))
        a.finished.then(
          () => !done && land(plan.ride.to),
          () => {},
        )
      }
      if (plan.draw) track(plan.draw.animate(dash, timing))
      const arrive = delay + EASE_FN.when(Math.min(1, (plan.lead + plan.line) / plan.path.total)) * travel
      arrivals.push({ at: arrive, row: plan.ride.to })
      if (plan.end) track(plan.end.animate([{ opacity: 0 }, { opacity: 1 }], { ...SNAP, delay: arrive }))
    })

    // Lines nothing rides: drawn on the first rider's timing.
    for (const plan of plans) {
      if (ridden.includes(plan)) continue
      const dash: Keyframe[] = []
      for (let j = 0; j <= SAMPLES; j++) {
        const x = j / SAMPLES
        const drawn = EASE_FN.at(x)
        dash.push({ offset: x, strokeDashoffset: String(drawn >= 1 ? 0 : 1.001 - drawn) })
      }
      if (plan.draw) track(plan.draw.animate(dash, { duration: travel, fill: 'both' }))
      if (plan.end) track(plan.end.animate([{ opacity: 0 }, { opacity: 1 }], { ...SNAP, delay: travel }))
      arrivals.push({ at: travel, row: plan.ride.to })
    }

    // Stubs (mounted, unmounted) fade in with the lines.
    for (const stub of root.querySelectorAll<SVGElement>('[data-lk-stub]'))
      track(stub.animate([{ opacity: 0 }, { opacity: 1 }], { duration: travel, easing: EASE_CSS, fill: 'both' }))

    // Rows no line reaches (mounted After rows, unmounted Before rows) show
    // with the first arrival.
    const first = arrivals.length ? Math.min(...arrivals.map((a) => a.at)) : travel
    const reached = new Set(arrivals.map((a) => a.row))
    for (const row of rows()) if (!reached.has(row)) arrivals.push({ at: first, row })

    const end = Math.max(travel, ...ridden.map((_, i) => gaps[i] + span))
    const finishAll = (instant: boolean) => {
      if (done) return
      done = true
      timers.forEach((t) => window.clearTimeout(t))
      for (const a of anims) a.finish()
      rows().forEach(arrive)
      rides.forEach((r) => land(r.to))
      landed(instant)
    }
    const schedule = () => {
      for (const a of arrivals) timers.push(window.setTimeout(() => !done && arrive(a.row), a.at))
      timers.push(window.setTimeout(() => finishAll(false), end))
    }
    // Timers start now: the animations start on the next frame, so an
    // arrival may lead its line by at most a frame (never visible), and the
    // landing never depends on an animation becoming ready.
    schedule()

    // A resize or a font swap mid-reveal lands everything at once (D7, R1M-17).
    let w = root.offsetWidth
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (root.offsetWidth === w) return
      w = root.offsetWidth
      finishAll(true)
    })
    ro?.observe(root)

    return () => {
      done = true
      ro?.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
      anims.forEach((a) => a.cancel())
    }
    // Once per reveal: the parent keys this component by the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            // It looks exactly like the checked box it leaves and lands on.
            'pointer-events-none absolute left-0 top-0 z-20 flex h-4 w-4 items-center justify-center rounded border opacity-0',
            checkedBoxCls,
          )}
        >
          <Tick />
        </span>
      ))}
    </>
  )
}
