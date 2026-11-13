import type { ExplorableDescriptor } from '../../shell/explorable'
import type { Preset } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { CODE } from './code'
import {
  LIST_RULE,
  NONE_ID,
  SETUP_HINT,
  TITLE,
  WRAPPER_RULE,
  keyPhrase,
  listAnswer,
  listChoices,
  listOutcomeSentence,
  listPrompt,
  wrapperChoices,
  wrapperOutcomeSentence,
  wrapperPrompt,
} from './content'
import { listKeysBands, listKeysFootprint, type Combo } from './layout'
import {
  ACTION_LABEL,
  BEFORE,
  BEFORE_INSTANCES,
  ITEMS,
  WRAPPER_LABEL,
  afterRows,
  keyText,
  trackedRow,
  unmountedRows,
  type Checks,
  type KeyStrategy,
  type ListAction,
  type WrapperAction,
} from './model'
import { LIST_OUTCOMES, RECORDED_WITH, WRAPPER_OUTCOMES } from './outcomes'

/**
 * The list-keys explorable without its renderer (React-free): the six
 * authored presets from the R4 register, each as a step-log built from the
 * recorded outcomes, for the registry, the manifest and the text alternative.
 */

export type PresetConfig =
  | {
      id: string
      label: string
      scene: 'list'
      key: KeyStrategy
      action: ListAction
      checks: Checks
    }
  | {
      id: string
      label: string
      scene: 'wrapper'
      action: WrapperAction
      count: number
    }

const MILK: Checks = { milk: true, dog: false }

export const PRESET_CONFIGS: readonly PresetConfig[] = [
  {
    id: 'index-insert-top',
    label: 'Index, insert top',
    scene: 'list',
    key: 'index',
    action: 'insert-top',
    checks: MILK,
  },
  {
    id: 'id-insert-top',
    label: 'Id, insert top',
    scene: 'list',
    key: 'id',
    action: 'insert-top',
    checks: MILK,
  },
  {
    id: 'index-delete-first',
    label: 'Index, delete 1st',
    scene: 'list',
    key: 'index',
    action: 'delete-first',
    checks: MILK,
  },
  {
    id: 'index-append',
    label: 'Index, append',
    scene: 'list',
    key: 'index',
    action: 'append',
    checks: MILK,
  },
  {
    id: 'random-key',
    label: 'Math.random()',
    scene: 'list',
    key: 'random',
    action: 'insert-top',
    checks: MILK,
  },
  {
    id: 'parent-type-change',
    label: 'Wrapper type',
    scene: 'wrapper',
    action: 'type',
    count: 7,
  },
]

export const DEFAULT_PRESET = 'index-insert-top'

/** What a preset log's state exposes: the element ids on stage and the observations shown so far. */
export type ListKeysLogState = {
  ids: readonly string[]
  shown: readonly string[]
}

export const listKeysIntrospection = {
  ids: (s: ListKeysLogState) => new Set(s.ids),
  observedLog: (s: ListKeysLogState) => s.shown,
}

/** The fixture program each preset was recorded from (`truth/record.ts` builds the same tree). */
export function listSnippet(key: KeyStrategy): string {
  return [
    'function TodoList({ todos }) {',
    '  return <ul>{',
    ...CODE[`list/${key}`].lines.map((l) => `    ${l}`),
    '  }</ul>',
    '}',
  ].join('\n')
}
export function wrapperSnippet(action: WrapperAction): string {
  return [...CODE[`wrapper/${action}`].lines].join('\n')
}

/** sha256 of each snippet; `list-keys.descriptor.test.ts` recomputes them. */
export const SNIPPET_SHA256: Record<string, string> = {
  'list/index':
    '0f40f3fe30bd27b4eacdf36dd46597c05ac16d1aedab7a102a8a522589c882af',
  'list/id': '7be229e818d444a272c545bd34b35176a432cfb9ede87d2350ce125f1d5d960c',
  'list/random':
    '32435072c5d3d1bcf3e3c5f78b3439f4c77a2fde0cfd68661410cf002e846837',
  'wrapper/type':
    'ca801474188e73150e7881953e731ae2659d2fff12d266b443081be4b003fb5d',
  'wrapper/class':
    '2b54cb04beafba56b20a09b092477bc05c4ec2d55e3e30e8f167ef04a3065920',
}

const source = (variant: string, snippet: string) => ({
  snippet,
  runtime: RECORDED_WITH.react.map((v) => `react@${v}`).join(' '),
  generator: RECORDED_WITH.generator,
  sha256: SNIPPET_SHA256[variant],
})

function beforeNarration(key: KeyStrategy, checks: Checks): string {
  return `Before: ${BEFORE.map(
    (id, i) =>
      `${ITEMS[id].text} ${checks[id as 'milk' | 'dog'] ? 'checked' : 'unchecked'} (instance ${BEFORE_INSTANCES[i]}, key ${keyText(key, id, i, 'before')})`,
  ).join(', ')}.`
}

export function listLog(
  p: Extract<PresetConfig, { scene: 'list' }>,
): StepLog<ListKeysLogState> {
  const outcome = LIST_OUTCOMES[`${p.key}/${p.action}`]
  const rows = afterRows(p.key, p.action, outcome, p.checks)
  const gone = unmountedRows(outcome)
  const tracked = trackedRow(p.checks) ?? 0
  const answer = listAnswer(p.action, outcome, tracked)
  const choices = listChoices(p.action).map((c) => ({
    ...c,
    value: `checked: ${c.id === NONE_ID ? 'none' : c.label}`,
  }))
  const answerLabel = choices.find((c) => c.id === answer)!.label
  const shown = [
    ...rows.map(
      (r) =>
        `${ITEMS[r.item].text}: ${r.checked ? 'checked' : 'unchecked'}, instance ${r.instance} ${r.from === null ? 'mounted' : 'reused'}`,
    ),
    ...gone.map((g) => `instance ${BEFORE_INSTANCES[g]} unmounted`),
    `checked: ${answer === NONE_ID ? 'none' : answerLabel}`,
  ]
  const ids = [
    ...BEFORE.map((_, i) => `before-${i}`),
    ...rows.map((_, i) => `after-${i}`),
  ]
  const destination = rows.findIndex((r) => r.from === tracked)
  const sentence = listOutcomeSentence(p.action, outcome, p.checks)
  const rule = LIST_RULE[`${p.key}/${p.action}`]
  return {
    id: `list-keys/${p.id}`,
    schema: 1,
    source: source(`list/${p.key}`, listSnippet(p.key)),
    steps: [
      {
        state: { ids: ids.slice(0, BEFORE.length), shown: [] },
        event: '',
        why: SETUP_HINT.list,
        narration: beforeNarration(p.key, p.checks),
        focus: [],
        claim: 'modelled',
      },
      {
        state: { ids, shown },
        event: `${ACTION_LABEL[p.action]}, ${keyPhrase(p.key)}`,
        why: rule,
        narration: `${sentence} After: ${rows
          .map(
            (r) =>
              `${ITEMS[r.item].text} ${r.checked ? 'checked' : 'unchecked'}`,
          )
          .join(', ')}.`,
        focus: [
          destination >= 0 ? `after-${destination}` : `before-${tracked}`,
        ],
        claim: 'observed',
        observes: shown.map((_, i) => i),
      },
    ],
    checkpoints: [
      {
        beforeStep: 1,
        prompt: listPrompt(BEFORE[tracked]),
        choices,
        answer,
        feedback: {
          correct: sentence,
          byChoice: Object.fromEntries(
            choices.filter((c) => c.id !== answer).map((c) => [c.id, sentence]),
          ),
        },
      },
    ],
    observed: { log: shown },
  }
}

export function wrapperLog(
  p: Extract<PresetConfig, { scene: 'wrapper' }>,
): StepLog<ListKeysLogState> {
  const o = WRAPPER_OUTCOMES[p.action]
  const choices = wrapperChoices(p.count).map((c) => ({ ...c, value: c.label }))
  const answer = o.counterReused ? 'kept' : 'reset'
  const count = o.counterReused ? p.count : 0
  const shown = [
    o.wrapperReused ? '<div>: reused' : '<div>: unmounted, <span>: mounted',
    o.counterReused
      ? 'Counter A: reused'
      : 'Counter A: unmounted, Counter B: mounted',
    `count ${count}`,
  ]
  const sentence = wrapperOutcomeSentence(p.action, p.count)
  return {
    id: `list-keys/${p.id}`,
    schema: 1,
    source: source(`wrapper/${p.action}`, wrapperSnippet(p.action)),
    steps: [
      {
        state: { ids: ['before-wrapper', 'before-counter'], shown: [] },
        event: '',
        why: SETUP_HINT.wrapper,
        narration: `Before: a <div> wrapping Counter A with count ${p.count}.`,
        focus: [],
        claim: 'modelled',
      },
      {
        state: {
          ids: [
            'before-wrapper',
            'before-counter',
            'after-wrapper',
            'after-counter',
          ],
          shown,
        },
        event: WRAPPER_LABEL[p.action],
        why: WRAPPER_RULE[p.action],
        narration: `${sentence} Counter shows count ${count}.`,
        focus: ['after-counter'],
        claim: 'observed',
        observes: shown.map((_, i) => i),
      },
    ],
    checkpoints: [
      {
        beforeStep: 1,
        prompt: wrapperPrompt(p.action),
        choices,
        answer,
        feedback: {
          correct: sentence,
          byChoice: Object.fromEntries(
            choices.filter((c) => c.id !== answer).map((c) => [c.id, sentence]),
          ),
        },
      },
    ],
    observed: { log: shown },
  }
}

/** The combination a preset opens on (what its lazy placeholder reserves). */
export const presetCombo = (p: PresetConfig): Combo =>
  p.scene === 'list' ? { scene: 'list', key: p.key, action: p.action } : { scene: 'wrapper', action: p.action }

export const presetLog = (p: PresetConfig) =>
  p.scene === 'list' ? listLog(p) : wrapperLog(p)

export const listKeysDescriptor: ExplorableDescriptor<ListKeysLogState> = {
  id: 'list-keys',
  form: 'explorable',
  title: TITLE,
  engine: { id: 'list-keys', introspect: listKeysIntrospection },
  presets: PRESET_CONFIGS.map(
    (p): Preset<ListKeysLogState> => ({
      id: p.id,
      label: p.label,
      log: presetLog(p),
    }),
  ),
  defaultPreset: DEFAULT_PRESET,
  since: '2026-11',
  // Each preset reserves its starting combination (final polish: per key and action).
  footprint: listKeysFootprint(presetCombo(PRESET_CONFIGS.find((p) => p.id === DEFAULT_PRESET)!)),
  bands: Object.fromEntries(PRESET_CONFIGS.map((p) => [p.id, listKeysBands(presetCombo(p))])),
}
