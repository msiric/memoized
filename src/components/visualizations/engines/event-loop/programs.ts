import type { ProgramSource } from '../../step-log/lesson-source'

/**
 * Context and Call Stack (js-track/core-fundamentals/context-and-call-stack,
 * FREE lesson; its practice questions are premium text): the programs the
 * two trace presets run. `who-called-inner` is the async-call-stack
 * question's snippet, by locator and sha256 (never its text); the await
 * contrast is the visual's own code, committed.
 */

export type TraceProgram = { id: string; source: ProgramSource } | { id: string; snippet: string }

const ANSWERS = 'content/js-track/core-fundamentals/_lessons.json'

export const whoCalledInnerProgram: TraceProgram = {
  id: 'who-called-inner',
  source: [
    {
      block: { path: ANSWERS, lesson: '/context-and-call-stack', problem: 'async-call-stack', lang: 'javascript', field: 'question' },
      lessonSha256: '3511a3f32e799ba88095a22d1b958a9f3b54463386be6496a90da7cf593583b8',
    },
  ],
}

/** The register's contrast: async o1 awaits o2, which traces after its own await. */
export const AWAIT_SNIPPET = [
  'async function o2() {',
  '  await null',
  '  console.trace()',
  '}',
  'async function o1() {',
  '  await o2()',
  '}',
  'o1()',
].join('\n')

export const awaitAsyncFramesProgram: TraceProgram = { id: 'await-async-frames', snippet: AWAIT_SNIPPET }

export const TRACE_PROGRAMS: TraceProgram[] = [whoCalledInnerProgram, awaitAsyncFramesProgram]
