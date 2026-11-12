'use client'

import { Fragment, useRef, type KeyboardEvent } from 'react'
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
 * move and select, Home and End jump. Four or more options fall back to a
 * native select styled like the platform `Select` (spec §5.1).
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
  if (options.length < 2) return null

  if (options.length > 3) {
    return (
      <select
        aria-label={label}
        data-viz-own-keys
        disabled={!interactive}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        // P: Select.tsx:23-27,53 (outlined select), with the shared focus ring.
        className={cn(
          'h-11 rounded-lg border border-zinc-600 bg-zinc-900 px-3 text-sm text-zinc-100',
          focusRing,
          transitionCls.feedback,
          className,
        )}
      >
        {options.map((p, i) => (
          <option key={p.id} value={i}>
            {p.label}
          </option>
        ))}
      </select>
    )
  }

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
    <div
      role="radiogroup"
      aria-label={label}
      data-viz-own-keys
      className={cn('relative inline-flex h-11 items-center', className)}
    >
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
                          'group-can-hover:bg-zinc-700 group-can-hover:text-zinc-200 group-active:bg-zinc-700 group-active:text-zinc-200 group-active:brightness-98',
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
  )
}
