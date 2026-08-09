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
  const f = (
    line: number | undefined,
    stack: string[],
    webapi: string[],
    micro: string[],
    macro: string[],
    con: string[],
    note: string,
  ): SequenceFrame => ({ stack, webapi, micro, macro, console: con, note, line })
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
