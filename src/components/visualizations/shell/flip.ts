'use client'

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { LIFT, liftShadow, motion as motionTokens, motionRules } from '../primitives/tokens-v3'
import { animates, beatDelay, type MotionGate } from './motion'

/**
 * The `move` token (spec §4) as FLIP on the Web Animations API: a glyph that
 * changes place (a callback moving from a queue to the stack) is laid out at
 * its new position and translated from where it was. Only `transform` (and,
 * between regions, the lift shadow) animates; the curve is the critically
 * damped `move` spring sampled into keyframes.
 *
 * - Instant renders (D7) finish every move under the root, including moves
 *   of glyphs that are leaving and have dropped their `data-flip-id` (M02).
 * - A resize, a font swap or a layout change re-measures and finishes moves
 *   in flight, so the next step never starts from stale positions (M03, M23).
 * - A glyph that moves again while still moving continues from where it is.
 * - A glyph that moves between regions renders above every lane, with an
 *   opaque raised backing and the one lift shadow (D6, M04).
 * - Only glyphs the gate allows (the per-step budget) animate; the rest land.
 * - H3 R2 Q1: the move is the step's second beat (`gate.beats.glyph`): it
 *   waits at its old place until the code line has highlighted, and a glyph
 *   crossing regions keeps its own colors (edge, ring, tint) for the whole
 *   ride, taking its new lane's colors only as it settles.
 *
 * Glyphs opt in with `data-flip-id`. Exiting copies drop the attribute, so a
 * moved glyph is measured once, at its new home.
 */

const MOVE_ID = 'viz-move'

type Spring = { stiffness: number; damping: number; mass: number }
type Curve = { duration: number; offsets: number[]; progress: number[] }

const curves = new Map<string, Curve>()

/**
 * Samples a unit spring until it is within 0.6 % of its target (about
 * 263 ms for the `move` token, its `settleMs`: the glyph has visibly landed
 * when the step's third beat starts, H3 R2 Q1), capped at the 300 ms
 * transition limit, then
 * normalizes the samples so the last one is exactly 1. The curve stays
 * monotonic and ends where the glyph rests: no end snap (M08). The residual
 * speed at the stop is under 0.1 travel per second, a tenth of a pixel per
 * frame on the longest stage move.
 */
export function springCurve({ stiffness, damping, mass }: Spring, stepMs = 1000 / 120): Curve {
  const key = `${stiffness}:${damping}:${mass}`
  const cached = curves.get(key)
  if (cached) return cached
  let x = 1
  let v = 0
  const dt = stepMs / 1000
  const samples = [0]
  // Ten integration sub-steps per keyframe: one coarse Euler step per frame
  // lags the real spring by about 25 ms at this stiffness.
  const sub = dt / 10
  for (let t = 0; t < motionRules.maxTransitionMs / 1000 - dt / 2; t += dt) {
    for (let i = 0; i < 10; i++) {
      const a = (-stiffness * x - damping * v) / mass
      v += a * sub
      x += v * sub
    }
    samples.push(1 - x)
    if (Math.abs(x) < 0.006) break
  }
  const end = samples[samples.length - 1]
  const progress = samples.map((p) => p / end)
  const duration = (samples.length - 1) * stepMs
  const curve = {
    duration,
    offsets: progress.map((_, i) => i / (progress.length - 1)),
    progress,
  }
  curves.set(key, curve)
  return curve
}

function moveSpring(): Spring {
  const m = motionTokens.move.full
  if (m.type !== 'spring') throw new Error('The move token must be a spring')
  return m
}

/** Lift strength over the move (0 to 1): up in the first 20 %, down over the last 30 %. */
export function liftAt(t: number): number {
  if (t <= 0 || t >= 1) return 0
  if (t < 0.2) return t / 0.2
  if (t > 0.7) return (1 - t) / 0.3
  return 1
}

/** The glyph's own colors (its first child, the chip), carried through a move between regions (Q1). */
type Paint = { borderColor: string; boxShadow: string; backgroundColor: string }
type Pos = { x: number; y: number; region: string | null; paint?: Paint }

function paintOf(node: HTMLElement): Paint | undefined {
  const chip = node.firstElementChild as HTMLElement | null
  if (!chip) return undefined
  const cs = getComputedStyle(chip)
  return { borderColor: cs.borderColor, boxShadow: cs.boxShadow, backgroundColor: cs.backgroundColor }
}

/** Layout position relative to `root`: offsets ignore transforms, so moves and enters in flight never skew it. */
function layoutPosition(node: HTMLElement, root: HTMLElement): { x: number; y: number } {
  let x = 0
  let y = 0
  let n: HTMLElement | null = node
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return { x, y }
}

function regionOf(node: HTMLElement, root: HTMLElement): HTMLElement | null {
  const r = node.parentElement?.closest<HTMLElement>('[data-viz-region]')
  return r && root.contains(r) ? r : null
}

function measure(root: HTMLElement): Map<string, Pos> {
  const out = new Map<string, Pos>()
  for (const node of root.querySelectorAll<HTMLElement>('[data-flip-id]')) {
    out.set(node.dataset.flipId!, {
      ...layoutPosition(node, root),
      region: regionOf(node, root)?.dataset.vizRegion ?? null,
      paint: paintOf(node),
    })
  }
  return out
}

/** Finishes every move under `root`, on live glyphs and on copies that are leaving (M02). */
export function finishMoves(root: HTMLElement) {
  if (typeof root.getAnimations !== 'function') return
  for (const a of root.getAnimations({ subtree: true })) if (a.id === MOVE_ID) a.finish()
}

function translateNow(node: HTMLElement): { x: number; y: number } {
  const tf = getComputedStyle(node).transform
  if (!tf || tf === 'none' || typeof DOMMatrixReadOnly === 'undefined') return { x: 0, y: 0 }
  const m = new DOMMatrixReadOnly(tf)
  return { x: m.m41, y: m.m42 }
}

const raised = new WeakMap<HTMLElement, number>()

/** D6: the moving glyph and its region render above every lane, on an opaque raised backing. */
function lift(node: HTMLElement, region: HTMLElement | null): () => void {
  const shape = node.firstElementChild ? getComputedStyle(node.firstElementChild).borderRadius : ''
  node.style.position = 'relative'
  node.style.zIndex = '1'
  node.style.borderRadius = shape
  node.classList.add(LIFT.backingCls)
  if (region) {
    raised.set(region, (raised.get(region) ?? 0) + 1)
    region.style.zIndex = '10'
  }
  return () => {
    node.style.position = ''
    node.style.zIndex = ''
    node.style.borderRadius = ''
    node.classList.remove(LIFT.backingCls)
    if (region) {
      const n = (raised.get(region) ?? 1) - 1
      raised.set(region, n)
      if (n <= 0) region.style.zIndex = ''
    }
  }
}

type Move = {
  node: HTMLElement
  id: string
  dx: number
  dy: number
  between: boolean
  /** The glyph's colors where it came from (kept for the ride, Q1). */
  paint?: Paint
}

function play(root: HTMLElement, { node, dx, dy, between, paint }: Move, delay: number) {
  const curve = springCurve(moveSpring())
  const frames = curve.progress.map((p, i) => {
    const frame: Keyframe = {
      offset: curve.offsets[i],
      transform: `translate(${(dx * (1 - p)).toFixed(2)}px, ${(dy * (1 - p)).toFixed(2)}px)`,
    }
    if (between) frame.boxShadow = liftShadow(liftAt(curve.offsets[i]))
    return frame
  })
  const lower = between ? lift(node, regionOf(node, root)) : () => {}
  // `backwards`: during the first beat the glyph already sits where it was.
  const timing: KeyframeAnimationOptions = { duration: curve.duration, delay, easing: 'linear', fill: 'backwards' }
  const anim = node.animate(frames, timing)
  anim.id = MOVE_ID
  const chip = node.firstElementChild as HTMLElement | null
  const now = between && paint && chip ? paintOf(node) : undefined
  if (chip && paint && now && (paint.borderColor !== now.borderColor || paint.boxShadow !== now.boxShadow || paint.backgroundColor !== now.backgroundColor)) {
    // Its own colors for the ride, the new lane's as it settles (the last quarter).
    const keep = chip.animate(
      [
        { offset: 0, ...paint },
        { offset: 0.75, ...paint },
        { offset: 1, ...now },
      ],
      timing,
    )
    keep.id = MOVE_ID
  }
  let done = false
  const end = () => {
    if (done) return
    done = true
    lower()
  }
  anim.addEventListener('finish', end)
  anim.addEventListener('cancel', end)
}

/**
 * After each change of `key` (the step) or of the gate's epoch, measures
 * every `[data-flip-id]` inside `root` and plays a move for each allowed glyph
 * whose layout position changed.
 */
export function useFlip(root: RefObject<HTMLElement>, gate: MotionGate, key: unknown) {
  const last = useRef(new Map<string, Pos>())
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (gate.instant) finishMoves(el)
    const canAnimate = !gate.instant && !gate.reduce && typeof Element.prototype.animate === 'function'
    const next = new Map<string, Pos>()
    const moves: Move[] = []
    for (const node of el.querySelectorAll<HTMLElement>('[data-flip-id]')) {
      const id = node.dataset.flipId!
      // A color ride still running reads as the old colors: drop it first (Q1).
      const chip = node.firstElementChild as HTMLElement | null
      if (chip && typeof chip.getAnimations === 'function')
        for (const a of chip.getAnimations()) if (a.id === MOVE_ID) a.cancel()
      const at: Pos = {
        ...layoutPosition(node, el),
        region: regionOf(node, el)?.dataset.vizRegion ?? null,
        paint: paintOf(node),
      }
      next.set(id, at)
      const was = last.current.get(id)
      // A move still in flight: continue from where the glyph is now.
      const running =
        typeof node.getAnimations === 'function' ? node.getAnimations().find((a) => a.id === MOVE_ID) : undefined
      const now = running ? translateNow(node) : { x: 0, y: 0 }
      running?.cancel()
      if (!was) continue
      const dx = was.x - at.x + now.x
      const dy = was.y - at.y + now.y
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)
        moves.push({ node, id, dx, dy, between: was.region !== at.region, paint: was.paint })
    }
    last.current = next
    if (!canAnimate) return
    const delay = beatDelay(gate, 'glyph') * 1000
    for (const m of moves) if (animates(gate, m.id)) play(el, m, delay)
    // Runs once per step (and per instant epoch), not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])

  // A layout change outside a step (resize, font swap) lands every move and
  // re-measures, so the next step starts from where glyphs really are.
  useEffect(() => {
    const el = root.current
    if (!el || typeof window === 'undefined') return
    let width = el.offsetWidth
    let height = el.offsetHeight
    const remeasure = () => {
      finishMoves(el)
      last.current = measure(el)
    }
    const onResize = () => {
      if (el.offsetWidth === width && el.offsetHeight === height) return
      width = el.offsetWidth
      height = el.offsetHeight
      remeasure()
    }
    // Only a real change of the stage box counts: a phone's toolbar resizing
    // the window while scrolling must not cut a move short.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
    ro?.observe(el)
    let live = true
    document.fonts?.ready.then(() => live && remeasure())
    return () => {
      live = false
      ro?.disconnect()
    }
  }, [root])
}
