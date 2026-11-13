'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'
import { UNAVAILABLE } from './Button'
import { focusRing, radius, transitionCls } from './tokens-v3'

/**
 * A checkpoint choice (D9, H3 R2 Q3 to Q5), shared by every interactive
 * visual. A `radio`; the group around it owns the roving tabindex.
 *
 * Anatomy: the outline control on the frame (a white/10 ring, no fill,
 * P: Button.tsx:26), radius 8 (the platform self-assessment row), at least
 * 44 px tall. The number key is a quiet muted numeral in a 12 px slot, not a
 * boxed cap: it teaches the 1 to 4 shortcuts without a second label (Q4).
 * The label wraps to as many lines as it needs and the row grows with it; it
 * never truncates (Q5). Footprints count the wrapped rows
 * (`shell/footprint.ts` `choiceLines`).
 *
 * States:
 * - `ask`: answerable. Hover white/5 (hover devices), press white/10.
 * - `resolved` before the verdict (a prediction locked in, or a reveal
 *   still landing): the pick takes the selected segment fill (zinc-600,
 *   P: LessonStatus.tsx:30), so the commitment reads at once; the other
 *   choices drop to muted ink.
 * - `resolved` with marks (the verdict): the correct choice gets ✓ (lime,
 *   `now`) on the `now` tint with full ink, where the payoff lands; a wrong
 *   pick shows × and drops to muted ink like every other choice. The wrong
 *   pick is never the brightest row (Q3).
 * - `unavailable`: opacity 50.
 *
 * `fade`: the mark arrives on the 160 ms `land` fade (Q4) instead of at once.
 * Pass it only on the render where the verdict lands under full motion.
 */

export type ChoiceMark = 'right' | 'wrong' | null
export type ChoiceState = 'ask' | 'resolved' | 'unavailable'

export type ChoiceRowProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children'> & {
  index: number
  label: ReactNode
  state?: ChoiceState
  /** The learner's pick (shown once resolved). */
  picked?: boolean
  /** The verdict mark: ✓ on the answer, × on a wrong pick; null until the verdict lands. */
  mark?: ChoiceMark
  /** Label face: sans for wording, mono when the choice is code. */
  mono?: boolean
  /** The mark fades in on the `land` token (Q4). */
  fade?: boolean
}

/** Row classes per look (exported for the specimen and the ghosts). */
export const choiceLook = {
  ask: cn(
    'text-zinc-300 ring-white/10 print:text-zinc-700 print:ring-zinc-300',
    'can-hover:bg-white/5 can-hover:text-zinc-100 press:bg-white/10 press:text-white',
  ),
  selected: 'bg-zinc-600 text-zinc-100 ring-transparent print:bg-zinc-200 print:text-zinc-900',
  muted: 'text-zinc-400 ring-white/10 print:text-zinc-600 print:ring-zinc-300',
  correct: 'bg-lime-400/10 text-zinc-100 ring-lime-400/20 print:text-zinc-900 print:ring-lime-700',
} as const

export const ChoiceRow = forwardRef<HTMLButtonElement, ChoiceRowProps>(function ChoiceRow(
  { index, label, state = 'ask', picked = false, mark = null, mono = false, fade = false, className, onClick, ...rest },
  ref,
) {
  const resolved = state === 'resolved'
  // Before the verdict a pick is the selected segment; with it, ✓ wins.
  const look = !resolved
    ? choiceLook.ask
    : mark === 'right'
      ? choiceLook.correct
      : picked && !mark
        ? choiceLook.selected
        : choiceLook.muted
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
        'relative flex min-h-11 min-w-0 items-center gap-2 px-2.5 py-2 text-left ring-1 ring-inset',
        radius.row.cls,
        focusRing,
        transitionCls.feedback,
        look,
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
          'flex h-5 w-3 shrink-0 items-center justify-center',
          mark
            ? cn(
                'font-sans text-2xs font-semibold leading-4',
                mark === 'right' ? 'text-lime-400 print:text-lime-700' : 'text-zinc-100 print:text-zinc-900',
              )
            : cn(
                'font-mono text-2xs leading-4 tabular-nums',
                look === choiceLook.selected ? 'text-zinc-300 print:text-zinc-700' : 'text-zinc-400 print:text-zinc-600',
              ),
        )}
      >
        {/* A new element for the mark, so its fade is an arrival, not a dip of the numeral. */}
        <span key={mark ?? 'key'} className={cn(mark && fade && 'vz-land-in')}>
          {mark === 'right' ? '✓' : mark === 'wrong' ? '×' : index + 1}
        </span>
      </span>
      {/* Wraps freely (Q5): the row grows, nothing is clamped. */}
      <span
        className={cn(
          'min-w-0 flex-1 text-pretty text-sm font-medium leading-5 [overflow-wrap:anywhere]',
          mono && 'font-mono text-xs font-normal leading-5',
        )}
      >
        {label}
        {mark ? <span className="sr-only">{mark === 'right' ? ', right answer' : ', wrong'}</span> : null}
      </span>
    </button>
  )
})

