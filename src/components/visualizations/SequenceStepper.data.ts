/**
 * Step-log data for the SequenceStepper. Kept OUT of the 'use client' component
 * module so it is server-safe: a server-rendered lesson can call it to produce
 * frames and pass them to the client renderer. This mirrors the data/rendering
 * separation in ADR-001 (data is not client-only).
 */

export type SequenceFrame = {
  stack: string[]
  webapi: string[]
  micro: string[]
  macro: string[]
  console: string[]
  note: string
  /** 0-based line to highlight in the code panel, if any. */
  line?: number
}

/**
 * Shared frame constructor for the event-loop step-logs. Positional to keep the
 * frame tables compact and readable as a grid: line, stack, webapi, micro, macro,
 * console, note.
 */
const frame = (
  line: number | undefined,
  stack: string[],
  webapi: string[],
  micro: string[],
  macro: string[],
  con: string[],
  note: string,
): SequenceFrame => ({ stack, webapi, micro, macro, console: con, note, line })

/**
 * The canonical "Example 1: setTimeout vs Promise" from the event-loop lesson.
 * Verified against real Node output: Start, End, Promise, setTimeout.
 */
export const buildEventLoopSteps = (): { code: string[]; frames: SequenceFrame[] } => {
  const code = [
    "console.log('Start')",
    '',
    'setTimeout(() => {',
    "  console.log('setTimeout')",
    '}, 0)',
    '',
    'Promise.resolve().then(() => {',
    "  console.log('Promise')",
    '})',
    '',
    "console.log('End')",
  ]
  const f = frame
  const frames = [
    f(undefined, [], [], [], [], [], 'Press Step (or Play) to run this program the way the runtime actually does.'),
    f(0, ['main()', "console.log('Start')"], [], [], [], [], "console.log('Start') is pushed onto the call stack."),
    f(0, ['main()'], [], [], [], ['Start'], "It prints 'Start' and pops. Synchronous work runs immediately."),
    f(2, ['main()', 'setTimeout(cb, 0)'], [], [], [], ['Start'], 'setTimeout is a Web API, not part of JS. It registers its callback with a timer.'),
    f(2, ['main()'], ['setTimeout cb  0ms'], [], [], ['Start'], 'setTimeout returns right away. Its callback waits in the Web API area, not run yet.'),
    f(6, ['main()', 'Promise.then(cb)'], ['setTimeout cb  0ms'], [], [], ['Start'], 'Promise.resolve().then() registers its callback.'),
    f(6, ['main()'], ['setTimeout cb  0ms'], ['Promise cb'], [], ['Start'], 'The Promise callback goes straight into the microtask queue.'),
    f(6, ['main()'], [], ['Promise cb'], ['setTimeout cb'], ['Start'], 'The 0ms timer fires. Its callback moves to the macrotask queue, still waiting.'),
    f(10, ['main()', "console.log('End')"], [], ['Promise cb'], ['setTimeout cb'], ['Start'], "console.log('End') runs synchronously."),
    f(10, ['main()'], [], ['Promise cb'], ['setTimeout cb'], ['Start', 'End'], "It prints 'End'. Both callbacks are still queued, untouched."),
    f(undefined, [], [], ['Promise cb'], ['setTimeout cb'], ['Start', 'End'], 'The script finishes and main() pops. The call stack is empty, so the event loop takes over.'),
    f(7, ['Promise cb'], [], [], ['setTimeout cb'], ['Start', 'End'], 'Event-loop rule: drain ALL microtasks first. The Promise callback runs.'),
    f(7, [], [], [], ['setTimeout cb'], ['Start', 'End', 'Promise'], "It prints 'Promise'. The microtask queue is now empty."),
    f(3, ['setTimeout cb'], [], [], [], ['Start', 'End', 'Promise'], 'Only now does the loop take ONE macrotask. The setTimeout callback runs.'),
    f(3, [], [], [], [], ['Start', 'End', 'Promise', 'setTimeout'], "It prints 'setTimeout'."),
    f(undefined, [], [], [], [], ['Start', 'End', 'Promise', 'setTimeout'], 'Done: Start, End, Promise, setTimeout. Microtasks always drain before the next macrotask.'),
  ]
  return { code, frames }
}

/**
 * "Example 2: Multiple Promises" from the event-loop lesson. Shows that the
 * microtask queue is FIFO: two .then callbacks run in the order they were queued.
 * Verified against real Node output: Start, End, Promise 1, Promise 2.
 */
export const buildMultiplePromisesSteps = (): { code: string[]; frames: SequenceFrame[] } => {
  const code = [
    "console.log('Start')",
    '',
    'Promise.resolve().then(() => {',
    "  console.log('Promise 1')",
    '})',
    '',
    'Promise.resolve().then(() => {',
    "  console.log('Promise 2')",
    '})',
    '',
    "console.log('End')",
  ]
  const f = frame
  const frames = [
    f(undefined, [], [], [], [], [], 'Two promise callbacks, no timers. Step through to see the microtask order.'),
    f(0, ['main()', "console.log('Start')"], [], [], [], [], "console.log('Start') is pushed onto the call stack."),
    f(0, ['main()'], [], [], [], ['Start'], "It prints 'Start' and pops."),
    f(2, ['main()', 'Promise.then(cb)'], [], [], [], ['Start'], 'The first Promise.resolve().then() registers its callback.'),
    f(2, ['main()'], [], ['Promise 1 cb'], [], ['Start'], 'That callback goes into the microtask queue.'),
    f(6, ['main()', 'Promise.then(cb)'], [], ['Promise 1 cb'], [], ['Start'], 'The second Promise.resolve().then() registers its callback.'),
    f(6, ['main()'], [], ['Promise 1 cb', 'Promise 2 cb'], [], ['Start'], 'It joins the microtask queue behind the first. Queues are FIFO.'),
    f(10, ['main()', "console.log('End')"], [], ['Promise 1 cb', 'Promise 2 cb'], [], ['Start'], "console.log('End') runs synchronously."),
    f(10, ['main()'], [], ['Promise 1 cb', 'Promise 2 cb'], [], ['Start', 'End'], "It prints 'End'. Both callbacks are still queued."),
    f(undefined, [], [], ['Promise 1 cb', 'Promise 2 cb'], [], ['Start', 'End'], 'main() pops. The stack is empty, so the event loop drains the microtask queue.'),
    f(3, ['Promise 1 cb'], [], ['Promise 2 cb'], [], ['Start', 'End'], 'It runs the callback that was queued first.'),
    f(3, [], [], ['Promise 2 cb'], [], ['Start', 'End', 'Promise 1'], "It prints 'Promise 1'."),
    f(7, ['Promise 2 cb'], [], [], [], ['Start', 'End', 'Promise 1'], 'The loop keeps draining microtasks: the second callback runs.'),
    f(7, [], [], [], [], ['Start', 'End', 'Promise 1', 'Promise 2'], "It prints 'Promise 2'."),
    f(undefined, [], [], [], [], ['Start', 'End', 'Promise 1', 'Promise 2'], 'Done: Start, End, Promise 1, Promise 2. Microtasks run in the order they were queued.'),
  ]
  return { code, frames }
}

/**
 * "Example 3: setTimeout with Zero Delay" from the event-loop lesson. Shows that
 * two 0ms timers still defer to macrotasks, and macrotasks run FIFO, one per loop
 * turn. Verified against real Node output: Start, End, Timeout 1, Timeout 2.
 */
export const buildZeroDelayTimeoutSteps = (): { code: string[]; frames: SequenceFrame[] } => {
  const code = [
    "console.log('Start')",
    '',
    'setTimeout(() => {',
    "  console.log('Timeout 1')",
    '}, 0)',
    '',
    'setTimeout(() => {',
    "  console.log('Timeout 2')",
    '}, 0)',
    '',
    "console.log('End')",
  ]
  const f = frame
  const frames = [
    f(undefined, [], [], [], [], [], 'Two 0ms timers. Even with no delay, their callbacks are macrotasks. Step through.'),
    f(0, ['main()', "console.log('Start')"], [], [], [], [], "console.log('Start') is pushed onto the call stack."),
    f(0, ['main()'], [], [], [], ['Start'], "It prints 'Start' and pops."),
    f(2, ['main()', 'setTimeout(cb, 0)'], [], [], [], ['Start'], 'The first setTimeout registers its callback with a timer (a Web API).'),
    f(2, ['main()'], ['Timeout 1 cb  0ms'], [], [], ['Start'], 'setTimeout returns immediately; the callback waits on its timer.'),
    f(6, ['main()', 'setTimeout(cb, 0)'], ['Timeout 1 cb  0ms'], [], [], ['Start'], 'The second setTimeout registers its callback too.'),
    f(6, ['main()'], ['Timeout 1 cb  0ms', 'Timeout 2 cb  0ms'], [], [], ['Start'], 'Both callbacks now wait on their timers.'),
    f(10, ['main()', "console.log('End')"], ['Timeout 1 cb  0ms', 'Timeout 2 cb  0ms'], [], [], ['Start'], "console.log('End') runs synchronously."),
    f(10, ['main()'], ['Timeout 1 cb  0ms', 'Timeout 2 cb  0ms'], [], [], ['Start', 'End'], "It prints 'End'."),
    f(undefined, [], [], [], ['Timeout 1 cb', 'Timeout 2 cb'], ['Start', 'End'], 'main() pops and the 0ms timers elapse, handing their callbacks to the macrotask queue in order.'),
    f(3, ['Timeout 1 cb'], [], [], ['Timeout 2 cb'], ['Start', 'End'], 'No microtasks wait, so the loop takes ONE macrotask: the first timer callback.'),
    f(3, [], [], [], ['Timeout 2 cb'], ['Start', 'End', 'Timeout 1'], "It prints 'Timeout 1'."),
    f(7, ['Timeout 2 cb'], [], [], [], ['Start', 'End', 'Timeout 1'], 'After that task finishes, the loop takes the next macrotask.'),
    f(7, [], [], [], [], ['Start', 'End', 'Timeout 1', 'Timeout 2'], "It prints 'Timeout 2'."),
    f(undefined, [], [], [], [], ['Start', 'End', 'Timeout 1', 'Timeout 2'], 'Done: Start, End, Timeout 1, Timeout 2. Macrotasks also run FIFO, one per loop turn.'),
  ]
  return { code, frames }
}
