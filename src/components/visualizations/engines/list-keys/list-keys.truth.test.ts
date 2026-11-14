// @vitest-environment node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AFTER,
  BEFORE_INSTANCES,
  ITEMS,
  KEY_STRATEGIES,
  LIST_ACTIONS,
  WRAPPER_ACTIONS,
  afterRows,
  unmountedRows,
  type Checks,
} from './model'
import { LIST_OUTCOMES, RECORDED_WITH, WRAPPER_OUTCOMES } from './outcomes'
import {
  CHECK_SUBSETS,
  WRAPPER_COUNTS,
  subsetName,
  type Recording,
} from './truth/record'

/**
 * Truthful by construction (spec P6): the list-keys visual draws from
 * `outcomes.ts`; this re-renders every combination with real React 18 and
 * React 19 (react-dom + jsdom, each in a fresh process) and requires the
 * table, and every row the visual derives from it, to match what React did.
 */

function recordWith(major: '18' | '19'): Recording {
  const run = spawnSync(
    process.execPath,
    ['--import', 'tsx', path.join(__dirname, 'truth', 'run.ts'), major],
    {
      encoding: 'utf8',
      timeout: 60_000,
      env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
    },
  )
  if (run.status !== 0)
    throw new Error(`recorder failed for React ${major}: ${run.stderr}`)
  return JSON.parse(run.stdout) as Recording
}

const recordings = (['18', '19'] as const).map(
  (major) => [major, recordWith(major)] as const,
)

describe.each(recordings)('React %s', (_major, rec) => {
  it('is the exact version the table was recorded with', () => {
    expect(RECORDED_WITH.react).toContain(rec.react)
  })

  const listCases = KEY_STRATEGIES.flatMap((key) =>
    LIST_ACTIONS.flatMap((action) =>
      (['dom', 'state'] as const).flatMap((variant) =>
        CHECK_SUBSETS.map((subset) => [key, action, variant, subset] as const),
      ),
    ),
  )

  it.each(listCases)(
    '%s keys, %s (%s state, checks %j): the visual shows what React did',
    (key, action, variant, subset) => {
      const observed =
        rec.list[`${key}/${action}/${variant}/${subsetName(subset)}`]
      expect(observed, 'recorded').toBeDefined()
      const checks: Checks = {
        milk: subset.includes('milk'),
        dog: subset.includes('dog'),
      }
      const outcome = LIST_OUTCOMES[`${key}/${action}`]
      const drawn = afterRows(key, action, outcome, checks)
      expect(
        drawn.map((r) => ({
          text: ITEMS[r.item].text,
          instance: r.from === null ? 'new' : BEFORE_INSTANCES[r.from],
          checked: r.checked,
        })),
      ).toEqual(observed.rows)
      expect(unmountedRows(outcome).map((r) => BEFORE_INSTANCES[r])).toEqual(
        [...observed.unmounted].sort(),
      )
      expect(observed.rows.map((r) => r.text)).toEqual(
        AFTER[action].map((i) => ITEMS[i].text),
      )
    },
  )

  const wrapperCases = WRAPPER_ACTIONS.flatMap((action) =>
    WRAPPER_COUNTS.map((n) => [action, n] as const),
  )
  it.each(wrapperCases)(
    'wrapper change "%s" starting at count %i: the visual shows what React did',
    (action, n) => {
      const observed = rec.wrapper[`${action}/${n}`]
      const o = WRAPPER_OUTCOMES[action]
      expect(observed).toEqual({
        tag: action === 'type' ? 'span' : 'div',
        count: o.counterReused ? n : 0,
        wrapperReused: o.wrapperReused,
        counterReused: o.counterReused,
        unmounted: o.counterReused ? [] : ['A'],
      })
    },
  )
})

describe('the list-keys truth harness catches a wrong table', () => {
  const rec = recordings[0][1]
  it('fails when a recorded match is edited', () => {
    const lying = { reused: [1, 0, null] as const }
    const drawn = afterRows('index', 'insert-top', lying, {
      milk: true,
      dog: false,
    })
    expect(drawn.map((r) => r.checked)).not.toEqual(
      rec.list['index/insert-top/dom/milk'].rows.map((r) => r.checked),
    )
  })
})
