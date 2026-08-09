'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

/**
 * The shared interaction engine for stepped visualizations.
 *
 * Owns the current index, play/pause, and navigation. Exposes `direction`
 * (+1 / -1 / 0 of the last move) so renderers can compute correct entering and
 * leaving cues in BOTH directions. Keyboard is scoped to the focused container
 * (via `containerProps`), not the global document, so multiple visualizations on
 * one page do not fight over the arrow keys.
 */

export type Stepper = {
  index: number
  total: number
  direction: number
  atStart: boolean
  atEnd: boolean
  playing: boolean
  next: () => void
  back: () => void
  reset: () => void
  goTo: (n: number) => void
  togglePlay: () => void
  containerProps: {
    tabIndex: number
    role: 'group'
    'aria-label': string
    onKeyDown: (e: ReactKeyboardEvent) => void
  }
}

export function useStepper(total: number, options?: { playMs?: number; ariaLabel?: string }): Stepper {
  const playMs = options?.playMs ?? 1300
  const ariaLabel = options?.ariaLabel ?? 'Step-through visualization'
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [playing, setPlaying] = useState(false)
  const indexRef = useRef(0)

  const goTo = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(total - 1, n))
      setDirection(Math.sign(clamped - indexRef.current))
      indexRef.current = clamped
      setIndex(clamped)
    },
    [total],
  )

  const next = useCallback(() => goTo(indexRef.current + 1), [goTo])
  const back = useCallback(() => goTo(indexRef.current - 1), [goTo])
  const reset = useCallback(() => {
    setPlaying(false)
    goTo(0)
  }, [goTo])
  const togglePlay = useCallback(() => setPlaying((p) => !p), [])

  // Advance while playing; stop at the end.
  useEffect(() => {
    if (!playing) return
    if (index >= total - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => goTo(index + 1), playMs)
    return () => clearTimeout(id)
  }, [playing, index, total, playMs, goTo])

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      // Only act when the frame container itself is focused, not when a child control
      // button is. Otherwise a keydown on a focused button bubbles up here and Space
      // would toggle play (and be suppressed on the button) instead of activating it.
      if (e.target !== e.currentTarget) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPlaying(false)
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPlaying(false)
        back()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    },
    [next, back, togglePlay],
  )

  const containerProps = useMemo(
    () => ({ tabIndex: 0, role: 'group' as const, 'aria-label': ariaLabel, onKeyDown }),
    [ariaLabel, onKeyDown],
  )

  return {
    index,
    total,
    direction,
    atStart: index === 0,
    atEnd: index === total - 1,
    playing,
    next,
    back,
    reset,
    goTo,
    togglePlay,
    containerProps,
  }
}
