import { expect, test } from '@playwright/test'
import { varVsLetLoop, factoryCallsVsAliases } from '../../src/components/visualizations/engines/env-records/presets/closures'
import { BASE, Recorder, activeConfigs, envDetectOptions, goto, markScope, openContext } from './harness'
import { walkListKeys, walkStepThrough } from './flows'

/** The three flagships on /dev/visualizations across the full matrix. */

const ENV_OPTS = envDetectOptions([varVsLetLoop.data, factoryCallsVsAliases.data])
const strict = process.env.STRESS_STRICT === '1'

for (const c of activeConfigs()) {
  test(`flagships @ ${c.name}`, async ({ browser }) => {
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'flagships')
    try {
      // Event loop: both presets, every step.
      await goto(page, c, `${BASE}/dev/visualizations`)
      const el = await markScope(page, '[data-viz="event-loop"]', 0, 'el')
      await page.locator(el!).scrollIntoViewIfNeeded()
      await page.locator(el!).hover()
      await walkStepThrough(page, rec, el!, 'event-loop')

      // List keys: every key x action, pick / ask / reveal.
      const lk = await markScope(page, '[data-viz="list-keys"]', 0, 'lk')
      await page.locator(lk!).scrollIntoViewIfNeeded()
      await page.locator(lk!).hover()
      await walkListKeys(page, rec, lk!, 'list-keys')

      await goto(page, c, `${BASE}/dev/visualizations?lk=parent-type-change`)
      const lkw = await markScope(page, '[data-viz="list-keys"]', 0, 'lkw')
      await page.locator(lkw!).scrollIntoViewIfNeeded()
      await page.locator(lkw!).hover()
      await walkListKeys(page, rec, lkw!, 'list-keys wrapper', true)

      // Text-only zoom: does the visual's text follow the root font size?
      if (c.rootFont) {
        const sizes = await page.evaluate(() => {
          const px = (sel: string) => {
            const e = document.querySelector(sel)
            return e ? getComputedStyle(e).fontSize : null
          }
          return {
            prose: px('[data-viz="event-loop"] + p'),
            caption: px('[data-viz="event-loop"] [data-viz-part="viz-caption"]'),
            code: px('[data-viz="event-loop"] [data-viz-region="code"] code'),
            title: px('[data-viz="event-loop"] header p'),
            listKeysCard: px('[data-viz="list-keys"] li[data-row]'),
          }
        })
        rec.note('all v2 visuals', 'text zoom', 'text-zoom', `root font ${c.rootFont}: prose ${sizes.prose}, caption ${sizes.caption}, code ${sizes.code}, title ${sizes.title}, list-keys card ${sizes.listKeysCard}`, sizes)
      }

      // Environment records: both presets, server SVG.
      await goto(page, c, `${BASE}/dev/visualizations?static=1`)
      for (const [i, id] of ['var-vs-let-loop', 'factory-calls-vs-aliases'].entries()) {
        const s = await markScope(page, '[data-viz="environment-records"]', i, `er${i}`)
        await rec.check(page, s!, `environment-records ${id}`, 'static', ENV_OPTS, `environment-records ${id}`)
      }
    } finally {
      rec.write()
      await ctx.close()
    }
    if (strict) expect(rec.rows).toEqual([])
  })
}
