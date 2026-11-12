import { expect, test } from '@playwright/test'
import { varVsLetLoop, factoryCallsVsAliases } from '../../src/components/visualizations/engines/env-records/presets/closures'
import { BASE, Recorder, envDetectOptions, goto, markScope, openContext, type Config } from './harness'
import { walkListKeys, walkStepThrough } from './flows'

/**
 * R1-B: the flagship walk (same flows and detectors as flagships.stress.ts)
 * at configurations the H0 matrix lacks: browser zoom 67/90/110/125/175 %
 * (CSS viewport = device width / zoom, DPR = zoom), landscape phone,
 * tablet portrait, very wide.
 */
const ENV_OPTS = envDetectOptions([varVsLetLoop.data, factoryCallsVsAliases.data])
const z = (pct: number, base = 1280, h = 900): Config => ({
  name: `zoom${pct}-${base}`,
  width: Math.round(base / (pct / 100)),
  height: Math.round(h / (pct / 100)),
  dsf: pct / 100,
  note: `${base}x${h} at ${pct}% browser zoom`,
})
export const R1_CONFIGS: Config[] = [
  z(67),
  z(90),
  z(110),
  z(125),
  z(175),
  z(175, 1024, 768),
  { name: 'land-667x375', width: 667, height: 375, dsf: 2 },
  { name: 'tablet-820x1180', width: 820, height: 1180, dsf: 2 },
  { name: 'wide-2560', width: 2560, height: 1440 },
]
const ONLY = process.env.R1_CONFIGS?.split(',')

for (const c of R1_CONFIGS.filter((c) => !ONLY || ONLY.includes(c.name))) {
  test(`r1 flagships @ ${c.name}`, async ({ browser }) => {
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'flagships')
    try {
      await goto(page, c, `${BASE}/dev/visualizations`)
      const el = await markScope(page, '[data-viz="event-loop"]', 0, 'el')
      await page.locator(el!).scrollIntoViewIfNeeded()
      await page.locator(el!).hover()
      await walkStepThrough(page, rec, el!, 'event-loop')
      const lk = await markScope(page, '[data-viz="list-keys"]', 0, 'lk')
      await page.locator(lk!).scrollIntoViewIfNeeded()
      await page.locator(lk!).hover()
      await walkListKeys(page, rec, lk!, 'list-keys')
      await goto(page, c, `${BASE}/dev/visualizations?lk=parent-type-change`)
      const lkw = await markScope(page, '[data-viz="list-keys"]', 0, 'lkw')
      await page.locator(lkw!).scrollIntoViewIfNeeded()
      await page.locator(lkw!).hover()
      await walkListKeys(page, rec, lkw!, 'list-keys wrapper', true)
      await goto(page, c, `${BASE}/dev/visualizations?static=1`)
      for (const [i, id] of ['var-vs-let-loop', 'factory-calls-vs-aliases'].entries()) {
        const s = await markScope(page, '[data-viz="environment-records"]', i, `er${i}`)
        await rec.check(page, s!, `environment-records ${id}`, 'static', ENV_OPTS, `environment-records ${id}`)
      }
    } finally {
      rec.write()
      await ctx.close()
    }
    expect(true).toBe(true)
  })
}
