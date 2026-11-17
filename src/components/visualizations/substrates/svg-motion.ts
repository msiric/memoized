'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import type { MotionTokenName } from '../primitives/tokens-v3'
import { finishMoves, moveSpringToken, springCurve } from '../shell/flip'
import { animates, beatDelay, transitionFor, type MotionGate } from '../shell/motion'

/**
 * Motion for glyphs drawn inside one svg (the sliding window's strip, the dp
 * table): svg children are not FLIP'd by the shell, so a step plays its fades
 * (`data-fade="in|out <token> <beat>"`) and its tag moves (`data-move="<id>"`,
 * translated between resting places on the `move` spring) here, on the
 * step's beats, only for glyphs in the step's motion budget. Instant renders
 * land at once.
 */

const MOVE_ID = 'viz-move'
const FADE_ID = 'viz-fade'

export const r1 = (n: number) => Math.round(n * 10) / 10

/** One fade on a token: `in|out`, the token and its beat. */
export const fade = (dir: 'in' | 'out', token: MotionTokenName, beat: 'glyph' | 'land') => `${dir} ${token} ${beat}`

/** Plays every `[data-fade]` of this step on its token and beat; instant renders and glyphs past the budget land. */
export function useFades(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]')) for (const a of node.getAnimations?.() ?? []) if (a.id === FADE_ID) a.finish()
    if (gate.instant || typeof Element.prototype.animate !== 'function') return
    for (const node of el.querySelectorAll<SVGElement>('[data-fade]')) {
      const id = node.dataset.glyph ?? node.dataset.follows
      if (id && !animates(gate, id)) continue
      const [dir, token, beat] = node.dataset.fade!.split(' ')
      const t = transitionFor(token as MotionTokenName, gate) as { duration?: number; ease?: number[] | string }
      if (!t.duration) continue
      const anim = node.animate(dir === 'in' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], {
        duration: t.duration * 1000,
        easing: Array.isArray(t.ease) ? `cubic-bezier(${t.ease.join(', ')})` : 'linear',
        delay: beatDelay(gate, beat as 'glyph' | 'land') * 1000,
        fill: 'backwards',
      })
      anim.id = FADE_ID
    }
    // Once per step (and per instant epoch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}

/** Where an edge tag rests. */
export type Place = { x: number; y: number }
const placeCss = (p: Place) => `translate(${r1(p.x)}px, ${r1(p.y)}px)`

/** The `move` spring (flip.ts) for tags between two steps, on the glyph beat, when the tag (or the glyph it follows) is in the step's budget. */
export function useMoves(root: RefObject<SVGSVGElement>, gate: MotionGate, key: unknown, places: Map<string, Place>) {
  const last = useRef(places)
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (gate.instant) finishMoves(el as unknown as HTMLElement)
    const canAnimate = !gate.instant && !gate.reduce && typeof Element.prototype.animate === 'function'
    const curve = springCurve(moveSpringToken())
    for (const node of el.querySelectorAll<SVGGElement>('[data-move]')) {
      const id = node.dataset.move!
      const to = places.get(id)
      const from = last.current.get(id)
      for (const a of node.getAnimations?.() ?? []) if (a.id === MOVE_ID) a.cancel()
      if (!to || !from || (Math.abs(to.x - from.x) < 0.5 && Math.abs(to.y - from.y) < 0.5)) continue
      // A glyph that moves with another (`data-follows`) is in the budget when that one is.
      if (!canAnimate || !animates(gate, node.dataset.follows ?? id)) continue
      const frames = curve.progress.map((p, i) => ({
        offset: curve.offsets[i],
        transform: placeCss({ x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p }),
      }))
      const anim = node.animate(frames, { duration: curve.duration, delay: beatDelay(gate, 'glyph') * 1000, easing: 'linear', fill: 'backwards' })
      anim.id = MOVE_ID
    }
    last.current = places
    // Once per step (and per instant epoch), not on unrelated re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, gate.epoch])
}
