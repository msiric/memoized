import type { ProgramSource } from '../../step-log/lesson-source'
import type { GcRun } from './truth/record-gc'

/**
 * The programs the reachability presets draw (memory-management, FREE;
 * memory-leaks, PREMIUM), by locator and sha256: the premium-code policy keeps
 * every lesson block and practice answer out of the repo. Harness parts are
 * calls, stubs for the functions an answer leaves undefined, and one line or
 * block boundary per state the figure shows (each said in the provenance).
 * Probes name lines of the program as run. `yarn viz:reach` records them.
 */

export type ReachProgram = GcRun & { id: string; source: ProgramSource; harness: string }

const MM = 'content/js-track/core-fundamentals/memory-management/page.mdx'
const ML = 'content/js-track/advanced-concepts/_lessons.json'

const EX5 = {
  block: { path: MM, heading: '### **Exercise 5: Circular References**', lang: 'javascript' },
  lessonSha256: 'b2a28a12b67fa5704e22a65c102eb56bf5e93e08e7018ed99d5565f8c8df75fe',
} as const
const EX2 = {
  block: { path: MM, heading: '### **Exercise 2: Using WeakMap**', lang: 'javascript', nth: 2 },
  lessonSha256: 'b7e5c45be013ef72a177af5968062f490ea47905c6a124d01b969aa44b6a5d84',
} as const
const DOM1 = { block: { path: ML, lesson: '/memory-leaks', problem: 'detached-dom-trees', lang: 'javascript' }, lessonSha256: 'e30a71fb055a8eed79efb9503aa881fd550d5101dd03e2291e0a40a99e66ac07' } as const
const DOM2 = { block: { path: ML, lesson: '/memory-leaks', problem: 'detached-dom-trees', lang: 'javascript', nth: 2 }, lessonSha256: '3f2265e7039467fa56d0a2dfb7043450e63d1fdd367253ef4620dd57ef430b55' } as const
const CLOSURE = {
  block: { path: ML, lesson: '/memory-leaks', problem: 'closures-and-the-captured-too-much-pattern', lang: 'javascript' },
  lessonSha256: 'c16951e3e36d57ed82f1a25e1ed171388d917facb78647ad84c6cabe5936d2cb',
} as const

/** Exercise 5 as written, after link(): registry holds node2. */
export const cycleHeld: ReachProgram = {
  id: 'cycle-held',
  env: 'node',
  source: [EX5],
  snapshots: [{ id: 'held', after: 18, roots: [['registry', 'registry']] }],
  harness: 'none',
}

/** Exercise 5, then the long-lived reference dropped (its Solution's second option). */
export const cycleCleared: ReachProgram = {
  id: 'cycle-cleared',
  env: 'node',
  source: [EX5, { code: 'registry.length = 0' }],
  snapshots: [
    { id: 'held', after: 18, roots: [['registry', 'registry']] },
    { id: 'cleared', after: 19, roots: [['registry', 'registry']] },
  ],
  harness: 'one added line, registry.length = 0',
}

/** Exercise 2's answer with its usage in a block, so user and data go out of scope while userCache stays. */
export const weakKeyDropped: ReachProgram = {
  id: 'weak-key-dropped',
  env: 'node',
  source: [{ ...EX2, lines: [1, 10] }, { code: '{' }, { ...EX2, lines: [13, 14] }, { code: '}' }],
  snapshots: [
    { id: 'inside', after: 13, roots: [['userCache', 'userCache'], ['user', 'user'], ['data', 'data']], weak: [['userCache', 'user']] },
    { id: 'after', after: 14, roots: [['userCache', 'userCache']] },
  ],
  harness: 'the usage lines wrapped in a block { … }',
}

/** The detached-DOM answer's first block, set up and torn down: removed from the document, kept by the cache. */
export const domCache: ReachProgram = {
  id: 'dom-cache',
  env: 'chromium',
  source: [DOM1, { code: 'setup()' }, { code: 'teardown()' }],
  snapshots: [{ id: 'removed', after: 17, roots: [['cache', 'cache'], ['document', 'document.body']] }],
  harness: 'calls setup() and teardown()',
}

/** The WeakMap fix without its keys.delete line: the keys Map still holds the key. */
export const domWeakHeld: ReachProgram = {
  id: 'dom-weak-held',
  env: 'chromium',
  source: [{ ...DOM2, lines: [1, 13] }, { ...DOM2, lines: [15, 16] }, { code: 'setup()' }, { code: 'teardown()' }],
  snapshots: [
    {
      id: 'removed',
      after: 13,
      roots: [['cache', 'cache'], ['keys', 'keys']],
      weak: [['cache', "keys.get('panel')"]],
    },
  ],
  harness: 'the fix with its keys.delete line left out, then setup() and teardown()',
}

/** The WeakMap fix as written: keys.delete drops the key's last strong reference. */
export const domWeakFreed: ReachProgram = {
  id: 'dom-weak-freed',
  env: 'chromium',
  source: [DOM2, { code: 'setup()' }, { code: 'teardown()' }],
  snapshots: [
    { id: 'removed', after: 13, roots: [['cache', 'cache'], ['keys', 'keys']], weak: [['cache', "keys.get('panel')"]] },
    { id: 'freed', after: 14, roots: [['cache', 'cache'], ['keys', 'keys']] },
  ],
  harness: 'calls setup() and teardown()',
}

/** Stubs for the functions the closures answer calls but does not define (harness, not solution code). */
const STUBS = [
  { code: 'function loadAllUsers() { return new Array(1e6).fill(0) }' },
  { code: 'function indexUsers(users) { return users.length }' },
  { code: 'function applyTheme(theme) {}' },
] as const
const ATTACH = [{ code: "const node = document.body.appendChild(document.createElement('button'))" }, { code: 'attachHandler(node)' }] as const

/** The captured-too-much answer as written: the timer callback reads huge, the click handler reads config. */
export const closureShared: ReachProgram = {
  id: 'closure-shared',
  env: 'chromium',
  settleMs: 50,
  source: [...STUBS, CLOSURE, ...ATTACH],
  snapshots: [{ id: 'scope', after: 7, roots: [['huge', 'huge'], ['config', 'config']] }],
  harness: 'stubs for loadAllUsers, indexUsers and applyTheme, a button, and attachHandler(node)',
}

/** The same without its setTimeout line (the answer's own counterfactual): no closure reads huge. */
export const closureNoTimer: ReachProgram = {
  id: 'closure-no-timer',
  env: 'chromium',
  settleMs: 50,
  source: [...STUBS, { ...CLOSURE, lines: [1, 4] }, { ...CLOSURE, lines: [6, 11] }, ...ATTACH],
  snapshots: [{ id: 'scope', after: 7, roots: [['huge', 'huge'], ['config', 'config']] }],
  harness: 'the answer with its setTimeout line left out, the same stubs, button and call',
}

export const MEMORY_MANAGEMENT_PROGRAMS = [cycleHeld, cycleCleared, weakKeyDropped]
export const MEMORY_LEAKS_PROGRAMS = [domCache, domWeakHeld, domWeakFreed, closureShared, closureNoTimer]
