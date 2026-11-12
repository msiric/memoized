import type {
  KeyStrategy,
  ListAction,
  ListOutcome,
  WrapperAction,
  WrapperOutcome,
} from './model'

/**
 * What React actually did, recorded from real renders (spec P6). The visual
 * draws only from this table. `list-keys.truth.test.ts` re-renders every
 * combination with the React versions below (react-dom, jsdom), for every
 * set of starting checks and for both DOM state and `useState`, and fails on
 * any difference.
 *
 * `reused[i]`: the starting row (0 = Buy milk, 1 = Walk dog) whose instance
 * new row `i` kept, or `null` when React mounted a new one.
 */
export const RECORDED_WITH = {
  react: ['18.3.1', '19.3.1'],
  generator: 'react-dom-jsdom@1',
} as const

export const LIST_OUTCOMES: Record<
  `${KeyStrategy}/${ListAction}`,
  ListOutcome
> = {
  // Index keys match by position.
  'index/insert-top': { reused: [0, 1, null] },
  'index/delete-first': { reused: [0] },
  'index/append': { reused: [0, 1, null] },
  'index/reverse': { reused: [0, 1] },
  // Stable ids match by item.
  'id/insert-top': { reused: [null, 0, 1] },
  'id/delete-first': { reused: [1] },
  'id/append': { reused: [0, 1, null] },
  'id/reverse': { reused: [1, 0] },
  // New keys on every render match nothing.
  'random/insert-top': { reused: [null, null, null] },
  'random/delete-first': { reused: [null] },
  'random/append': { reused: [null, null, null] },
  'random/reverse': { reused: [null, null] },
}

export const WRAPPER_OUTCOMES: Record<WrapperAction, WrapperOutcome> = {
  type: { wrapperReused: false, counterReused: false },
  class: { wrapperReused: true, counterReused: true },
}
