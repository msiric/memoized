import codeTokens from '../../code-tokens.json'
import type { EngineCore, StepThroughDescriptor } from '../../shell/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { linkedListMetrics } from './layout'
import { describeLinkedList, linkedListIntrospection, type LLState } from './model'
import { palindromeEvenLog, palindromeFalseLog, palindromeOddLog } from './presets/palindrome'
import { reverseBetweenLog } from './presets/reverse-between'

/**
 * The pointer-rewiring step-through without its renderer: pure data and
 * functions, so the registry, the manifest route and the tests use it
 * without React. One id for the shared visual (R4 shared visual 3), one
 * lesson group per lesson (`Preset.group`).
 */

export const linkedListEngineCore: EngineCore<LLState> = {
  id: 'linked-list',
  describe: describeLinkedList,
  layout: (logs, all) => linkedListMetrics(logs, all).layout,
  introspect: linkedListIntrospection,
}

export const linkedListDescriptor: StepThroughDescriptor<LLState> = {
  id: 'linked-list-pointer-rewiring',
  form: 'step',
  title: 'Linked list: pointer rewiring',
  engine: linkedListEngineCore,
  presets: [
    // Linked List Reversal: one preset, no switcher.
    {
      id: 'reverse-between-m2-n4',
      label: 'Reverse 2 to 4',
      group: 'linked-list-reversal',
      log: withCodeTokens(reverseBetweenLog, codeTokens),
    },
    // Linked Lists, palindrome-linked-list: three inputs.
    {
      id: 'palindrome-split-reverse-compare',
      label: '1,2,3,2,1',
      group: 'linked-lists',
      log: withCodeTokens(palindromeOddLog, codeTokens),
    },
    { id: 'palindrome-1221', label: '1,2,2,1', group: 'linked-lists', log: withCodeTokens(palindromeEvenLog, codeTokens) },
    { id: 'palindrome-1231', label: '1,2,3,1', group: 'linked-lists', log: withCodeTokens(palindromeFalseLog, codeTokens) },
  ],
  defaultPreset: 'reverse-between-m2-n4',
  since: '2026-11',
}
