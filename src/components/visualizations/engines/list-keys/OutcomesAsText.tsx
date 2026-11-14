import { cn } from '../../primitives/cn'
import { disclosureBodyCls } from '../../primitives/Disclosure'
import { provenanceText } from '../../primitives/Provenance'
import { ink } from '../../primitives/tokens-v3'
import {
  LIST_RULE,
  WRAPPER_RULE,
  keyPhrase,
  listOutcomeSentence,
} from './content'
import {
  ACTION_LABEL,
  AFTER,
  DEFAULT_CHECKS,
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  destinationOf,
  type KeyStrategy,
  type ListAction,
} from './model'
import { LIST_OUTCOMES, RECORDED_WITH } from './outcomes'

/**
 * The explorable's full text alternative (spec §5.3, A10, R9): every
 * combination it can show, with React's recorded outcome and the rule. Pure
 * markup: server-rendered, readable without JavaScript and in print.
 */

const KEY_RULE: Record<KeyStrategy, `${KeyStrategy}/${ListAction}`> = {
  index: 'index/insert-top',
  id: 'id/insert-top',
  random: 'random/insert-top',
}

export function checkLandsOn(key: KeyStrategy, action: ListAction): string {
  const outcome = LIST_OUTCOMES[`${key}/${action}`]
  const at = destinationOf(outcome, 0)
  if (at === null) return 'lost (Buy milk remounts unchecked)'
  const item = AFTER[action][at]
  return item === 'milk'
    ? 'stays on Buy milk'
    : `moves to ${ITEMS[item].text} (wrong item)`
}

/** Runtimes the outcomes were recorded in, for the shared provenance line. */
export const RECORDED_RUNTIMES = RECORDED_WITH.react.map((v, i) => (i === 0 ? `React ${v}` : v))
export const RECORDED_LINE = provenanceText(RECORDED_RUNTIMES)

/**
 * `print`: paper has no footer, so the recorded-runs line names the
 * runtimes; on screen the provenance line beside the summary already does,
 * so only what is new is said (drift N15).
 */
export function OutcomesAsText({ print = false }: { print?: boolean }) {
  return (
    <div className={disclosureBodyCls}>
      <p className="m-0">
        Start: Buy milk is checked and Walk dog is not, rendered by the TodoList
        code above. Each row’s checkbox is DOM state held by that row’s
        instance. Where Buy milk’s check goes after each action:
      </p>
      <ul className="m-0 mt-2 list-none space-y-3 p-0">
        {KEY_STRATEGIES.map((key) => (
          <li key={key} className="m-0 p-0">
            <p className={cn('m-0 font-mono text-xs font-semibold', ink.base)}>
              {keyPhrase(key)}
            </p>
            <ul className="m-0 list-disc pl-5">
              {LIST_ACTIONS.map((action) => (
                <li key={action} className="m-0">
                  {`${ACTION_LABEL[action]}: ${checkLandsOn(key, action)}. `}
                  <span className={ink.muted}>
                    {listOutcomeSentence(
                      action,
                      LIST_OUTCOMES[`${key}/${action}`],
                      DEFAULT_CHECKS,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <p className="m-0 mt-1">{LIST_RULE[KEY_RULE[key]]}</p>
          </li>
        ))}
        <li className="m-0 p-0">
          <p className={cn('m-0 font-mono text-xs font-semibold', ink.base)}>
            {'<div><Counter /></div>, count 7'}
          </p>
          <ul className="m-0 list-disc pl-5">
            <li className="m-0">{`Change to <span>: Counter remounts and shows count 0. ${WRAPPER_RULE.type}`}</li>
            <li className="m-0">{`Change only className: Counter keeps count 7. ${WRAPPER_RULE.class}`}</li>
          </ul>
        </li>
      </ul>
      <p className={cn('m-0 mt-3 text-xs', ink.muted)}>
        {`${print ? `${RECORDED_LINE} (react-dom with jsdom)` : 'Recorded with react-dom and jsdom'}, for every starting set of checks, with the state held both in the DOM and in useState.`}
      </p>
    </div>
  )
}
