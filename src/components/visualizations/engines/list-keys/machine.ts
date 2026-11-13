import { NONE_ID, listAnswer } from './content'
import type { PresetConfig } from './descriptor'
import {
  DEFAULT_CHECKS,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  trackedRow,
  type Checks,
  type KeyStrategy,
  type ListAction,
  type WrapperAction,
} from './model'
import { LIST_OUTCOMES, WRAPPER_OUTCOMES } from './outcomes'

/**
 * The explorable's state machine (pure). The key and the action are always
 * chosen (two visible controls, H3 R8), so there are two phases:
 * - `ask`: the After column shows `?`, and the learner predicts (spec §5.4:
 *   the prediction comes before the reveal);
 * - `reveal`: React's recorded outcome, with feedback and the rule.
 * Changing the key, the action, a check or the count re-runs the
 * experiment, so it asks again. "Try another" moves to the next action.
 */

export type Scene = 'list' | 'wrapper'
export type Phase = 'ask' | 'reveal'

export type ExploreState = {
  scene: Scene
  key: KeyStrategy
  listAction: ListAction
  wrapperAction: WrapperAction
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
  | { type: 'again' }

export const START_COUNT = 7
export const MAX_COUNT = 99

export function initialExplore(p: PresetConfig): ExploreState {
  const base: ExploreState = {
    scene: p.scene,
    key: 'index',
    listAction: LIST_ACTIONS[0],
    wrapperAction: WRAPPER_ACTIONS[0],
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

/** The scene's current action. */
export const actionOf = (s: ExploreState): ListAction | WrapperAction =>
  s.scene === 'list' ? s.listAction : s.wrapperAction

/** Identifies one experiment: what the learner predicted about. */
export function experimentId(s: ExploreState): string {
  if (s.scene === 'wrapper') return `wrapper/${s.wrapperAction}`
  return `${s.key}/${s.listAction}/${trackedRow(s.checks) ?? 'none'}`
}

/** The correct choice id for the current experiment, or null when there is nothing to predict. */
export function answerOf(s: ExploreState): string | null {
  if (s.scene === 'wrapper')
    return WRAPPER_OUTCOMES[s.wrapperAction].counterReused ? 'kept' : 'reset'
  const t = trackedRow(s.checks)
  if (t === null) return null
  return (
    listAnswer(s.listAction, LIST_OUTCOMES[`${s.key}/${s.listAction}`], t) ??
    NONE_ID
  )
}

const reask = (s: ExploreState): ExploreState => ({ ...s, phase: 'ask', pick: undefined })

/** The action after `a` in the scene's order, wrapping. */
function nextAction<A extends string>(order: readonly A[], a: A): A {
  return order[(order.indexOf(a) + 1) % order.length]
}

export function explore(s: ExploreState, a: ExploreAction): ExploreState {
  switch (a.type) {
    case 'scene':
      return a.scene === s.scene ? s : reask({ ...s, scene: a.scene })
    case 'key':
      return a.key === s.key ? s : reask({ ...s, key: a.key })
    case 'check':
      return reask({
        ...s,
        checks: { ...s.checks, [a.item]: !s.checks[a.item] },
      })
    case 'increment':
      return s.count >= MAX_COUNT ? s : reask({ ...s, count: s.count + 1 })
    case 'apply': {
      if (a.action === actionOf(s)) return s.phase === 'ask' ? s : reask(s)
      return s.scene === 'list'
        ? reask({ ...s, listAction: a.action as ListAction })
        : reask({ ...s, wrapperAction: a.action as WrapperAction })
    }
    case 'answer': {
      if (s.phase !== 'ask' || answerOf(s) === null) return s
      const id = experimentId(s)
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
    case 'again':
      return s.scene === 'list'
        ? reask({ ...s, listAction: nextAction(LIST_ACTIONS, s.listAction) })
        : reask({ ...s, wrapperAction: nextAction(WRAPPER_ACTIONS, s.wrapperAction) })
  }
}
