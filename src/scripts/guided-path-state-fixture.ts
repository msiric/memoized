import assert from 'node:assert/strict'

export const G4_OLD_READER_SHA = 'bb5d8143d289f3e835e58628be30c4345da2db2b'
export const UNRELATED_LESSON = '/js-track/core-fundamentals/data-types'
export const UNRELATED_PROBLEM = `${UNRELATED_LESSON}/layout-question-1`

export const STATE_PROFILES = [
  { key: 'empty-free', premium: false, marks: [], lesson: false, unrelated: false },
  { key: 'full-free', premium: false, marks: [0, 1, 2, 3], lesson: false, unrelated: false },
  { key: 'empty-premium', premium: true, marks: [], lesson: false, unrelated: false },
  { key: 'optional-only', premium: false, marks: [4], lesson: false, unrelated: false },
  { key: 'lesson-only', premium: true, marks: [], lesson: true, unrelated: false },
  { key: 'shared', premium: false, marks: [0, 4], lesson: true, unrelated: true },
  { key: 'filtered-bank-three', premium: false, marks: [3, 4], lesson: true, unrelated: true },
  { key: 'filtered-bank-two', premium: false, marks: [2, 3, 4], lesson: true, unrelated: true },
  { key: 'entitlement', premium: true, marks: [0, 2, 4], lesson: true, unrelated: true },
  { key: 'race-old', premium: false, marks: [0, 4], lesson: true, unrelated: true },
  { key: 'race-new', premium: false, marks: [0, 1, 3, 4], lesson: true, unrelated: true },
  { key: 'compat-free', premium: false, marks: [0, 4], lesson: true, unrelated: true },
  { key: 'compat-premium', premium: true, marks: [0, 2, 4], lesson: true, unrelated: true },
] as const

export type StateProfile = typeof STATE_PROFILES[number]['key']

export function stateUserId(key: StateProfile) {
  return `g4-ci-state-${key}`
}

export function assertStateFixtureDatabase() {
  assert.equal(process.env.READER_LAYOUT_FIXTURE, '1', 'Explicit fixture opt-in is required')
  for (const value of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].filter(Boolean)) {
    const target = new URL(value!)
    assert(['localhost', '127.0.0.1'].includes(target.hostname), 'Only loopback fixture databases are allowed')
    assert.equal(target.pathname, '/memoized_ci', 'Only the disposable hosted CI database is allowed')
    assert(['', 'public'].includes(target.searchParams.get('schema') ?? ''), 'Only the disposable public schema is allowed')
  }
  assert(process.env.DATABASE_URL, 'A disposable fixture database URL is required')
}
