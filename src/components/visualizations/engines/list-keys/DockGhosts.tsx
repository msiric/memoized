'use client'

import { buttonClasses } from '../../primitives/Button'
import { Feedback, lastTimeCls } from '../../primitives/Caption'
import { CheckpointBlock, PromptBlock, SkipButton } from '../../primitives/Checkpoint'
import { ChoiceRow } from '../../primitives/ChoiceRow'
import { cn as clsx } from '../../primitives/cn'
import { AGAIN_LABEL, SHOW_LABEL } from './content'
import { TRAILING_WIDTH, dockGhostStrings, type Scene } from './layout'

/**
 * The list-keys dock is the shared checkpoint (H3 R2 Q4,
 * `primitives/Checkpoint.tsx`): the text cell (the question with its note
 * line, then the verdict with its tally in the same place), then the choice
 * row with the trailing action at its end. The choices stay in place from
 * the question to the reveal; Skip trails them and "Try another" takes
 * Skip's place on the reveal, so the next action is where the pointer
 * already is. The trailing cell is as wide as "Try another"
 * (`TRAILING_WIDTH`, the block's `trail`).
 *
 * Every cell is as tall as its tallest state (ghost stacks, D15), measured
 * per preset (H3 R2): one invisible block per choice set of the scene, each
 * with every question and verdict as text ghosts, so nothing moves when the
 * action, the key or the phase changes.
 */

/** The note under the text: "Last time: ..." on the question, the tally on the reveal. */
export const noteCls = lastTimeCls

/** The trailing cell: Skip and "Show me" live, "Try another" reserved, so they share one place. */
export function TrailingGhosts() {
  return (
    <>
      <span aria-hidden className={clsx(buttonClasses(), 'invisible col-start-1 row-start-1')}>
        {AGAIN_LABEL}
      </span>
      <span aria-hidden className={clsx(buttonClasses({ variant: 'text' }), 'invisible col-start-1 row-start-1')}>
        {SHOW_LABEL}
      </span>
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

/** Invisible copies of the scene's longest questions and every verdict, each with its note line. */
export function TextGhosts({ scene }: { scene: Scene }) {
  const g = dockGhostStrings(scene)
  return (
    <>
      {g.prompts.map((p) => (
        <div key={`p-${p}`} aria-hidden className={clsx('invisible', cell)}>
          <PromptBlock live={false} prompt={p} note={null} noteReserve={g.lastTime} />
        </div>
      ))}
      {g.reveals.map((r) => (
        <div key={`r-${r.lead}|${r.rule}`} aria-hidden data-viz-part="dock-ghosts" className={clsx('invisible', cell)}>
          <VerdictText {...r} />
          <p className={noteCls}>{g.tally}</p>
        </div>
      ))}
    </>
  )
}

/**
 * One invisible checkpoint block per choice set the scene can show, stacked
 * in the dock's cell, so the dock is as tall as the tallest set at the
 * current width and text size (Q5: wrapped labels included), whichever
 * action is chosen.
 */
export function DockGhosts({ scene, sets }: { scene: Scene; sets: readonly (readonly { id: string; label: string }[])[] }) {
  const mono = scene === 'wrapper'
  return (
    <div aria-hidden className={clsx('invisible grid', cell)}>
      {sets.map((set) => (
        <CheckpointBlock
          key={set.map((c) => c.id).join('|')}
          ghost
          className={cell}
          labels={set.map((c) => c.label)}
          mono={mono}
          trail={TRAILING_WIDTH}
          text={null}
          textGhosts={<TextGhosts scene={scene} />}
          choices={set.map((c, i) => (
            <ChoiceRow key={c.id} index={i} label={c.label} mono={mono} tabIndex={-1} role="none" />
          ))}
          skip={
            <span className="grid">
              <TrailingGhosts />
              <SkipButton tabIndex={-1} unavailable className={cell} />
            </span>
          }
        />
      ))}
    </div>
  )
}
