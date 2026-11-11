import type { StateIntrospection, StepLog } from './types'

/**
 * Authoring lint and structural invariants for a step-log (spec §5.3, §5.4,
 * §6.2, §7 "Authoring lint"). Pure: no runtime access. The runtime half of
 * the truth check lives in `truth.ts`.
 */

export const LIMITS = {
  event: 40,
  why: 140,
  prompt: 80,
  narration: 200,
  codeColumns: 40,
  presetLabel: 18,
  minChoices: 2,
  maxChoices: 4,
} as const

/**
 * A why-caption states a rule or a cause. Lint requires a causal word, a
 * contrast, or an ordering rule (spec §5.3).
 */
const WHY_RULE =
  /\b(because|so|until|only|after|before|once|unless|therefore|which means|not|never|even|still|but|first|then|instead)\b|n't\b/i

function lineInRange(line: number, total: number) {
  return Number.isInteger(line) && line >= 1 && line <= total
}

export function validateStepLog<S>(log: StepLog<S>, introspect: StateIntrospection<S>): string[] {
  const errors: string[] = []
  const err = (where: string, msg: string) => errors.push(`${log.id} ${where}: ${msg}`)
  const { steps, checkpoints } = log
  const codeLines = log.code?.lines.length ?? 0

  if (log.schema !== 1) err('schema', `unsupported schema ${String(log.schema)}`)
  if (steps.length < 2) err('steps', 'needs Start plus at least one step')

  log.code?.lines.forEach((l, i) => {
    if ([...l].length > LIMITS.codeColumns)
      err(`code line ${i + 1}`, `${[...l].length} columns > ${LIMITS.codeColumns}`)
  })
  if (log.code?.tokens) {
    if (log.code.tokens.length !== codeLines) err('code tokens', 'one token array per line required')
    log.code.tokens.forEach((t, i) => {
      if (t.map((x) => x.text).join('') !== log.code!.lines[i])
        err(`code tokens ${i + 1}`, 'tokens do not spell the line')
    })
  }

  steps.forEach((step, i) => {
    const at = i === 0 ? 'Start' : `step ${i}`
    if (step.event.length > LIMITS.event) err(at, `event is ${step.event.length} chars > ${LIMITS.event}`)
    if (step.why.length > LIMITS.why) err(at, `why is ${step.why.length} chars > ${LIMITS.why}`)
    if (step.narration.length > LIMITS.narration)
      err(at, `narration is ${step.narration.length} chars > ${LIMITS.narration}`)
    if (!step.why.trim()) err(at, 'why is empty')
    if (step.why.trim().toLowerCase() === step.event.trim().toLowerCase()) err(at, 'why restates the event')
    if (!WHY_RULE.test(step.why)) err(at, `why states no rule or cause: "${step.why}"`)

    if (i === 0) {
      if (step.focus.length !== 0) err(at, 'Start has no focus')
      if (step.line !== undefined) err(at, 'Start has no line')
    } else if (step.focus.length < 1 || step.focus.length > 2) {
      err(at, `focus must name 1 or 2 elements, got ${step.focus.length}`)
    }

    const ids = introspect.ids(step.state)
    for (const f of step.focus) if (!ids.has(f)) err(at, `focus "${f}" does not exist in the state`)

    if (typeof step.line === 'number' && !lineInRange(step.line, codeLines))
      err(at, `line ${step.line} is outside the code`)
    if (Array.isArray(step.line)) {
      const [a, b] = step.line as readonly [number, number]
      if (!lineInRange(a, codeLines) || !lineInRange(b, codeLines) || a > b) err(at, `line range ${a}-${b} is invalid`)
    }

    if (step.claim === 'observed' && (!step.observes || step.observes.length === 0)) {
      err(at, 'an observed step must reference the trace entries it depicts')
    }
    if (step.claim === 'modelled' && step.observes && step.observes.length > 0) {
      err(at, 'a modelled step cannot reference trace entries; mark it observed')
    }
  })

  // Trace coverage: every observed entry is depicted exactly once, in order,
  // and the state's visible log is always the trace prefix seen so far.
  const trace = log.observed.log
  if (trace) {
    const seen: number[] = []
    steps.forEach((step) => step.observes?.forEach((k) => seen.push(k)))
    const expected = trace.map((_, k) => k)
    if (JSON.stringify(seen) !== JSON.stringify(expected)) {
      err(
        'trace',
        `steps observe entries [${seen.join(', ')}], expected each of [${expected.join(', ')}] once, in order`,
      )
    }
    if (introspect.observedLog) {
      let shown = 0
      steps.forEach((step, i) => {
        shown += step.observes?.length ?? 0
        const visible = introspect.observedLog!(step.state)
        const prefix = trace.slice(0, shown)
        if (JSON.stringify(visible) !== JSON.stringify(prefix)) {
          err(
            i === 0 ? 'Start' : `step ${i}`,
            `state shows [${visible.join(', ')}] but the trace so far is [${prefix.join(', ')}]`,
          )
        }
      })
    }
  }

  // Checkpoints (spec §5.4, P5: at least one prediction per step-through).
  if (checkpoints.length < 1) err('checkpoints', 'a step-through needs at least one prediction checkpoint')
  const placed = new Set<number>()
  checkpoints.forEach((cp, c) => {
    const at = `checkpoint ${c + 1}`
    if (cp.beforeStep < 1 || cp.beforeStep >= steps.length)
      err(at, `beforeStep ${cp.beforeStep} is outside 1..${steps.length - 1}`)
    if (placed.has(cp.beforeStep)) err(at, 'two checkpoints before the same step')
    placed.add(cp.beforeStep)
    if (cp.prompt.length > LIMITS.prompt) err(at, `prompt is ${cp.prompt.length} chars > ${LIMITS.prompt}`)
    if (cp.choices.length < LIMITS.minChoices || cp.choices.length > LIMITS.maxChoices) {
      err(at, `needs ${LIMITS.minChoices} to ${LIMITS.maxChoices} choices`)
    }
    const ids = cp.choices.map((ch) => ch.id)
    if (new Set(ids).size !== ids.length) err(at, 'duplicate choice ids')
    if (!ids.includes(cp.answer)) err(at, `answer "${cp.answer}" is not a choice`)
    for (const id of ids) {
      if (id !== cp.answer && !cp.feedback.byChoice[id]) err(at, `no feedback for wrong choice "${id}"`)
    }
    for (const key of Object.keys(cp.feedback.byChoice))
      if (!ids.includes(key)) err(at, `feedback for unknown choice "${key}"`)

    // The answer must equal what the reveal step observes.
    const answer = cp.choices.find((ch) => ch.id === cp.answer)
    const reveal = steps[cp.beforeStep]
    if (answer?.value !== undefined && reveal && trace) {
      const observedAtReveal = (reveal.observes ?? []).map((k) => trace[k])
      if (!observedAtReveal.includes(answer.value)) {
        err(at, `answer "${answer.value}" is not what the reveal step observes ([${observedAtReveal.join(', ')}])`)
      }
    }
    if (answer?.value === undefined && reveal?.claim === 'observed') {
      err(at, 'the reveal step is observed, so the answer choice must carry the observed value')
    }
  })

  return errors
}
