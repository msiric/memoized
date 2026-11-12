import type { CSSProperties } from 'react'
import { Button } from '../../primitives/Button'
import { captionCls, promptCls } from '../../primitives/Caption'
import { cn as clsx } from '../../primitives/cn'
import { ink } from '../../primitives/tokens-v3'
import { CHOICE } from '../../shell/footprint'
import { toRem } from '../../substrates/units'
import { BACK_LABEL, SKIP_LABEL } from './content'
import { REVEAL_BUTTON, WIDE_CHOICES, dockGhostStrings } from './layout'
import { LIST_ACTIONS, WRAPPER_ACTIONS } from './model'

/**
 * The list-keys dock's markup, shared by the live dock and its ghosts, so a
 * ghost is laid out exactly like the state it stands for (D15).
 */
export const DOCK = {
  pick: 'flex flex-col',
  pickStyle: { gap: toRem(8) } as CSSProperties,
  pickGrid: (scene: 'list' | 'wrapper') =>
    clsx('grid gap-2', scene === 'list' ? 'grid-cols-2 vz-wide:grid-cols-4' : 'grid-cols-2'),
  ask: 'grid grid-cols-1 vz-wide:grid-cols-[minmax(0,1fr)_var(--lk-choices-w)] vz-wide:gap-x-4',
  askStyle: { rowGap: toRem(CHOICE.textGap), ['--lk-choices-w' as string]: toRem(WIDE_CHOICES) } as CSSProperties,
  prompt: clsx(promptCls, 'vz-wide:col-start-1 vz-wide:row-start-1'),
  choices: 'grid grid-cols-2 vz-wide:col-start-2 vz-wide:row-span-2 vz-wide:row-start-1 vz-wide:self-start',
  choicesStyle: { gap: toRem(CHOICE.gap) } as CSSProperties,
  /** Wraps under large text rather than running past the frame. */
  askActions: 'flex flex-wrap items-center gap-x-2 vz-wide:col-start-1 vz-wide:row-start-2',
  reveal: 'flex flex-col vz-wide:flex-row vz-wide:items-start',
  revealStyle: { gap: toRem(8) } as CSSProperties,
  revealText: 'min-w-0 vz-wide:flex-1 vz-wide:pr-2',
  feedback: clsx(captionCls, ink.base),
  rule: clsx(captionCls, 'mt-2'),
  again: 'mt-2 self-start vz-wide:mt-0 vz-wide:w-[var(--lk-again-w)]',
  againStyle: { ['--lk-again-w' as string]: toRem(REVEAL_BUTTON) } as CSSProperties,
}

const ghosts = dockGhostStrings()
const cell = 'col-start-1 row-start-1'

/**
 * Invisible copies of the dock's tallest states, stacked in the dock's one
 * grid cell: the dock is as tall as its tallest state at the current width
 * and text size, so it never moves between phases and nothing overflows it
 * under large text (D15, D19).
 */
export function DockGhosts() {
  const slot = <div className="h-11" />
  return (
    <div aria-hidden data-viz-part="dock-ghosts" className={clsx('invisible grid', cell)}>
      {(['list', 'wrapper'] as const).map((scene, k) => (
        <div key={`pick-${scene}`} className={clsx(DOCK.pick, cell)} style={DOCK.pickStyle}>
          <p className={captionCls}>{ghosts.hints[k]}</p>
          <div className={DOCK.pickGrid(scene)}>
            {(scene === 'list' ? LIST_ACTIONS : WRAPPER_ACTIONS).map((a) => (
              <div key={a}>{slot}</div>
            ))}
          </div>
        </div>
      ))}
      {ghosts.prompts.map((prompt) => (
        <div key={`ask-${prompt}`} className={clsx(DOCK.ask, cell)} style={DOCK.askStyle}>
          <p className={DOCK.prompt}>{prompt}</p>
          <div className={DOCK.choices} style={DOCK.choicesStyle}>
            {Array.from({ length: ghosts.maxChoices }, (_, i) => (
              <div key={i}>{slot}</div>
            ))}
          </div>
          <div className={DOCK.askActions}>
            <Button variant="text" tabIndex={-1}>
              {SKIP_LABEL}
            </Button>
            <Button variant="text" tabIndex={-1}>
              {BACK_LABEL}
            </Button>
          </div>
        </div>
      ))}
      {ghosts.reveals.map((r) => (
        <div key={`reveal-${r.feedback}-${r.rule}`} className={clsx(DOCK.reveal, cell)} style={DOCK.revealStyle}>
          <div className={DOCK.revealText}>
            <p className={DOCK.feedback}>
              {r.lead ? <span className="font-semibold">{r.lead}</span> : null} {r.sentence}
            </p>
            <p className={DOCK.rule}>{r.rule}</p>
          </div>
          <Button tabIndex={-1} className={DOCK.again} style={DOCK.againStyle}>
            Try another action
          </Button>
        </div>
      ))}
    </div>
  )
}
