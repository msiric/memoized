'use client'

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { buttonClasses } from '../../primitives/Button'
import { Feedback, lastTimeCls, promptCls } from '../../primitives/Caption'
import { cn as clsx } from '../../primitives/cn'
import { focusRing, ink, radius, transitionCls } from '../../primitives/tokens-v3'
import { CHOICE } from '../../shell/footprint'
import { rem } from '../../shell/vars'
import { toRem } from '../../substrates/units'
import { AGAIN_LABEL } from './content'
import { CHOICE_ROW_FIT, LK_CHOICE_WIDTH, dockGhostStrings, type Scene } from './layout'

/**
 * The list-keys dock: one checkpoint block for both phases (H3 R4, Q4: the
 * event loop's pattern). The text cell holds the question with its note
 * line ("Last time: ..."), then the verdict with its note line (the tally)
 * in the same place. Under it, the choice row: the choices stay in place
 * from the question to the reveal, and Skip trails them, at the end of the
 * row; on the reveal "Try another" takes Skip's place, so the next action is
 * where the pointer already is. Every cell is as tall as its tallest state
 * (ghost stacks, D15), measured per preset (H3 R2), so nothing moves.
 *
 * Layout, chosen by the frame's width in rem (`dockCss`, server-final):
 * - one row (the wide variant, `CHOICE_ROW_FIT`): the choices in equal
 *   columns up to `LK_CHOICE_WIDTH`, then the trailing action;
 * - otherwise two columns (an odd last choice takes the full row, so there
 *   is no hole, critique F-LK-06), and the trailing action under them, its
 *   label in line with the choices' numerals (both 12 px in), its target
 *   inside the dock.
 */

const F = '[data-viz-frame="list-keys"]'

export const DOCK = {
  block: 'grid min-w-0 grid-cols-1',
  blockStyle: { rowGap: toRem(CHOICE.textGap) } as CSSProperties,
  text: 'grid min-w-0',
  prompt: promptCls,
  /** The note under the text: "Last time: ..." on the question, the tally on the reveal. */
  note: lastTimeCls,
}

/** The row layout as CSS: container queries on the frame (`vz`), in rem. */
export const dockCss =
  `${F} [data-lk-row]{display:flex;flex-direction:column;align-items:flex-start;gap:${rem(CHOICE.gap)}}` +
  `${F} [data-lk-choices]{display:grid;width:100%;grid-template-columns:repeat(2,minmax(0,1fr));gap:${rem(CHOICE.gap)}}` +
  `${F} [data-lk-choices]>:last-child:nth-child(odd){grid-column:1/-1}` +
  `@container vz (min-width:${rem(CHOICE_ROW_FIT)}){` +
  `${F} [data-lk-row]{flex-direction:row;align-items:stretch}${F} [data-lk-row]>[data-lk-choices]{flex:0 1 auto;min-width:0}` +
  `${F} [data-lk-choices]{width:auto;grid-template-columns:repeat(var(--lk-n),minmax(0,${rem(LK_CHOICE_WIDTH)}))}` +
  `${F} [data-lk-choices]>:last-child:nth-child(odd){grid-column:auto}` +
  `}`

// ---------------------------------------------------------------------------
// The choice (Q3, Q4, Q5). Local until F1's shared ChoiceRow carries these
// states; see the merge note in the report.
// ---------------------------------------------------------------------------

/**
 * - `ask`: answerable (hover, press, focus);
 * - `locked`: answered, the payoff still playing: no hover, the pick in the
 *   selected look, nothing else changes yet (H3 R5);
 * - `resolved`: after the landing, the answer emphasis (Q3).
 */
export type LkChoiceState = 'ask' | 'locked' | 'resolved'

export type LkChoiceProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled' | 'children'> & {
  index: number
  label: ReactNode
  state: LkChoiceState
  picked: boolean
  /** Resolved: the correct choice. */
  answer: boolean
  mono?: boolean
  /** The verdict beat's transition (`beatTransition`), or instant. */
  beat?: CSSProperties
  /** Ghost copies reserve the height (aria-hidden, never focusable). */
  ghost?: boolean
}

/**
 * A checkpoint choice, 44 px or taller. The label wraps to as many lines as
 * it needs and the row grows with it (Q5, never clamped); the dock reserves
 * the tallest set (`ChoiceGhosts`). The number is a quiet numeral, not a
 * boxed cap (Q4), and on the reveal its slot shows ✓ on the answer and × on
 * a wrong pick.
 *
 * Answer emphasis (Q3): the answer takes the lime landing tint (Q9: where
 * the payoff lands) with ✓ and full ink; every other choice drops to muted
 * ink on the frame with a hairline edge (zinc-400 on the frame, over
 * 4.5:1); a wrong pick keeps its ×. Pick, emphasis and marks change on the
 * verdict beat, after the landing.
 */
export const LkChoice = forwardRef<HTMLButtonElement, LkChoiceProps>(function LkChoice(
  { index, label, state, picked, answer, mono = false, beat, ghost = false, className, onClick, style, ...rest },
  ref,
) {
  const resolved = state === 'resolved'
  const mark = resolved ? (answer ? '✓' : picked ? '×' : null) : null
  const slot = 'col-start-1 row-start-1 transition-opacity motion-reduce:transition-none'
  return (
    <button
      ref={ref}
      type="button"
      role={ghost ? undefined : 'radio'}
      aria-checked={ghost ? undefined : resolved || state === 'locked' ? picked : false}
      aria-disabled={ghost || state !== 'ask' || undefined}
      aria-hidden={ghost || undefined}
      tabIndex={ghost ? -1 : rest.tabIndex}
      data-choice-state={state}
      data-choice-answer={(resolved && answer) || undefined}
      onClick={(e) => {
        if (state !== 'ask') return
        onClick?.(e)
      }}
      className={clsx(
        'group relative flex min-h-11 min-w-0 items-center gap-2 py-2.5 pl-3 pr-3 text-left',
        radius.row.cls,
        focusRing,
        transitionCls.feedback,
        state === 'ask' &&
          clsx(
            'bg-zinc-700 text-zinc-100 print:bg-zinc-100 print:text-zinc-900',
            // R13: hover zinc-600 (the platform row), press one step on.
            'can-hover:bg-zinc-600 press:bg-zinc-500 press:text-white',
          ),
        state === 'locked' &&
          clsx(
            'cursor-default',
            picked ? 'bg-zinc-600 text-zinc-100 print:bg-zinc-200 print:text-zinc-900' : 'bg-zinc-700 text-zinc-100 print:bg-zinc-100 print:text-zinc-900',
          ),
        resolved &&
          clsx(
            'cursor-default ring-1 ring-inset',
            answer
              ? 'bg-lime-400/10 text-zinc-100 ring-lime-400 print:text-zinc-900 print:ring-lime-700'
              : 'bg-transparent text-zinc-400 ring-white/10 print:text-zinc-600 print:ring-zinc-300',
          ),
        ghost && 'invisible',
        className,
      )}
      style={{ ...style, ...beat }}
      {...rest}
    >
      <span
        aria-hidden
        data-choice-slot={mark ? (answer ? 'right' : 'wrong') : 'key'}
        className="grid h-5 w-4 shrink-0 place-items-center"
      >
        <span
          className={clsx(
            slot,
            'font-mono text-2xs leading-4 tabular-nums',
            resolved ? ink.muted : 'text-zinc-300 group-press:text-white print:text-zinc-600',
            mark ? 'opacity-0' : 'opacity-100',
          )}
          // The number goes at once when the mark arrives (no crossfade of
          // two glyphs in one slot, M15); the mark fades in on the beat.
          style={mark && beat?.transitionDelay ? { transitionDuration: '0s', transitionDelay: beat.transitionDelay } : { transitionProperty: 'none' }}
        >
          {index + 1}
        </span>
        <span
          className={clsx(slot, 'font-sans text-2xs font-semibold leading-4', answer ? ink.base : ink.secondary, mark ? 'opacity-100' : 'opacity-0')}
          style={beat}
        >
          {mark ?? ''}
        </span>
      </span>
      <span
        className={clsx(
          'relative min-w-0 flex-1 text-pretty break-words text-sm font-medium leading-5',
          mono && 'font-mono text-xs font-normal leading-5',
        )}
      >
        {label}
        {mark ? <span className="sr-only">{answer ? ', right answer' : ', wrong'}</span> : null}
      </span>
    </button>
  )
})

/** Skip's place on the reveal: "Try another", reserved as a ghost so the row never shifts. */
export function TrailingGhost() {
  return (
    <span aria-hidden className={clsx(buttonClasses(), 'invisible col-start-1 row-start-1')}>
      {AGAIN_LABEL}
    </span>
  )
}

/**
 * Invisible copies of every choice set of the scene, stacked in the choice
 * row's cell, so the row is as tall as the tallest set at the current width
 * and text size (Q5: wrapped labels included), whichever action is chosen.
 */
export function ChoiceGhosts({ sets, mono }: { sets: readonly (readonly { id: string; label: string }[])[]; mono: boolean }) {
  return (
    <>
      {sets.map((set) => (
        <div key={set.map((c) => c.id).join('|')} aria-hidden data-lk-row className="invisible col-start-1 row-start-1">
          <div data-lk-choices style={{ ['--lk-n' as string]: set.length }}>
            {set.map((c, i) => (
              <LkChoice key={c.id} ghost index={i} label={c.label} state="ask" picked={false} answer={false} mono={mono} />
            ))}
          </div>
          <span className="grid">
            <TrailingGhost />
          </span>
        </div>
      ))}
    </>
  )
}

/**
 * The verdict (H3 R4, X05, F2 ruling 2): the shared `Feedback`, two short
 * sentences at most: the lead ("Right.", "Not quite.", "Answer: ...") and
 * the rule that explains it.
 */
export function VerdictText({ lead, rule, live = false }: { lead: string; rule: string; live?: boolean }) {
  return <Feedback data-viz-part={live ? 'viz-feedback' : undefined} lead={lead || null} body={rule} />
}

const cell = 'col-start-1 row-start-1'

/** Invisible copies of the scene's longest questions and verdicts, each with its note line. */
export function TextGhosts({ scene }: { scene: Scene }) {
  const g = dockGhostStrings(scene)
  return (
    <>
      {g.prompts.map((p) => (
        <div key={`p-${p}`} aria-hidden className={clsx('invisible', cell)}>
          <p className={DOCK.prompt}>{p}</p>
          <p className={DOCK.note}>{g.lastTime}</p>
        </div>
      ))}
      {g.reveals.map((r) => (
        <div key={`r-${r.lead}|${r.rule}`} aria-hidden data-viz-part="dock-ghosts" className={clsx('invisible', cell)}>
          <VerdictText {...r} />
          <p className={DOCK.note}>{g.tally}</p>
        </div>
      ))}
    </>
  )
}

/** The live text in the ghosts' cell, sitting on the choices (its reserve above it). */
export function TextCell({ scene, children }: { scene: Scene; children: ReactNode }) {
  return (
    <div className={DOCK.text}>
      <TextGhosts scene={scene} />
      <div className={clsx(cell, 'grid min-w-0 self-end')}>{children}</div>
    </div>
  )
}
