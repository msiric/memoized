import type { ProgramSource } from '../../../step-log/lesson-source'

/**
 * Performance Optimization (js-track/advanced-concepts/performance-
 * optimization, PREMIUM): the lesson's trailing `debounce` and leading-only
 * `throttle` blocks as written, by locator and sha256, then a harness (no
 * lesson code) that runs each with a 100 ms wait on a controlled clock, the
 * practice question's burst: calls a to e at 0, 10, 20, 30 and 40, and f at
 * 150, then time runs to 260. The clock replaces `setTimeout` and
 * `clearTimeout` and logs every schedule, clear, timer callback, call and
 * invocation, so the figure's marks are the run's own events.
 */

const PAGE = 'content/js-track/advanced-concepts/performance-optimization/page.mdx'

export const BURST = [
  [0, 'a'],
  [10, 'b'],
  [20, 'c'],
  [30, 'd'],
  [40, 'e'],
  [150, 'f'],
] as const
export const WAIT = 100
export const END = 260

const HARNESS = `
function __run(make) {
  const timers = new Map()
  const events = []
  let clock = 0
  let nextId = 0
  globalThis.setTimeout = function (fn, ms) {
    nextId += 1
    timers.set(nextId, { fn, at: clock + ms })
    events.push(['schedule', clock, nextId, clock + ms])
    return nextId
  }
  globalThis.clearTimeout = function (id) {
    if (timers.delete(id)) events.push(['clear', clock, id])
  }
  const runUntil = (to) => {
    for (;;) {
      let pick = null
      for (const [id, t] of timers) if (t.at <= to && (!pick || t.at < pick[1].at || (t.at === pick[1].at && id < pick[0]))) pick = [id, t]
      if (!pick) break
      clock = pick[1].at
      timers.delete(pick[0])
      events.push(['fire', clock, pick[0]])
      pick[1].fn()
    }
    clock = to
  }
  const wrapped = make((arg) => events.push(['invoke', clock, arg]), ${WAIT})
  for (const [t, arg] of ${JSON.stringify(BURST)}) {
    runUntil(t)
    events.push(['call', clock, arg])
    wrapped(arg)
  }
  runUntil(${END})
  return events
}
console.log(JSON.stringify({ debounce: __run(debounce), throttle: __run(throttle) }))`

export const timersSource: ProgramSource = [
  { block: { path: PAGE, heading: '### **Implementing Debounce**', lang: 'javascript' }, lessonSha256: '77f3dd685cfb23570655dea8e2c4390d80aa9c337689e8f3b409b8797bdb0594' },
  { block: { path: PAGE, heading: '### **Implementing Throttle**', lang: 'javascript' }, lessonSha256: 'c4a55720718e7696a5f480bbd647bf4bbeef19a6f67ba392ff2a4236f89c0719' },
  { code: HARNESS },
]

export type TimerEvent =
  | readonly ['schedule', number, number, number]
  | readonly ['clear', number, number]
  | readonly ['fire', number, number]
  | readonly ['call', number, string]
  | readonly ['invoke', number, string]

export type TimersRecording = { generator: string; sha256: string; runtime?: string; debounce: TimerEvent[]; throttle: TimerEvent[] }
