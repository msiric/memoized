// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { readBlock } from '../../step-log/lesson-block'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import {
  recordNodeTrace,
  sha256,
  verifyStepLogTruth,
} from '../../step-log/truth'
import { displayProblems, displayText } from '../../step-log/lesson-source'
import { loadProgram } from '../../step-log/lesson-block'
import { eventLoopDescriptor } from './descriptor'
import { TRACE_RECORDINGS, awaitAsyncFrames, whoCalledInner } from './presets/call-stack-traces'
import { AWAIT_SNIPPET, whoCalledInnerProgram } from './programs'
import { recordTraces, type TraceRecording } from './truth/trace'
import { lintEventLoopLogs } from './lint'
import { eventLoopIntrospection } from './model'

/**
 * Truthful by construction (spec P6): every committed event-loop log is
 * re-executed in a real Node process and must match exactly. Run on Node 24
 * (package.json engines), the runtime each log declares.
 */
/** The trace presets are verified against their own recordings below (stderr frames, a premium snippet). */
const TRACED = new Set(['who-called-inner', 'await-async-frames'])

describe.each(eventLoopDescriptor.presets.map((p) => [p.id, p.log] as const))(
  'event-loop/%s',
  (id, log) => {
    it('passes the authoring lint and engine invariants', () => {
      expect(validateStepLog(log, eventLoopIntrospection)).toEqual([])
    })

    it.skipIf(TRACED.has(id))('matches a fresh run of its snippet in Node (hash, runtime and output)', () => {
      const { errors, recorded } = verifyStepLogTruth(log)
      expect(errors, `recorded: ${JSON.stringify(recorded)}`).toEqual([])
    })

    it.skipIf(id === 'who-called-inner')('shows the reader exactly the program that was run', () => {
      expect(log.code?.lines.join('\n')).toBe(log.source.snippet)
    })
  },
)

/**
 * The Promise Patterns presets (premium lesson): the repo may hold a
 * visual's short lines only when they are a lesson example. Both programs
 * are the lesson's own examples in "When Promise Callbacks Run" (content
 * placement branch `feat/viz-placement-flagships`, 341b699), the section
 * that places the visual; with a local content checkout each snippet must
 * be that fence exactly. (They also appear, worded differently, in a
 * practice answer; the answer is never the source.)
 */
const PROMISE_PATTERNS = { path: 'content/js-track/advanced-concepts/promise-patterns/page.mdx', heading: '## **When Promise Callbacks Run**', lang: 'javascript' }
const LESSON_EXAMPLES: Record<string, { nth: number }> = { 'microtask-vs-timer-12345': { nth: 1 }, 'await-null': { nth: 2 } }
describe.each(Object.entries(LESSON_EXAMPLES))('event-loop/%s is a lesson example', (id, { nth }) => {
  const block = (() => {
    try {
      return readBlock({ ...PROMISE_PATTERNS, nth })
    } catch {
      return undefined
    }
  })()
  const why = block === null ? ' (skipped: needs the premium Promise Patterns lesson from a local content checkout, src/content)' : ''
  it.skipIf(block === null)(`is the lesson's own fence under "When Promise Callbacks Run", exactly${why}`, () => {
    expect(block, 'the lesson has no such section: these lines would be practice-answer text').toBeDefined()
    const log = eventLoopDescriptor.presets.find((p) => p.id === id)!.log
    expect(log.source.snippet).toBe(block)
  })
})

/**
 * The Event Loop lesson's Exercise 2 (a free lesson's example, already in the
 * committed lesson fixture): with a local content checkout the snippet must
 * be that fence exactly.
 */
describe('event-loop/exercise-2-async1-async2 is the lesson example', () => {
  const ref = { path: 'content/js-track/core-fundamentals/event-loop/page.mdx', heading: '### **Exercise 2: Async/Await Execution**', lang: 'javascript' }
  const block = readBlock(ref)
  it.skipIf(block === null)('is Exercise 2\'s question fence, exactly (skipped without src/content)', () => {
    const log = eventLoopDescriptor.presets.find((p) => p.id === 'exercise-2-async1-async2')!.log
    expect(log.source.snippet).toBe(block)
  })
  it('logs Async 1 End right after Script End, and Timeout last (a real run)', () => {
    const log = eventLoopDescriptor.presets.find((p) => p.id === 'exercise-2-async1-async2')!.log
    const run = recordNodeTrace(log.source.snippet!).log
    expect(run[run.indexOf('Script End') + 1]).toBe('Async 1 End')
    expect(run.at(-1)).toBe('Timeout')
    expect(run.indexOf('Async 1 End')).toBeLessThan(run.indexOf('Promise 2'))
  })
})

/**
 * Context and Call Stack: the frames console.trace() printed, from the
 * committed recording (`yarn viz:traces`). The await contrast re-records
 * everywhere; the question's snippet only with a local content checkout.
 */
describe('the trace presets match real runs', () => {
  const { runtime: _r, ...fresh } = recordTraces(AWAIT_SNIPPET)
  it('await-async-frames: a fresh run equals the committed recording and the shown code', () => {
    expect(fresh).toEqual(TRACE_RECORDINGS['await-async-frames'])
    expect(awaitAsyncFrames.source.sha256).toBe(sha256(AWAIT_SNIPPET))
    expect(awaitAsyncFrames.code!.lines.join('\n')).toBe(AWAIT_SNIPPET)
  })

  const loaded = (() => {
    try {
      return 'source' in whoCalledInnerProgram ? loadProgram(whoCalledInnerProgram.source) : null
    } catch (e) {
      return { ok: false as const, missing: (e as Error).message }
    }
  })()
  const have = loaded?.ok === true
  it.skipIf(!have)('who-called-inner: the question\'s snippet re-records the same frames; its rows spell it (skipped without src/content)', () => {
    if (!loaded?.ok) throw new Error('unreachable')
    const { runtime: _rt, ...rec } = recordTraces(loaded.text)
    expect(rec).toEqual(TRACE_RECORDINGS['who-called-inner'])
    const rows = whoCalledInner.code!.premium!.rows
    const lines = loaded.text.split('\n')
    expect(displayProblems(lines, rows, { maxCols: 40, blankRows: true })).toEqual([])
    expect(displayText(lines, rows).map((l) => [...l].length)).toEqual(whoCalledInner.code!.lines.map((l) => [...l].length))
  })

  /** The register's claims about a recording: what a figure built from it may say. */
  function claims(id: string, rec: TraceRecording): string[] {
    const errors: string[] = []
    const t = rec.traces
    if (t.length !== 1) errors.push(`${id}: ${t.length} traces, expected one`)
    const f = t[0]?.frames ?? []
    if (id === 'who-called-inner') {
      if (JSON.stringify(f) !== JSON.stringify(['Timeout.inner', 'listOnTimeout', 'process.processTimers'])) errors.push(`${id}: frames ${f.join(', ')}`)
      if (f.some((x) => /outer/.test(x))) errors.push(`${id}: outer is in the trace`)
    } else {
      if (f[0] !== 'o2' || f[1] !== 'async o1') errors.push(`${id}: frames ${f.join(', ')}`)
    }
    return errors
  }

  it('the register\'s verification holds for both recordings, and every log draws exactly the recorded frames', () => {
    for (const [id, log] of [['who-called-inner', whoCalledInner], ['await-async-frames', awaitAsyncFrames]] as const) {
      const rec = TRACE_RECORDINGS[id]
      expect(claims(id, rec)).toEqual([])
      const last = log.steps.at(-1)!.state
      expect([...last.console, ...(last.trace ?? [])]).toEqual(log.observed.log)
      expect(log.observed.log).toEqual([rec.traces[0].header, ...rec.traces[0].frames])
    }
    // The paused caller is off the stack when its async frame is printed.
    expect(awaitAsyncFrames.steps.at(-1)!.state.stack.map((c) => c.id)).toEqual(['o2'])
    expect(whoCalledInner.steps.at(-1)!.state.stack.map((c) => c.id)).toEqual(['inner'])
  })

  it('lies fail: outer in the timer trace, a lost async frame, an extra trace', () => {
    const r = TRACE_RECORDINGS['who-called-inner']
    const withOuter = { ...r, traces: [{ ...r.traces[0], frames: ['Timeout.inner', 'outer', 'listOnTimeout'] }] }
    expect(claims('who-called-inner', withOuter).join('\n')).toMatch(/outer is in the trace/)
    const a = TRACE_RECORDINGS['await-async-frames']
    expect(claims('await-async-frames', { ...a, traces: [{ ...a.traces[0], frames: ['o2'] }] }).join('\n')).toMatch(/frames o2$/)
    expect(claims('await-async-frames', { ...a, traces: [...a.traces, ...a.traces] }).join('\n')).toMatch(/2 traces/)
    const steps = whoCalledInner.steps.map((s, i) => (i === 6 ? { ...s, state: { ...s.state, trace: ['Timeout.inner', 'outer'] } } : s))
    expect(validateStepLog({ ...whoCalledInner, steps }, eventLoopIntrospection).join('\n')).toMatch(/trace so far/)
  })
})

describe('event-loop width lint (A1, A2, A7, F4, F5)', () => {
  it('every preset fits at 320: chips, outputs, queues, title and switcher', () => {
    expect(
      lintEventLoopLogs(eventLoopDescriptor.presets.map((p) => p.log)),
    ).toEqual([])
    expect(validateDescriptor(eventLoopDescriptor)).toEqual([])
  })

  it('rejects what used to render broken', () => {
    const log = eventLoopDescriptor.presets[1].log
    const chip = (id: string, label: string) => ({ id, label })
    const steps = log.steps.map((s, i) =>
      i === 2
        ? {
            ...s,
            state: {
              ...s.state,
              host: [chip('timer', 'timer 0 ms → callbackHandler')],
              micro: Array.from({ length: 9 }, (_, k) =>
                chip(`m${k}`, `m${k}`),
              ),
            },
          }
        : s,
    )
    const errors = lintEventLoopLogs([{ ...log, steps }]).join('\n')
    expect(errors).toMatch(
      /host chip "timer 0 ms → callbackHandler" is \d+px > 128px/,
    )
    expect(errors).toMatch(/micro holds 9 items/)
    expect(
      validateDescriptor({
        id: 'x',
        title: 'Title',
        presets: [
          'A label of 17 ch.',
          'Another 17 chars!',
          'A third 17 chars.',
        ].map((label, k) => ({ id: `${k}`, label })),
      }).join('\n'),
    ).toMatch(/switcher is \d+px wide > 288px/)
  })
})

describe('the truth harness catches a lying log', () => {
  const log = eventLoopDescriptor.presets[0].log

  it('fails when the committed output differs from the real run', () => {
    const tampered = { ...log, observed: { log: ['A', 'D', 'B', 'C'] } }
    expect(verifyStepLogTruth(tampered).errors.join('\n')).toMatch(
      /differs from a real run/,
    )
  })

  it('fails when the snippet changes without re-recording', () => {
    const edited = {
      ...log,
      source: {
        ...log.source,
        snippet: log.source.snippet!.replace("'D'", "'E'"),
      },
    }
    expect(verifyStepLogTruth(edited).errors.join('\n')).toMatch(
      /snippet changed/,
    )
  })

  it('fails when a step claims output the trace does not contain', () => {
    const steps = log.steps.map((s, i) =>
      i === 4 ? { ...s, state: { ...s.state, console: ['A', 'C'] } } : s,
    )
    expect(
      validateStepLog({ ...log, steps }, eventLoopIntrospection).join('\n'),
    ).toMatch(/trace so far is \[A, D\]/)
  })

  it('fails when a checkpoint answer is not what the reveal observes', () => {
    const cp = { ...log.checkpoints[1], answer: 'b' }
    expect(
      validateStepLog(
        { ...log, checkpoints: [log.checkpoints[0], cp] },
        eventLoopIntrospection,
      ).join('\n'),
    ).toMatch(/answer "B" is not what the reveal step observes/)
  })

  it('fails when a prediction judged at the end is not the last output (R7)', () => {
    const cp = { ...log.checkpoints[0], answer: 'd' }
    expect(
      validateStepLog(
        { ...log, checkpoints: [cp, log.checkpoints[1]] },
        eventLoopIntrospection,
      ).join('\n'),
    ).toMatch(/answer "D" is not the run's last output \("B"\)/)
  })

  it('records with a clean environment and real timers', () => {
    expect(
      recordNodeTrace('setTimeout(() => console.log(2)); console.log(1)').log,
    ).toEqual(['1', '2'])
    expect(sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
})
