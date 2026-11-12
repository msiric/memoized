import { NONE_ID, listAnswer } from './content'
import type { PresetConfig } from './descriptor'
import {
  DEFAULT_CHECKS,
  trackedRow,
  type Checks,
  type KeyStrategy,
  type ListAction,
  type WrapperAction,
} from './model'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'

/**
 * The explorable's state machine (pure). Phases:
 * - `pick`: the learner sets the starting state and picks an action;
 * - `ask`: the action is chosen, the After column shows `?`, and the learner
 *   predicts (spec §5.4: the prediction comes before the reveal);
 * - `reveal`: React's recorded outcome, with feedback and the rule.
 * Changing the key, a check or the count re-runs the experiment, so it asks again.
 */

export type Scene = 'list' | 'wrapper'
export type Phase = 'pick' | 'ask' | 'reveal'

export type ExploreState = {
  scene: Scene
  key: KeyStrategy
  listAction: ListAction | null
  wrapperAction: WrapperAction | null
  checks: Checks
  count: number
  phase: Phase
  /** undefined: not answered; null: skipped; otherwise the choice id. */
  pick: string | null | undefined
  /** Last answer per experiment, for "last time" (session only, never sent). */
  memory: Readonly<Record<string, string>>
  /** Increments on every reveal, so its drawing replays. */
  reveals: number
}

export type ExploreAction =
  | { type: 'scene'; scene: Scene }
  | { type: 'key'; key: KeyStrategy }
  | { type: 'check'; item: 'milk' | 'dog' }
  | { type: 'increment' }
  | { type: 'apply'; action: ListAction | WrapperAction }
  | { type: 'answer'; choice: string }
  | { type: 'skip' }
  | { type: 'back' }
  | { type: 'again' }

export const START_COUNT = 7
export const MAX_COUNT = 99

export function initialExplore(p: PresetConfig): ExploreState {
  const base: ExploreState = {
    scene: p.scene,
    key: 'index',
    listAction: null,
    wrapperAction: null,
    checks: DEFAULT_CHECKS,
    count: START_COUNT,
    phase: 'ask',
    pick: undefined,
    memory: {},
    reveals: 0,
  }
  return p.scene === 'list'
    ? { ...base, key: p.key, listAction: p.action, checks: p.checks }
    : { ...base, wrapperAction: p.action, count: p.count }
}

/** Identifies one experiment: what the learner predicted about. */
export function experimentId(s: ExploreState): string | null {
  if (s.scene === 'wrapper')
    return s.wrapperAction ? `wrapper/${s.wrapperAction}` : null
  const t = trackedRow(s.checks)
  return s.listAction ? `${s.key}/${s.listAction}/${t ?? 'none'}` : null
}

/** The correct choice id for the current experiment, or null when there is nothing to predict. */
export function answerOf(s: ExploreState): string | null {
  if (s.scene === 'wrapper') {
    if (!s.wrapperAction) return null
    return WRAPPER_OUTCOMES[s.wrapperAction].counterReused ? 'kept' : 'reset'
  }
  const t = trackedRow(s.checks)
  if (!s.listAction || t === null) return null
  return (
    listAnswer(s.listAction, LIST_OUTCOMES[`${s.key}/${s.listAction}`], t) ??
    NONE_ID
  )
}

const hasAction = (s: ExploreState) =>
  (s.scene === 'list' ? s.listAction : s.wrapperAction) !== null
const reask = (s: ExploreState): ExploreState =>
  s.phase === 'pick' || !hasAction(s)
    ? s
    : { ...s, phase: 'ask', pick: undefined }

export function explore(s: ExploreState, a: ExploreAction): ExploreState {
  switch (a.type) {
    case 'scene':
      return a.scene === s.scene
        ? s
        : { ...s, scene: a.scene, phase: 'pick', pick: undefined }
    case 'key':
      return a.key === s.key ? s : reask({ ...s, key: a.key })
    case 'check':
      return reask({
        ...s,
        checks: { ...s.checks, [a.item]: !s.checks[a.item] },
      })
    case 'increment':
      return s.count >= MAX_COUNT ? s : reask({ ...s, count: s.count + 1 })
    case 'apply':
      return s.scene === 'list'
        ? {
            ...s,
            listAction: a.action as ListAction,
            phase: 'ask',
            pick: undefined,
          }
        : {
            ...s,
            wrapperAction: a.action as WrapperAction,
            phase: 'ask',
            pick: undefined,
          }
    case 'answer': {
      if (s.phase !== 'ask' || answerOf(s) === null) return s
      const id = experimentId(s)!
      return {
        ...s,
        phase: 'reveal',
        pick: a.choice,
        memory: { ...s.memory, [id]: a.choice },
        reveals: s.reveals + 1,
      }
    }
    case 'skip':
      return s.phase === 'ask'
        ? { ...s, phase: 'reveal', pick: null, reveals: s.reveals + 1 }
        : s
    case 'back':
    case 'again':
      return s.phase === 'pick' ? s : { ...s, phase: 'pick', pick: undefined }
  }
}
