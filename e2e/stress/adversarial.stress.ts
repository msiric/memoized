import { expect, test } from '@playwright/test'
import { ENV_PRESETS } from '../../src/components/visualizations/__stress__/env-records.fixtures'
import { EVENT_LOOP_FIXTURES } from '../../src/components/visualizations/__stress__/event-loop.fixtures'
import { BASE, Recorder, activeConfigs, envDetectOptions, goto, openContext } from './harness'
import { walkStepThrough } from './flows'

/**
 * Adversarial fixtures (src/components/visualizations/__stress__) rendered by
 * the real shells and stages on /dev/visualizations/stress. Each finding
 * carries the fixture's lint verdict, so the report can say whether the
 * authoring checks would have rejected the input.
 */

const strict = process.env.STRESS_STRICT === '1'
const ENV_OPTS = envDetectOptions(ENV_PRESETS.map((p) => p.data))

for (const c of activeConfigs()) {
  test(`adversarial @ ${c.name}`, async ({ browser }) => {
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'adversarial')
    try {
      for (const id of Object.keys(EVENT_LOOP_FIXTURES)) {
        await goto(page, c, `${BASE}/dev/visualizations/stress?f=${id}`)
        const lint = JSON.parse((await page.getAttribute('[data-stress-fixture]', 'data-stress-lint')) ?? '[]')
        const before = rec.rows.length
        await walkStepThrough(page, rec, `[data-viz="stress-${id}"]`, `fixture ${id}`)
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
    if (strict) expect(rec.rows).toEqual([])
  })
}
