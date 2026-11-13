// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { sha256 } from '../../step-log/truth'
import { LIMITS, validateStepLog } from '../../step-log/validate'
import { LIST_RULE, WRAPPER_RULE, listChoices } from './content'
import { CODE } from './code'
import {
  PRESET_CONFIGS,
  SNIPPET_SHA256,
  listKeysDescriptor,
  listKeysIntrospection,
  listSnippet,
  wrapperSnippet,
} from './descriptor'
import { answerOf, explore, initialExplore } from './machine'
import { AFTER, KEY_STRATEGIES, LIST_ACTIONS } from './model'

describe('list-keys presets', () => {
  it.each(listKeysDescriptor.presets.map((p) => [p.id, p.log] as const))(
    '%s passes the authoring lint',
    (_id, log) => {
      expect(validateStepLog(log, listKeysIntrospection)).toEqual([])
    },
  )

  it('are the six register presets, in order, defaulting to index-insert-top', () => {
    expect(PRESET_CONFIGS.map((p) => p.id)).toEqual([
      'index-insert-top',
      'id-insert-top',
      'index-delete-first',
      'index-append',
      'random-key',
      'parent-type-change',
    ])
    expect(listKeysDescriptor.defaultPreset).toBe('index-insert-top')
  })

  it('record the outcomes the spec table states (React 18.3.1 rater runs)', () => {
    const answer = (id: string) =>
      listKeysDescriptor.presets.find((p) => p.id === id)!.log.checkpoints[0]
        .answer
    expect(answer('index-insert-top')).toBe('wake')
    expect(answer('id-insert-top')).toBe('milk')
    expect(answer('index-delete-first')).toBe('dog')
    expect(answer('index-append')).toBe('milk')
    expect(answer('random-key')).toBe('none')
    expect(answer('parent-type-change')).toBe('reset')
  })

  it('carry the hash of the exact snippet they were recorded from', () => {
    for (const k of KEY_STRATEGIES)
      expect(sha256(listSnippet(k))).toBe(SNIPPET_SHA256[`list/${k}`])
    for (const a of ['type', 'class'] as const)
      expect(sha256(wrapperSnippet(a))).toBe(SNIPPET_SHA256[`wrapper/${a}`])
  })
})

describe('list-keys authored text', () => {
  it('states a rule within 140 characters for every combination', () => {
    for (const t of [
      ...Object.values(LIST_RULE),
      ...Object.values(WRAPPER_RULE),
    ]) {
      expect(t.length).toBeLessThanOrEqual(LIMITS.why)
    }
  })

  it('offers every new row plus "lost" as choices, within 4', () => {
    for (const a of LIST_ACTIONS) {
      const c = listChoices(a)
      expect(c.length).toBe(AFTER[a].length + 1)
      expect(c.length).toBeLessThanOrEqual(LIMITS.maxChoices)
    }
  })

  it('keeps code lines within 40 columns', () => {
    for (const c of Object.values(CODE))
      for (const l of c.lines) expect(l.length).toBeLessThanOrEqual(40)
  })
})

describe('list-keys explorable machine', () => {
  const start = initialExplore(PRESET_CONFIGS[0])

  it('opens a preset at its prediction', () => {
    expect(start).toMatchObject({
      scene: 'list',
      key: 'index',
      listAction: 'insert-top',
      phase: 'ask',
    })
    expect(answerOf(start)).toBe('wake')
  })

  it('reveals after an answer or a skip, and remembers the answer', () => {
    const r = explore(start, { type: 'answer', choice: 'milk' })
    expect(r).toMatchObject({ phase: 'reveal', pick: 'milk', reveals: 1 })
    expect(r.memory['index/insert-top/0']).toBe('milk')
    expect(explore(start, { type: 'skip' })).toMatchObject({
      phase: 'reveal',
      pick: null,
    })
  })

  it('asks again whenever the experiment changes', () => {
    const r = explore(start, { type: 'skip' })
    expect(explore(r, { type: 'key', key: 'id' })).toMatchObject({
      phase: 'ask',
      pick: undefined,
      key: 'id',
    })
    expect(explore(r, { type: 'check', item: 'dog' })).toMatchObject({
      phase: 'ask',
    })
    expect(explore(r, { type: 'apply', action: 'reverse' })).toMatchObject({
      phase: 'ask',
      listAction: 'reverse',
    })
    expect(explore(r, { type: 'apply', action: 'insert-top' })).toMatchObject({ phase: 'ask' })
  })

  it('"Try another" moves to the next action and asks', () => {
    const r = explore(start, { type: 'skip' })
    expect(explore(r, { type: 'again' })).toMatchObject({ phase: 'ask', listAction: 'delete-first' })
    const last = explore(explore(start, { type: 'apply', action: 'reverse' }), { type: 'skip' })
    expect(explore(last, { type: 'again' })).toMatchObject({ phase: 'ask', listAction: 'insert-top', key: 'index' })
  })

  it('has nothing to predict when no row is checked', () => {
    const none = explore(start, { type: 'check', item: 'milk' })
    expect(answerOf(none)).toBeNull()
    expect(explore(none, { type: 'answer', choice: 'wake' })).toBe(none)
  })

  it('has no pick phase: a scene switch asks at once', () => {
    expect(explore(start, { type: 'scene', scene: 'wrapper' })).toMatchObject({
      scene: 'wrapper',
      phase: 'ask',
    })
  })
})
