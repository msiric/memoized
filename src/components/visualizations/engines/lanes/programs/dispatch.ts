import type { BlockRef } from '../../../step-log/lesson-source'

/**
 * Event Handling (js-track/advanced-concepts/event-handling, PREMIUM): the
 * practice answer on the three propagation phases, its markup (#outer >
 * #middle > button#inner) and its five listeners, by locator and sha256,
 * dispatched in real Chromium (`../truth/record.ts`). Three scenarios: the
 * answer as written; with one more listener on the target that calls
 * `stopPropagation()`; with one more capturing listener on #outer that calls
 * it. The extra listeners are harness lines, registered after the answer's,
 * so each runs right after the answer's own listener on that element and
 * phase.
 */

const ANSWERS = 'content/js-track/advanced-concepts/_lessons.json'
const PROBLEM = { path: ANSWERS, lesson: '/event-handling', problem: 'event-bubbling-vs-capturing-the-three-propagation-phases' } as const

export const DISPATCH_HTML = { block: { ...PROBLEM, lang: 'html' } as BlockRef, lessonSha256: 'e9e9919138f28ff5e0082d2bfbf8c4fbe3a26f9638279a13556ce8d63f047a51' } as const
export const DISPATCH_JS = { block: { ...PROBLEM, lang: 'javascript' } as BlockRef, lessonSha256: 'b9223fbbf8f69304d7719e01f6f901b4e4173e4c3c2394132025ad66c108d052' } as const

export type DispatchScenario = { id: 'default' | 'stop-at-target' | 'stop-in-capture'; extra?: string }

export const DISPATCH_SCENARIOS: readonly DispatchScenario[] = [
  { id: 'default' },
  { id: 'stop-at-target', extra: "document.getElementById('inner').addEventListener('click', (e) => e.stopPropagation())" },
  { id: 'stop-in-capture', extra: "document.getElementById('outer').addEventListener('click', (e) => e.stopPropagation(), true)" },
]

/** Per scenario: what the listeners logged, each listener call as [element, eventPhase], and the event's path (target first). */
export type DispatchRun = { logs: string[]; calls: [element: string, phase: number][]; path: string[] }

export type DispatchRecording = { generator: string; sha256: string; browser: string; scenarios: Record<string, DispatchRun> }
