import {
  AFTER,
  BEFORE,
  BEFORE_INSTANCES,
  ITEMS,
  KEY_EXPR,
  destinationOf,
  type Checks,
  type ItemId,
  type KeyStrategy,
  type ListAction,
  type ListOutcome,
  type WrapperAction,
} from './model'

/**
 * Authored words for the list-keys explorable. Each rule caption states the
 * cause (spec §5.3); the specific sentence is generated from React's recorded
 * match, so it can never disagree with what is drawn.
 */

export const TITLE = 'React keys: where row state goes'
/**
 * The wrapper-type case is its own preset (D17), not a tab in the list
 * frame: it serves the diffing question (a type change at a slot remounts
 * the subtree), so it gets its own title and layout.
 */
export const WRAPPER_TITLE = 'React identity: type at a slot'

/**
 * One rule per combination: the verdict's second sentence (H3 F2 ruling 2:
 * two short sentences), so at most 64 characters: with the longest lead
 * ("Answer: It’s lost.") the verdict stays within two lines at 320, so the
 * dock's reserve above the question is one tally line, not a third line of
 * verdict (final polish).
 */
export const LIST_RULE: Record<`${KeyStrategy}/${ListAction}`, string> = {
  'index/insert-top': 'Index keys match by position, so the check stays in its slot.',
  'index/delete-first': 'Index keys match by position, so the last slot unmounts.',
  'index/append': 'Appending keeps earlier positions, so index keys are safe here.',
  'index/reverse': 'Index keys match by position, so checks stay in their slots.',
  'id/insert-top': 'Stable ids match items, so rows keep state; only Wake up mounts.',
  'id/delete-first': 'Stable ids match items, so only Buy milk unmounts.',
  'id/append': 'Stable ids match items, so only Call mom mounts.',
  'id/reverse': 'Stable ids match items, so each check moves with its item.',
  'random/insert-top': 'Keys change every render, so every row loses its state.',
  'random/delete-first': 'Keys change every render, so even Walk dog loses its state.',
  'random/append': 'Keys change every render, so every row loses its state.',
  'random/reverse': 'Keys change every render, so every row loses its state.',
}

export const WRAPPER_RULE: Record<WrapperAction, string> = {
  type: 'Type is part of identity, so a new type unmounts the subtree.',
  class: 'Same type at the same slot, so Counter keeps its state.',
}

/**
 * The Start step's caption in the step-log (the explorable opens at its
 * prediction, with the key and the action already chosen).
 */
export const SETUP_HINT = {
  list: 'Check a row, choose a key and an action, then predict where its check goes.',
  wrapper: 'Press Add 1 to change the count, choose a change, then predict.',
} as const

/** The setup line in the key row's place for the wrapper scene. */
export const WRAPPER_SETUP =
  'No list here: React matches the Counter by position and element type.'

/** Asked instead of a prediction when no row holds state. */
export const NO_CHECK_PROMPT =
  'Nothing is checked, so no state can move. Check a row in Before first.'

export const NONE_ID = 'none'
export const NONE_LABEL = 'It’s lost'

export const listPrompt = (tracked: ItemId) =>
  `Where does ${ITEMS[tracked].text}’s check end up?`

export function listChoices(
  action: ListAction,
): { id: string; label: string }[] {
  return [
    ...AFTER[action].map((id) => ({ id: String(id), label: ITEMS[id].text })),
    { id: NONE_ID, label: NONE_LABEL },
  ]
}

/**
 * The answer: the item now showing the tracked check, or `none`. Choice ids
 * are item ids, so an answer is a row by what it shows, not by position.
 */
export function listAnswer(
  action: ListAction,
  outcome: ListOutcome,
  tracked: 0 | 1,
): string {
  const at = destinationOf(outcome, tracked)
  return at === null ? NONE_ID : AFTER[action][at]
}

/** What happened to the tracked check, generated from the recorded match. */
export function listOutcomeSentence(
  action: ListAction,
  outcome: ListOutcome,
  checks: Checks,
): string {
  const tracked = checks.milk ? 0 : checks.dog ? 1 : null
  if (tracked === null)
    return 'Nothing was checked, so there was no state to move.'
  const item = ITEMS[BEFORE[tracked]].text
  const inst = BEFORE_INSTANCES[tracked]
  const at = destinationOf(outcome, tracked)
  if (at === null)
    return `Instance ${inst} was unmounted, so ${item}’s check is gone.`
  const shows = AFTER[action][at]
  if (shows === BEFORE[tracked])
    return `Instance ${inst} stayed with ${item}, so ${item} keeps its check.`
  return `Instance ${inst} now renders ${ITEMS[shows].text}, so ${item}’s check shows there.`
}

export const wrapperPrompt = (action: WrapperAction) =>
  action === 'type'
    ? '<div> becomes <span>. What will Counter show?'
    : 'Only className changes. What will Counter show?'

export const wrapperChoices = (count: number) => [
  { id: 'kept', label: `count ${count}` },
  { id: 'reset', label: 'count 0' },
]

export function wrapperOutcomeSentence(
  action: WrapperAction,
  count: number,
): string {
  return action === 'type'
    ? 'The <div> was replaced, so Counter A unmounted and a new Counter B mounted at 0.'
    : `The <div> stayed, so Counter A kept its instance and count ${count}.`
}

export type Pick = string | null | undefined

/** Reveal feedback (spec §5.4): skipping names the answer; the rows mark right and wrong. */
export function feedbackLead(
  pick: Pick,
  answer: string,
  labelOf: (id: string) => string,
): string {
  if (pick === undefined) return ''
  if (pick === null) return `Answer: ${labelOf(answer)}.`
  if (pick === answer) return 'Right.'
  // The picked row carries the ×, so the lead does not repeat it (as the
  // event loop's checkpoint feedback, H3 R4).
  return 'Not quite.'
}

/** `key={i}`-style label for the status bar and narration. */
export const keyPhrase = (k: KeyStrategy) => `key={${KEY_EXPR[k]}}`

/** The dock's one secondary action per phase (H3 R4): the shared Skip, then "Try another". Skip's accessible name, as the event loop's. */
export const SKIP_NAME = 'Skip, show me'
/** With nothing checked there is no prediction to skip. */
export const SHOW_LABEL = 'Show me'
export const AGAIN_LABEL = 'Try another'

/** The two control rows' labels. */
export const CONTROL_LABEL = { key: 'Key', action: 'Action', change: 'Change' } as const
