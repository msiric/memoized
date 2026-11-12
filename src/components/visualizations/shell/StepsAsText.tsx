import { cn } from '../primitives/cn'
import { disclosureBodyCls } from '../primitives/Disclosure'
import { ink } from '../primitives/tokens-v3'
import type { StepLog } from '../step-log/types'

/**
 * The full text alternative (spec §5.3, A10): every step in order, each
 * checkpoint with its answer, and the verified final output. Pure markup, so
 * it is server-rendered and works without JavaScript and in print.
 */

export type TextAlternative = {
  items: { kind: 'step' | 'checkpoint'; label: string; text: string }[]
  output?: string
}

export function textAlternative<S>(log: StepLog<S>): TextAlternative {
  const items: TextAlternative['items'] = []
  log.steps.forEach((step, i) => {
    const cp = log.checkpoints.find((c) => c.beforeStep === i)
    if (cp) {
      const answer = cp.choices.find((c) => c.id === cp.answer)
      items.push({
        kind: 'checkpoint',
        label: 'Checkpoint',
        text: `${cp.prompt} Choices: ${cp.choices.map((c) => c.label).join('; ')}. Answer: ${answer?.label}. ${cp.feedback.correct}`,
      })
    }
    items.push({
      kind: 'step',
      label: i === 0 ? 'Start' : `Step ${i}, ${step.event}`,
      text: `${step.narration} ${step.why}`,
    })
  })
  const output = log.observed.log?.length ? log.observed.log.join(', ') : undefined
  return { items, output }
}

export function runtimeName(runtime: string): string {
  const [name, version] = runtime.split('@')
  const pretty = name === 'node' ? 'Node' : name
  return version ? `${pretty} ${version}` : pretty
}

export function StepsAsText<S>({ log }: { log: StepLog<S> }) {
  const alt = textAlternative(log)
  return (
    <div className={disclosureBodyCls}>
      <ol className="m-0 list-none space-y-2 p-0">
        {alt.items.map((item, k) => (
          <li key={k} className="m-0 p-0">
            <span className={cn('font-semibold', ink.base)}>{`${item.label}.`}</span> {item.text}
          </li>
        ))}
      </ol>
      {alt.output ? (
        <p className="m-0 mt-3">
          <span className={cn('font-semibold', ink.base)}>{`Verified output (${runtimeName(log.source.runtime)}):`}</span>{' '}
          <span className="font-mono text-xs">{alt.output}</span>
        </p>
      ) : null}
    </div>
  )
}
