'use client'

import { Fragment, useId, useRef, type KeyboardEvent } from 'react'
import { segmentedWidth } from '../step-log/validate'
import { cn } from './cn'
import { focusRing, focusRingGroup, transitionCls, type as typeScale } from './tokens-v3'

/**
 * Segmented control (D2): a copy of the lesson footer's "Lesson completed?"
 * control (`src/components/LessonStatus.tsx:27-41,93-99`). A 32 px pill
 * track with a 1 px hairline border and 1 px dividers; segments are
 * `text-sm font-medium` in every state (no weight jump); the selected
 * segment is the neutral zinc-600 fill with zinc-200 text; idle segments are
 * zinc-400 and take the zinc-700 fill on hover. Each segment keeps a 44 px
 * hit area around the 32 px track.
 *
 * Semantics: a `radiogroup` with one tab stop (roving tabindex). Arrow keys
 * move and select, Home and End jump.
 *
 * Fallback (A2): four or more options, or segments wider than the room the
 * control is given, render a native select styled like the platform `Select`
 * (`src/components/Select.tsx`: outlined, rounded-lg, the chevron). The room
 * is decided by CSS alone: the control is a size container, and a container
 * query at the segments' modelled width (`segmentedWidth`, in rem, so larger
 * text switches sooner) shows one or the other. The server markup is final,
 * and the hidden one is `display: none`, so it is never focused. The control
 * fills its parent: give the parent the width the control may use.
 */

export type SegmentedOption = { id: string; label: string }

export type SegmentedControlProps = {
  options: readonly SegmentedOption[]
  value: number
  onChange: (index: number) => void
  /** Accessible name of the group. */
  label: string
  interactive?: boolean
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
  interactive = true,
  className,
}: SegmentedControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const uid = useId()
  if (options.length < 2) return null

  const fallback = (
    <span data-vz-select className="relative inline-flex min-w-0 max-w-full">
      <select
        aria-label={label}
        data-viz-own-keys
        disabled={!interactive}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // The platform `outline` Select (P: Select.tsx:23-30,53: transparent,
        // white text, weight 400, border zinc-600, rounded-lg, room for the
        // chevron; no hover), 44 px tall for the target size, with the shared
        // focus ring (drift D10). It trades the pill for the platform's
        // rounded-lg select on purpose: it is the platform control.
        className={cn(
          'h-11 min-w-0 max-w-full appearance-none truncate rounded-lg border border-zinc-600 bg-transparent pl-3 pr-9 font-sans text-sm font-normal text-white print:border-zinc-300 print:text-zinc-900',
          focusRing,
          transitionCls.feedback,
        )}
      >
        {options.map((p, i) => (
          <option key={p.id} value={i}>
            {p.label}
          </option>
        ))}
      </select>
      {/* P: Select.tsx:4-19 (the chevron). */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white print:text-zinc-900"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  )

  if (options.length > 3) return <div className={cn('flex min-w-0', className)}>{fallback}</div>

  // From this container width (rem) the segments fit; below it, the select.
  const fit = segmentedWidth(options.map((o) => o.label)) / 16
  const scope = `[data-vz-seg="${uid}"]`
  const fitCss =
    `@container (max-width:${fit - 0.001}rem){${scope}>[role=radiogroup]{display:none}}` +
    `@container (min-width:${fit}rem){${scope}>[data-vz-select]{display:none}}`

  const last = options.length - 1
  const select = (n: number) => {
    onChange(n)
    refs.current[n]?.focus()
  }
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (!interactive) return
    const n = options.length
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null
    if (to === null) return
    e.preventDefault()
    select(to)
  }

  return (
    <div data-vz-seg={uid} className={cn('flex min-w-0 [container-type:inline-size]', className)}>
      {/* Raw: as text, the server would entity-escape the quotes and the `>`,
          and the fallback rule would not apply until the engine loads. */}
      <style dangerouslySetInnerHTML={{ __html: fitCss }} />
      <div role="radiogroup" aria-label={label} data-viz-own-keys className="relative inline-flex h-11 shrink-0 items-center">
        {/* The track: P: LessonStatus.tsx:93 (`h-8 rounded-full border`), in the one hairline. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1.5 h-8 rounded-full border border-zinc-700 print:border-zinc-300"
        />
        {options.map((p, i) => {
          const checked = i === value
          return (
            <Fragment key={p.id}>
              {i > 0 ? <span aria-hidden className="relative h-8 w-px shrink-0 bg-zinc-700 print:bg-zinc-300" /> : null}
              <button
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-disabled={interactive ? undefined : true}
                tabIndex={interactive && checked ? 0 : -1}
                onClick={() => interactive && onChange(i)}
                onKeyDown={(e) => onKey(e, i)}
                data-segment={p.id}
                className="group relative flex h-11 min-w-11 items-center outline-none"
              >
                <span
                  className={cn(
                    'flex h-8 w-full items-center justify-center whitespace-nowrap border-y border-transparent bg-clip-padding px-3',
                    i === 0 && 'rounded-l-full border-l',
                    i === last && 'rounded-r-full border-r',
                    typeScale.control.cls,
                    transitionCls.feedback,
                    focusRingGroup,
                    checked
                      ? 'bg-zinc-600 text-zinc-200 print:bg-zinc-200 print:text-zinc-900'
                      : cn(
                          'text-zinc-400 print:text-zinc-600',
                          interactive &&
                            // R13: hover zinc-700, press one step on (the selected fill).
                            'group-can-hover:bg-zinc-700 group-can-hover:text-zinc-200 group-press:bg-zinc-600 group-press:text-zinc-100',
                        ),
                  )}
                >
                  {p.label}
                </span>
              </button>
            </Fragment>
          )
        })}
      </div>
      {fallback}
    </div>
  )
}
