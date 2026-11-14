import { expect, test } from '@playwright/test'
import { ENV_PRESETS } from '../../src/components/visualizations/__stress__/env-records.fixtures'
import { EVENT_LOOP_FIXTURES } from '../../src/components/visualizations/__stress__/event-loop.fixtures'
import { BASE, Recorder, TIER, gated, activeConfigs, envDetectOptions, goto, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'

/**
 * Adversarial fixtures (src/components/visualizations/__stress__) rendered by
 * the real shells and stages on /dev/visualizations/stress. Each finding
 * carries the fixture's lint verdict, so the report can say whether the
 * authoring checks would have rejected the input. Strict mode fails only on
 * findings for inputs the lint accepts.
 */

const ENV_OPTS = envDetectOptions(ENV_PRESETS.map((p) => p.data))

/** The PR tier runs the fixtures at the narrowest phone, the desktop column and very large text; full runs all. */
const PR_ADVERSARIAL = ['w320', 'w1280', 'text150-375']
const configs = activeConfigs().filter((c) => TIER === 'full' || process.env.STRESS_CONFIGS || PR_ADVERSARIAL.includes(c.name))

for (const c of configs) {
  test(`adversarial @ ${c.name}`, async ({ browser }) => {
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'adversarial')
    try {
      for (const id of Object.keys(EVENT_LOOP_FIXTURES)) {
        await goto(page, c, `${BASE}/dev/visualizations/stress?f=${id}`)
        const lint = JSON.parse((await page.getAttribute('[data-stress-fixture]', 'data-stress-lint')) ?? '[]')
        const before = rec.rows.length
        await walkStepThrough(page, rec, `[data-viz="stress-${id}"]`, `fixture ${id}`, {}, answersOf(EVENT_LOOP_FIXTURES[id as keyof typeof EVENT_LOOP_FIXTURES].presets))
        for (const r of rec.rows.slice(before)) r.data = { ...r.data, lint: lint.length ? lint.slice(0, 3) : 'accepted' }
      }
      for (const p of ENV_PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations/stress?f=${p.id}`)
        const lint = JSON.parse((await page.getAttribute('[data-stress-fixture]', 'data-stress-lint')) ?? '[]')
        if (await page.locator('[data-stress-error]').count()) {
          rec.note(`fixture ${p.id}`, 'static', 'layout-throws', lint.join('; '), { lint })
          continue
        }
        const before = rec.rows.length
        await rec.check(page, `[data-viz="stress-${p.id}"]`, `fixture ${p.id}`, 'static', ENV_OPTS)
        for (const r of rec.rows.slice(before)) r.data = { ...r.data, lint: lint.length ? lint : 'accepted' }
      }
    } finally {
      rec.write()
      await ctx.close()
    }
    // Strict over inputs the authoring lint accepts: a rejected fixture never reaches a lesson.
    if (gated(c)) expect(rec.rows.filter((r) => r.data?.lint === 'accepted').map((r) => `${r.detector} ${r.visual} [${r.state}] ${r.msg}`)).toEqual([])
  })
}
