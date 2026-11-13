import type { CSSProperties, ReactNode } from 'react'
import { promptCls } from '../../primitives/Caption'
import { cn as clsx } from '../../primitives/cn'
import { ink, type as typeScale } from '../../primitives/tokens-v3'
import { CHOICE } from '../../shell/footprint'
import { toRem } from '../../substrates/units'
import { PARA_GAP, WIDE_CHOICES, dockGhostStrings, type Scene } from './layout'

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
  actions: 'flex flex-wrap items-center gap-x-2 vz-wide:col-start-1 vz-wide:row-start-2',
  prompt: promptCls,
  /** UI copy (H3 R3): 14/24, the feedback style of the event loop (H3 R4, X05). */
  feedback: clsx('m-0', typeScale.body.cls, 'text-pretty', ink.secondary),
  lead: clsx('font-semibold', ink.base),
  tally: clsx('m-0', typeScale.status.cls, ink.muted),
  paraStyle: { marginTop: toRem(PARA_GAP) } as CSSProperties,
}

/** The verdict block: lead and outcome, the rule, then the tally. */
export function VerdictText({
  lead,
  sentence,
  rule,
  tally,
  live = false,
}: {
  lead: string
  sentence: string
  rule: string
  tally: string
  live?: boolean
}) {
  return (
    <>
      <p className={DOCK.feedback} data-viz-part={live ? 'viz-feedback' : undefined}>
        {lead ? <span className={DOCK.lead}>{lead}</span> : null} {sentence}
      </p>
      <p className={DOCK.feedback} style={DOCK.paraStyle} data-viz-part={live ? 'viz-caption' : undefined}>
        {rule}
      </p>
      <p className={DOCK.tally} style={DOCK.paraStyle} data-viz-part={live ? 'viz-counts' : undefined}>
        {tally}
      </p>
    </>
  )
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
        <div key={`r-${r.lead}|${r.sentence}|${r.rule}`} aria-hidden data-viz-part="dock-ghosts" className={clsx('invisible', cell)}>
          <VerdictText {...r} />
        </div>
      ))}
    </>
  )
}

/** The live text in the ghosts' cell. */
export function TextCell({ scene, children }: { scene: Scene; children: ReactNode }) {
  return (
    <div className={DOCK.text}>
      <TextGhosts scene={scene} />
      <div className={clsx(cell, 'min-w-0 self-end')}>{children}</div>
    </div>
  )
}
