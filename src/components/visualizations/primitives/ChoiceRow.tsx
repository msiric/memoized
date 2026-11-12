'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'
import { Tag } from './Tag'
import { UNAVAILABLE } from './Button'
import { focusRing, ink, radius, transitionCls } from './tokens-v3'

/**
 * A checkpoint choice (D9, D4). The platform self-assessment row
 * (P: designTokens.ts:344-349): `rounded-lg`, zinc-700 fill, zinc-300
 * `text-sm font-medium`, zinc-600 on hover; 44 px tall (spec A5).
 *
 * The number key sits in a 20 px slot on the left. After the reveal the slot
 * keeps its place and shows the result: ✓ on the right answer, × on a wrong
 * pick, both in ink (WS1 ruling 3: the shape and the "Right." / "Not quite."
 * text carry the meaning; lime stays `now`, amber stays output, D4). The picked row takes
 * the selected neutral fill (P: LessonStatus.tsx:30). A row is a `radio`;
 * the group around it owns the roving tabindex.
 *
 * States: `ask` (answerable: hover, press, focus), `resolved` (after the
 * reveal: legible, not faded, no hover) and `unavailable` (opacity-50).
 */

export type ChoiceMark = 'right' | 'wrong' | null
export type ChoiceState = 'ask' | 'resolved' | 'unavailable'

export type ChoiceRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children'> & {
  index: number
  label: ReactNode
  state?: ChoiceState
  /** Picked in this pass (only shown once resolved). */
  picked?: boolean
  mark?: ChoiceMark
  /** An in-flow tag under the label, e.g. "last time". */
  tag?: string
  /** Label face: sans for wording, mono when the choice is code. */
  mono?: boolean
  /** How the label handles overflow: two lines (default) or one with an ellipsis. */
  wrap?: 'clamp' | 'truncate'
}

export const ChoiceRow = forwardRef<HTMLButtonElement, ChoiceRowProps>(function ChoiceRow(
  { index, label, state = 'ask', picked = false, mark = null, tag, mono = false, wrap = 'clamp', className, onClick, ...rest },
  ref,
) {
  const resolved = state === 'resolved'
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={resolved ? picked : false}
      aria-disabled={state !== 'ask' || undefined}
      onClick={(e) => {
        if (state !== 'ask') return
        onClick?.(e)
      }}
      className={cn(
        'relative flex h-11 min-w-0 items-center gap-2 pl-3 pr-3 text-left',
        radius.row.cls,
        focusRing,
        transitionCls.feedback,
        resolved && picked
          ? 'bg-zinc-600 text-zinc-100 print:bg-zinc-200 print:text-zinc-900'
          : 'bg-zinc-700 text-zinc-300 print:bg-zinc-100 print:text-zinc-700',
        state === 'ask' &&
          cn('can-hover:bg-zinc-600 can-hover:text-zinc-200 active:bg-zinc-600 active:text-zinc-200', transitionCls.press),
        resolved && 'cursor-default',
        state === 'unavailable' && UNAVAILABLE,
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden
        data-choice-slot={mark ?? 'key'}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center bg-zinc-800 print:bg-zinc-50',
          radius.chip.cls,
          mark
            ? cn('font-sans text-sm font-semibold leading-5', ink.base)
            : cn('font-mono text-2xs leading-4 tabular-nums', ink.secondary),
        )}
      >
        {mark === 'right' ? '✓' : mark === 'wrong' ? '×' : index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'min-w-0 text-sm font-medium leading-5',
            wrap === 'clamp' && !tag ? 'line-clamp-2' : 'truncate',
            mono && 'font-mono text-xs font-normal',
          )}
        >
          {label}
          {mark ? <span className="sr-only">{mark === 'right' ? ', right answer' : ', wrong'}</span> : null}
          {tag ? <span className="sr-only">{`, ${tag}`}</span> : null}
        </span>
        {/* The tag takes the label's second line, in flow, so it never squeezes the label sideways. */}
        {tag ? (
          <Tag aria-hidden tone="muted" className="h-4 bg-transparent px-0">
            {tag}
          </Tag>
        ) : null}
      </span>
    </button>
  )
})
