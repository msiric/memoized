'use client'

import { useId, type ReactNode } from 'react'
import { Button } from './Button'
import { cn } from './cn'
import { lastTimeCls, promptCls } from './Caption'
import { CHOICE, WIDE_FROM, choiceGeometry, type ChoiceGeometry } from './choice-geometry'

/**
 * The one checkpoint layout (H3 R2 Q4, Q5), shared by every interactive
 * visual: the text cell (the prompt with its note line, or the feedback),
 * then the choice row with "Skip" as its trailing text button.
 *
 * - Beside (the frame from 37.875rem, where the row fits next to text that
 *   keeps `textMin`): the text on the left, the choices and Skip on the
 *   right in one row, as one band under the stage.
 * - Otherwise stacked (phones, large text, or a row too long to sit beside
 *   the text): the text takes the full row and the choices sit right under
 *   it, in one row across the width with Skip at its end when every label
 *   fits its column in at most two lines; otherwise two columns, with Skip
 *   in the next free cell (after the last choice). Never two columns beside
 *   the text (final polish: the question read far from its choices).
 *
 * Choice labels wrap; rows grow (Q5). The thresholds are container queries
 * in rem (server-final CSS, larger text switches sooner, D19), computed from
 * the labels with the shared width model (`choice-geometry.ts`), scoped to
 * this block. Live blocks and their invisible ghosts render the same
 * markup, so a dock that stacks ghosts reserves exactly the live height.
 *
 * Adoption (list keys): render `ChoiceRow`s as `choices`, `<SkipButton>` as
 * `skip`, the prompt or the feedback as `text` and every feedback as
 * `textGhosts`; pass the checkpoint's labels so the layout can be computed.
 */

export type CheckpointBlockProps = {
  /** The choice labels in order (the layout is computed from them). */
  labels: readonly string[]
  /** Mono labels (code) use the mono width model. */
  mono?: boolean
  /** What the text cell shows now: the prompt block or the feedback. */
  text: ReactNode
  /** Invisible copies that reserve the text cell (every prompt and feedback this block can show). */
  textGhosts?: ReactNode
  /** The `ChoiceRow`s. */
  choices: ReactNode
  /** The trailing text button (`SkipButton`). */
  skip: ReactNode
  /** Props for the choices group (role radiogroup, labelling, refs). */
  choicesProps?: Record<string, unknown>
  className?: string
  /** A ghost block: no part names, no live hooks. */
  ghost?: boolean
  /** The trailing cell's width when a wider action takes Skip's place (`choiceGeometry`). */
  trail?: number
  /** The least room the text keeps beside the choices; below it the block stacks (`choiceGeometry`). */
  textMin?: number
}

export function CheckpointBlock({
  labels,
  mono = false,
  text,
  textGhosts,
  choices,
  skip,
  choicesProps,
  className,
  ghost = false,
  trail,
  textMin,
}: CheckpointBlockProps) {
  const scope = useId().replace(/:/g, '')
  const g = choiceGeometry(labels, mono, trail, textMin)
  return (
    <div
      data-vz-cp={scope}
      data-viz-part={ghost ? undefined : 'viz-checkpoint'}
      className={cn('grid min-w-0 [grid-template-areas:"text""choices"] [grid-template-columns:minmax(0,1fr)]', className)}
      style={{ columnGap: rem(g.textGap), rowGap: rem(g.textGap) }}
    >
      {/* Raw, so the server does not entity-escape the selectors' quotes (the
          rule must hold in the server frame too). Generated CSS only. */}
      <style dangerouslySetInnerHTML={{ __html: checkpointCss(scope, g) }} />
      <div data-vz-text className="grid min-w-0 content-end [grid-area:text]">
        {textGhosts}
        <div className="col-start-1 row-start-1 self-end">{text}</div>
      </div>
      <div
        data-vz-choices
        {...choicesProps}
        className={cn('grid min-w-0 items-stretch [grid-area:choices]', choicesProps?.className as string)}
        style={{ gap: rem(g.gap) }}
      >
        {choices}
        <div data-vz-skip className="flex items-center justify-start">
          {skip}
        </div>
      </div>
    </div>
  )
}

/**
 * The checkpoint's prompt and its note (the "Last time" answer, or the Q2
 * nudge), always reserved. The note sits at the end of the prompt's line
 * when both fit, and wraps under it when they do not (one fewer line on a
 * phone, Q15); the reserve is the longest note, so nothing moves when it
 * appears.
 */
export function PromptBlock({
  id,
  prompt,
  note,
  noteId,
  noteReserve,
  live = true,
}: {
  id?: string
  prompt: ReactNode
  /** The note to show now, or null for an empty (reserved) line. */
  note: ReactNode | null
  noteId?: string
  /** The longest note this prompt can show (reserves its lines). */
  noteReserve: string
  live?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3">
      <p id={id} className={promptCls} data-viz-part={live ? 'viz-prompt' : undefined}>
        {prompt}
      </p>
      <div className="grid">
        <p aria-hidden className={cn(lastTimeCls, 'invisible col-start-1 row-start-1')}>
          {noteReserve}
        </p>
        <p
          id={noteId}
          className={cn(lastTimeCls, 'col-start-1 row-start-1', !note && 'invisible')}
          aria-hidden={note ? undefined : true}
          data-viz-part={live && note ? 'viz-note' : undefined}
        >
          {note ?? ' '}
        </p>
      </div>
    </div>
  )
}

/** "Skip": the quiet trailing text button of a choice row (R4, Q4). */
export function SkipButton({
  className,
  ...rest
}: Omit<Parameters<typeof Button>[0], 'children' | 'variant'>) {
  return (
    <Button variant="text" aria-label="Skip, show me" className={cn('min-w-11 px-2', className)} {...rest}>
      Skip
    </Button>
  )
}

const rem = (px: number) => (px === 0 ? '0' : `${Math.round((px / 16) * 10_000) / 10_000}rem`)

/**
 * The block's container queries (in rem). Stacked by default: two columns
 * of choices, one row across the width from `g.rowNarrow`. Beside from
 * `g.rowWide` (never under 37.875rem): the text left, one row of `g.col`
 * columns and the trailing action right.
 */
export function checkpointCss(scope: string, g: ChoiceGeometry): string {
  const block = `[data-vz-cp="${scope}"]`
  const sel = `${block} [data-vz-choices]`
  const two = `${sel}{grid-template-columns:repeat(2,minmax(0,1fr))}`
  // One row under the text: equal columns, never wider than the widest
  // column beside the text (a wide band keeps compact choices, Skip right after them).
  const oneStacked = `${sel}{grid-template-columns:repeat(${g.n},minmax(0,${rem(CHOICE.wideWidth)})) auto}`
  const beside =
    `${block}{grid-template-areas:"text choices";grid-template-columns:minmax(0,1fr) auto;align-items:center}` +
    // The text centres on the choice row: a short question sits level with
    // its choices, never at the foot of a band reserved for a longer verdict.
    `${block}>[data-vz-text]{padding-right:0.5rem}${block}>[data-vz-text]>:last-child{align-self:center}` +
    `${sel}{grid-template-columns:repeat(${g.n},${rem(g.col)}) auto}`
  // Two columns narrower than the trailing action (very large text): it takes its own row.
  const trailRow = `@container vz (max-width:${rem(2 * g.trail + g.gap - 0.5)}){${block} [data-vz-skip]{grid-column:1/-1}}`
  return (
    two +
    trailRow +
    `@container vz (min-width:${rem(g.rowNarrow)}){${oneStacked}}` +
    `@container vz (min-width:${rem(Math.max(g.rowWide, WIDE_FROM))}){${beside}}`
  )
}
