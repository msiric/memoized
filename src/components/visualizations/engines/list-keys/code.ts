import type { CodeToken, StepLine } from '../../step-log/types'
import tokens from './code-tokens.json'
import { KEY_EXPR, type KeyStrategy, type WrapperAction } from './model'

/**
 * The code strip (spec §8.3): the lesson's TodoList, whose `key={…}` line is
 * the `now` line and follows the selected strategy, and the wrapper change.
 * Every line fits 29 columns, so the strip is 280 px wide beside the stage.
 * Syntax tokens are pre-computed (`code-tokens.test.ts` in this folder keeps
 * them in step); no highlighter ships to the browser.
 */

export type CodeVariant =
  | `list/${KeyStrategy}`
  | `wrapper/${WrapperAction | 'none'}`

export const CODE: Record<
  CodeVariant,
  { lines: readonly string[]; line?: StepLine }
> = {
  'list/index': { lines: listCode('index'), line: 2 },
  'list/id': { lines: listCode('id'), line: 2 },
  'list/random': { lines: listCode('random'), line: 2 },
  'wrapper/none': {
    lines: ['// before', '<div><Counter /></div>', '// after: pick a change'],
  },
  'wrapper/type': {
    lines: [
      '// before',
      '<div><Counter /></div>',
      '// after',
      '<span><Counter /></span>',
    ],
    line: 4,
  },
  'wrapper/class': {
    lines: [
      '// before',
      '<div><Counter /></div>',
      '// after',
      '<div className="on">',
      '  <Counter /></div>',
    ],
    line: [4, 5],
  },
}

function listCode(k: KeyStrategy): string[] {
  return [
    'todos.map((todo, i) =>',
    `  <li key={${KEY_EXPR[k]}}>`,
    '    <input type="checkbox" />',
    '    {todo.text}',
    '  </li>)',
  ]
}

export const CODE_ROWS = 5
export const CODE_COLS = Math.max(
  ...Object.values(CODE).flatMap((c) => c.lines.map((l) => l.length)),
)

export const CODE_TOKENS = tokens as Record<CodeVariant, CodeToken[][]>
