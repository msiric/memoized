'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Specimen-only: shows a primitive in a pseudo-state (hover, press, focus)
 * without a pointer or keyboard, by copying the classes of that state's
 * variants (`can-hover:x`, `active:x`, `focus-visible:x`, and their `group-`
 * and `has-` forms) to plain classes on every element below it. The
 * primitives keep no specimen API.
 */

export type ForcedState = 'hover' | 'press' | 'focus'

const VARIANTS: Record<ForcedState, string[]> = {
  hover: ['can-hover:', 'group-can-hover:'],
  // Press shows the hover color too, as on a hover device.
  press: ['active:', 'group-active:', 'can-hover:', 'group-can-hover:'],
  focus: ['focus-visible:', 'group-focus-visible:', 'has-[:focus-visible]:'],
}

/**
 * The plain classes the forced states produce. Tailwind only emits classes
 * it finds literally in the source, so they are listed here.
 */
export const FORCED_SAFELIST = [
  'bg-lime-600 brightness-98 bg-zinc-800 text-zinc-300 text-lime-500 bg-zinc-700 text-zinc-200 bg-zinc-600',
  'outline outline-2 outline-offset-2 outline-lime-500 text-zinc-200',
].join(' ')

export function Force({ state, children }: { state: ForcedState; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    for (const el of [root, ...root.querySelectorAll<HTMLElement | SVGElement>('*')]) {
      const add: string[] = []
      for (const c of el.classList) {
        const v = VARIANTS[state].find((p) => c.startsWith(p))
        if (v) add.push(c.slice(v.length))
      }
      if (state === 'focus' && add.length) el.classList.remove('outline-none')
      el.classList.add(...add)
    }
  }, [state])
  return (
    <span ref={ref} className="contents" data-force={state}>
      {children}
    </span>
  )
}
