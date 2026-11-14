/**
 * The list-keys explorable: data model (React-free).
 *
 * Two scenes share one stage:
 * - `list`: a TodoList whose rows each hold DOM state (a checkbox). The
 *   learner picks a key strategy and an action, predicts, then sees which
 *   instance each new row was matched to.
 * - `wrapper`: one `Counter` inside a wrapper element whose type (or only
 *   its className) changes.
 *
 * What React does for every combination is NOT computed here: it is the
 * recorded table in `outcomes.ts`, re-verified against real React 18 and 19
 * renders by `list-keys.truth.test.ts`. This file only derives what a row
 * shows from that table and the learner's starting checks.
 */

export type ItemId = 'milk' | 'dog' | 'wake' | 'mom'
export type Item = { id: ItemId; text: string }

export const ITEMS: Record<ItemId, Item> = {
  milk: { id: 'milk', text: 'Buy milk' },
  dog: { id: 'dog', text: 'Walk dog' },
  wake: { id: 'wake', text: 'Wake up' },
  mom: { id: 'mom', text: 'Call mom' },
}

/** The starting list, in order. */
export const BEFORE: readonly ItemId[] = ['milk', 'dog']

export type KeyStrategy = 'index' | 'id' | 'random'
export const KEY_STRATEGIES: readonly KeyStrategy[] = ['index', 'id', 'random']

export type ListAction = 'insert-top' | 'delete-first' | 'append' | 'reverse'
export const LIST_ACTIONS: readonly ListAction[] = [
  'insert-top',
  'delete-first',
  'append',
  'reverse',
]

export type WrapperAction = 'type' | 'class'
export const WRAPPER_ACTIONS: readonly WrapperAction[] = ['type', 'class']

/** The list after each action. */
export const AFTER: Record<ListAction, readonly ItemId[]> = {
  'insert-top': ['wake', 'milk', 'dog'],
  'delete-first': ['dog'],
  append: ['milk', 'dog', 'mom'],
  reverse: ['dog', 'milk'],
}

export const ACTION_LABEL: Record<ListAction, string> = {
  'insert-top': 'Insert at top',
  'delete-first': 'Delete first',
  append: 'Append',
  reverse: 'Reverse',
}

/** Lower-case form for sentences ("after insert at top"). */
export const ACTION_PHRASE: Record<ListAction, string> = {
  'insert-top': 'inserting Wake up at the top',
  'delete-first': 'deleting the first row',
  append: 'appending Call mom',
  reverse: 'reversing the list',
}

export const WRAPPER_LABEL: Record<WrapperAction, string> = {
  type: '<div> to <span>',
  class: 'className only',
}

export const KEY_LABEL: Record<KeyStrategy, string> = {
  index: 'index',
  id: 'id',
  random: 'Math.random()',
}

/** The key expression as written in the code (`key={…}`). */
export const KEY_EXPR: Record<KeyStrategy, string> = {
  index: 'i',
  id: 'todo.id',
  random: 'Math.random()',
}

/**
 * Instances (fibers with their DOM node and state). The starting rows mount
 * as A and B, in order. Rows mounted by an action take the next letters in
 * row order.
 */
export type Instance = string
export const BEFORE_INSTANCES: readonly Instance[] = ['A', 'B']

/**
 * React's match for one combination: for each new row, the starting row whose
 * instance it reused (0 or 1), or `null` when React mounted a new instance.
 * Starting rows that no new row reused were unmounted.
 */
export type ListOutcome = { reused: readonly (0 | 1 | null)[] }

export type WrapperOutcome = {
  /** Did the wrapper element keep its DOM node? */
  wrapperReused: boolean
  /** Did Counter keep its instance (and so its state)? */
  counterReused: boolean
}

export type Checks = Readonly<Record<'milk' | 'dog', boolean>>
export const DEFAULT_CHECKS: Checks = { milk: true, dog: false }

export type AfterRow = {
  item: ItemId
  /** The starting row whose instance this row reuses, or null if mounted. */
  from: 0 | 1 | null
  instance: Instance
  checked: boolean
  /** The DOM state this row shows belongs to a different item. */
  status: 'kept' | 'lost' | 'foreign' | null
  key: string
}

/** Key values as drawn. Random keys are illustrative: every render draws new ones. */
const RANDOM_BEFORE = ['0.82…', '0.17…']
const RANDOM_AFTER = ['0.46…', '0.93…', '0.05…']

export function keyText(
  strategy: KeyStrategy,
  item: ItemId,
  index: number,
  phase: 'before' | 'after',
): string {
  if (strategy === 'index') return String(index)
  if (strategy === 'id') return `'${item}'`
  return (phase === 'before' ? RANDOM_BEFORE : RANDOM_AFTER)[index]
}

/** What every new row shows, given React's match and the learner's checks. */
export function afterRows(
  strategy: KeyStrategy,
  action: ListAction,
  outcome: ListOutcome,
  checks: Checks,
): AfterRow[] {
  let next = BEFORE_INSTANCES.length
  return AFTER[action].map((item, i) => {
    const from = outcome.reused[i]
    const instance =
      from === null ? String.fromCharCode(65 + next++) : BEFORE_INSTANCES[from]
    const checked =
      from === null ? false : checks[BEFORE[from] as 'milk' | 'dog']
    const ownStart = BEFORE.indexOf(item)
    const hadCheck = ownStart >= 0 && checks[item as 'milk' | 'dog']
    let status: AfterRow['status'] = null
    if (checked && from !== ownStart) status = 'foreign'
    else if (hadCheck && from !== ownStart) status = 'lost'
    else if (hadCheck) status = 'kept'
    return {
      item,
      from,
      instance,
      checked,
      status,
      key: keyText(strategy, item, i, 'after'),
    }
  })
}

/** Starting rows whose instance no new row reused. */
export function unmountedRows(outcome: ListOutcome): (0 | 1)[] {
  return ([0, 1] as const).filter((r) => !outcome.reused.includes(r))
}

/**
 * The prediction is about one check: the first checked starting row. Where
 * does its state end up? Returns the new row index, or null if it was lost.
 */
export function trackedRow(checks: Checks): 0 | 1 | null {
  if (checks.milk) return 0
  if (checks.dog) return 1
  return null
}

export function destinationOf(
  outcome: ListOutcome,
  tracked: 0 | 1,
): number | null {
  const at = outcome.reused.indexOf(tracked)
  return at < 0 ? null : at
}
