// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import {
  recordNodeTrace,
  sha256,
  verifyStepLogTruth,
} from '../../step-log/truth'
import { eventLoopDescriptor } from './descriptor'
import { lintEventLoopLogs } from './lint'
import { eventLoopIntrospection } from './model'

/**
 * Truthful by construction (spec P6): every committed event-loop log is
 * re-executed in a real Node process and must match exactly. Run on Node 24
 * (package.json engines), the runtime each log declares.
 */
describe.each(eventLoopDescriptor.presets.map((p) => [p.id, p.log] as const))(
  'event-loop/%s',
  (_id, log) => {
    it('passes the authoring lint and engine invariants', () => {
      expect(validateStepLog(log, eventLoopIntrospection)).toEqual([])
    })

    it('matches a fresh run of its snippet in Node (hash, runtime and output)', () => {
      const { errors, recorded } = verifyStepLogTruth(log)
      expect(errors, `recorded: ${JSON.stringify(recorded)}`).toEqual([])
    })

    it('shows the reader exactly the program that was run', () => {
      expect(log.code?.lines.join('\n')).toBe(log.source.snippet)
    })
  },
)

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
      /host chip "timer 0 ms → callbackHandler" is \d+px > 122px/,
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
        snippet: log.source.snippet.replace("'D'", "'E'"),
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
    const cp = { ...log.checkpoints[0], answer: 'b' }
    expect(
      validateStepLog(
        { ...log, checkpoints: [cp] },
        eventLoopIntrospection,
      ).join('\n'),
    ).toMatch(/answer "B" is not what the reveal step observes/)
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
