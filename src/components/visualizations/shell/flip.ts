'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import { motion as motionTokens, motionRules } from '../primitives/tokens-v2'
import type { MotionGate } from './motion'

/**
 * The `move` token (spec §4) as FLIP on the Web Animations API: a glyph that
 * changes place (a callback moving from a queue to the stack, a queue
 * shifting) is laid out at its new position and translated from where it
 * was. Only `transform` animates, the curve is the critically damped
 * `move` spring sampled into keyframes, and an instant render finishes any
 * move still in flight in the same frame.
 *
 * Glyphs opt in with `data-flip-id`. Exiting copies drop the attribute, so
 * a moved glyph is measured once, at its new home.
 */

type Spring = { stiffness: number; damping: number; mass: number }
type Curve = { duration: number; offsets: number[]; progress: number[] }

const curves = new Map<string, Curve>()

/**
 * Samples a unit spring from 0 to 1 until it is within 0.5 % and slow, capped
 * at the 300 ms transition limit (the residual there is under 1 %, a
 * sub-pixel step for any move on a stage).
 */
export function springCurve({ stiffness, damping, mass }: Spring, stepMs = 1000 / 120): Curve {
  const key = `${stiffness}:${damping}:${mass}`
  const cached = curves.get(key)
  if (cached) return cached
  let x = 1
  let v = 0
  const dt = stepMs / 1000
  const samples = [0]
  for (let t = 0; t < motionRules.maxTransitionMs / 1000 - dt / 2; t += dt) {
    const a = (-stiffness * x - damping * v) / mass
    v += a * dt
    x += v * dt
    samples.push(1 - x)
    if (Math.abs(x) < 0.005 && Math.abs(v) < 0.05) break
  }
  samples[samples.length - 1] = 1
  const duration = (samples.length - 1) * stepMs
  const curve = { duration, offsets: samples.map((_, i) => i / (samples.length - 1)), progress: samples }
  curves.set(key, curve)
  return curve
}

function moveSpring(): Spring {
  const m = motionTokens.move.full
  if (m.type !== 'spring') throw new Error('The move token must be a spring')
  return m
}

type Rect = { x: number; y: number }

/** Layout position relative to `root`: offsets ignore transforms, so moves and enters in flight never skew it. */
function layoutPosition(node: HTMLElement, root: HTMLElement): Rect {
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

/**
 * After each change of `key` (the step), measures every `[data-flip-id]`
 * inside `root` and plays a move for any glyph whose layout position changed.
 * An instant render finishes every move in flight instead.
 */
export function useFlip(root: RefObject<HTMLElement>, gate: MotionGate, key: unknown) {
  const last = useRef(new Map<string, Rect>())
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const nodes = el.querySelectorAll<HTMLElement>('[data-flip-id]')
    const next = new Map<string, Rect>()
    const moves: [HTMLElement, number, number][] = []
    for (const node of nodes) {
      if (gate.instant && typeof node.getAnimations === 'function') {
        for (const a of node.getAnimations()) if (a.id === 'viz-move') a.finish()
      }
      const at = layoutPosition(node, el)
      const id = node.dataset.flipId!
      next.set(id, at)
      const was = last.current.get(id)
      if (was && (Math.abs(was.x - at.x) > 0.5 || Math.abs(was.y - at.y) > 0.5))
        moves.push([node, was.x - at.x, was.y - at.y])
    }
    last.current = next
    if (gate.instant || gate.reduce || typeof Element.prototype.animate !== 'function') return
    const curve = springCurve(moveSpring())
    for (const [node, dx, dy] of moves) {
      const frames = curve.progress.map((p, i) => ({
        offset: curve.offsets[i],
        transform: `translate(${(dx * (1 - p)).toFixed(2)}px, ${(dy * (1 - p)).toFixed(2)}px)`,
      }))
      const anim = node.animate(frames, { duration: curve.duration, easing: 'linear' })
      anim.id = 'viz-move'
    }
    // Runs once per step (and per instant epoch), not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}
