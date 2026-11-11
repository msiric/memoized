import { describe, expect, it } from 'vitest'
import { validateStepLog } from './validate'
import type { StateIntrospection, StepLog } from './types'

type S = { items: string[]; out: string[] }
const introspect: StateIntrospection<S> = {
  ids: (s) => new Set(['list', ...s.items, ...s.out.map((_, k) => `out-${k}`)]),
  observedLog: (s) => s.out,
}

function base(): StepLog<S> {
  return {
    id: 'test/base',
    schema: 1,
    source: { snippet: "console.log('x')", runtime: 'node@24.x', generator: 'node-console-trace@1', sha256: 'n/a' },
    code: { lang: 'js', lines: ["console.log('x')"] },
    steps: [
      {
        state: { items: [], out: [] },
        event: 'start',
        why: 'Nothing runs until you step, so predict first.',
        narration: 'Start.',
        focus: [],
        claim: 'modelled',
      },
      {
        state: { items: ['a'], out: [] },
        event: 'add a',
        why: 'It is added because the call ran.',
        narration: 'a is added.',
        line: 1,
        focus: ['a'],
        claim: 'modelled',
      },
      {
        state: { items: ['a'], out: ['x'] },
        event: 'log x',
        why: 'The log runs only after a is added.',
        narration: 'x is logged.',
        line: 1,
        focus: ['out-0'],
        claim: 'observed',
        observes: [0],
      },
    ],
    checkpoints: [
      {
        beforeStep: 2,
        prompt: 'What logs?',
        choices: [
          { id: 'x', label: 'x', value: 'x' },
          { id: 'y', label: 'y', value: 'y' },
        ],
        answer: 'x',
        feedback: { correct: 'x logs.', byChoice: { y: 'y is never logged.' } },
      },
    ],
    observed: { log: ['x'] },
  }
}

describe('validateStepLog', () => {
  it('accepts a well-formed log', () => {
    expect(validateStepLog(base(), introspect)).toEqual([])
  })

  const cases: [string, (l: StepLog<S>) => StepLog<S>, RegExp][] = [
    [
      'an event over 40 characters',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, event: 'x'.repeat(41) } : s)) }),
      /event is 41 chars/,
    ],
    [
      'a why over 140 characters',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, why: 'because '.repeat(20) } : s)) }),
      /why is \d+ chars/,
    ],
    [
      'a why with no rule or cause',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, why: 'A is added.' } : s)) }),
      /states no rule/,
    ],
    [
      'focus on Start',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 0 ? { ...s, focus: ['list'] } : s)) }),
      /Start has no focus/,
    ],
    [
      'three focused elements',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, focus: ['a', 'list', 'list'] } : s)) }),
      /1 or 2 elements/,
    ],
    [
      'focus on a missing element',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, focus: ['ghost'] } : s)) }),
      /"ghost" does not exist/,
    ],
    [
      'a line outside the code',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 1 ? { ...s, line: 9 } : s)) }),
      /line 9 is outside/,
    ],
    [
      'an observed step without a trace reference',
      (l) => ({ ...l, steps: l.steps.map((s, i) => (i === 2 ? { ...s, observes: undefined } : s)) }),
      /must reference the trace/,
    ],
    ['a code line over 40 columns', (l) => ({ ...l, code: { lang: 'js', lines: ['x'.repeat(41)] } }), /41 columns/],
    ['no checkpoint', (l) => ({ ...l, checkpoints: [] }), /at least one prediction/],
    [
      'a wrong choice without feedback',
      (l) => ({ ...l, checkpoints: [{ ...l.checkpoints[0], feedback: { correct: 'x', byChoice: {} } }] }),
      /no feedback for wrong choice "y"/,
    ],
    [
      'an answer that is not a choice',
      (l) => ({ ...l, checkpoints: [{ ...l.checkpoints[0], answer: 'z' }] }),
      /answer "z" is not a choice/,
    ],
  ]
  it.each(cases)('rejects %s', (_name, mutate, message) => {
    expect(validateStepLog(mutate(base()), introspect).join('\n')).toMatch(message)
  })
})
