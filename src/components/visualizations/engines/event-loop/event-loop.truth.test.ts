// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { validateStepLog } from '../../step-log/validate'
import { recordNodeTrace, sha256, verifyStepLogTruth } from '../../step-log/truth'
import { eventLoopDescriptor } from './descriptor'
import { eventLoopIntrospection } from './model'

/**
 * Truthful by construction (spec P6): every committed event-loop log is
 * re-executed in a real Node process and must match exactly. Run on Node 24
 * (package.json engines), the runtime each log declares.
 */
describe.each(eventLoopDescriptor.presets.map((p) => [p.id, p.log] as const))('event-loop/%s', (_id, log) => {
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
})

describe('the truth harness catches a lying log', () => {
  const log = eventLoopDescriptor.presets[0].log

  it('fails when the committed output differs from the real run', () => {
    const tampered = { ...log, observed: { log: ['A', 'D', 'B', 'C'] } }
    expect(verifyStepLogTruth(tampered).errors.join('\n')).toMatch(/differs from a real run/)
  })

  it('fails when the snippet changes without re-recording', () => {
    const edited = { ...log, source: { ...log.source, snippet: log.source.snippet.replace("'D'", "'E'") } }
    expect(verifyStepLogTruth(edited).errors.join('\n')).toMatch(/snippet changed/)
  })

  it('fails when a step claims output the trace does not contain', () => {
    const steps = log.steps.map((s, i) => (i === 4 ? { ...s, state: { ...s.state, console: ['A', 'C'] } } : s))
    expect(validateStepLog({ ...log, steps }, eventLoopIntrospection).join('\n')).toMatch(/trace so far is \[A, D\]/)
  })

  it('fails when a checkpoint answer is not what the reveal observes', () => {
    const cp = { ...log.checkpoints[0], answer: 'b' }
    expect(validateStepLog({ ...log, checkpoints: [cp] }, eventLoopIntrospection).join('\n')).toMatch(
      /answer "B" is not what the reveal step observes/,
    )
  })

  it('records with a clean environment and real timers', () => {
    expect(recordNodeTrace('setTimeout(() => console.log(2)); console.log(1)').log).toEqual(['1', '2'])
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})
