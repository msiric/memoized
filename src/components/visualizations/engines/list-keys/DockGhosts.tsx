import type { CSSProperties, ReactNode } from 'react'
import { Feedback, promptCls } from '../../primitives/Caption'
import { cn as clsx } from '../../primitives/cn'
import { ink, type as typeScale } from '../../primitives/tokens-v3'
import { CHOICE } from '../../shell/footprint'
import { toRem } from '../../substrates/units'
import { WIDE_CHOICES, dockGhostStrings, type Scene } from './layout'

/**
 * The list-keys dock: one checkpoint block for both phases (H3 R4, the event
 * loop's pattern). The choice rows stay in place from the question to the
 * reveal, and their number slots become ✓ or ×; the text cell holds the
 * question, then the verdict in the same place; the action row holds Skip,
 * then "Try another". The text cell is as tall as the scene's tallest
 * question or verdict (a ghost stack, D15), measured per preset (H3 R2).
 */
export const DOCK = {
  block:
    'grid grid-cols-1 items-start vz-wide:grid-cols-[minmax(0,1fr)_var(--lk-choices-w)] vz-wide:gap-x-4',
  blockStyle: { rowGap: toRem(CHOICE.textGap), ['--lk-choices-w' as string]: toRem(WIDE_CHOICES) } as CSSProperties,
  text: 'grid min-w-0 vz-wide:col-start-1 vz-wide:row-start-1',
  choices: 'grid grid-cols-2 vz-wide:col-start-2 vz-wide:row-span-2 vz-wide:row-start-1',
  choicesStyle: { gap: toRem(CHOICE.gap) } as CSSProperties,
  actions: 'flex min-w-0 items-center gap-x-3 vz-wide:col-start-1 vz-wide:row-start-2',
  prompt: promptCls,
  /** The tally in the action row (H3 F2 ruling 2): status type, muted, at the row's end. */
  tally: clsx('m-0 ml-auto min-w-0 line-clamp-2 text-right', typeScale.status.cls, ink.muted),
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

/** Invisible copies of the scene's longest questions and verdicts, stacked in the text cell. */
export function TextGhosts({ scene }: { scene: Scene }) {
  const g = dockGhostStrings(scene)
  return (
    <>
      {g.prompts.map((p) => (
        <p key={`p-${p}`} aria-hidden className={clsx('invisible', cell, DOCK.prompt)}>
          {p}
        </p>
      ))}
      {g.reveals.map((r) => (
        <div key={`r-${r.lead}|${r.rule}`} aria-hidden data-viz-part="dock-ghosts" className={clsx('invisible', cell)}>
          <VerdictText {...r} />
        </div>
      ))}
    </>
  )
}

/**
 * The live text in the ghosts' cell: on its own row (narrow) it sits on the
 * choices under it; beside them (wide) it starts level with the first row.
 */
export function TextCell({ scene, children }: { scene: Scene; children: ReactNode }) {
  return (
    <div className={DOCK.text}>
      <TextGhosts scene={scene} />
      <div className={clsx(cell, 'min-w-0 self-end vz-wide:self-start')}>{children}</div>
    </div>
  )
}
