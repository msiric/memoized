import { test } from '@playwright/test'
import { LK_PROBE, toAsk } from './lk-common'
import { LK, activeInfo, burstShots, hydrateLK, liveText, open, sampleAfter, save, strip } from './common'

/** R1-C: frame-sample the list-keys check rider at 375 and 1440. */

const CASES = [
  ['Id', 'Insert at top', false],
  ['Index', 'Insert at top', false],
  ['Id', 'Reverse', true],
  ['Index', 'Reverse', true],
  ['Id', 'Delete first', true],
] as const

for (const width of [375, 1440])
  test(`list-keys rider @${width}`, async ({ page, context }) => {
    test.setTimeout(240_000)
    await open(page, { width, height: width === 375 ? 667 : 900 })
    await hydrateLK(page)
    const f = page.locator(LK)
    const out: Record<string, unknown> = {}
    for (const [key, action, both] of CASES) {
      await toAsk(page, key, action, both)
      await f.evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(200)
      const samples = await sampleAfter(page, LK, LK_PROBE, () => f.locator('[data-choice-index="0"]').click(), 1000)
      out[`${key}/${action}/${both}`] = { samples, focus: await activeInfo(page), live: await liveText(page, LK) }
      await page.waitForTimeout(300)
      out[`${key}/${action}/${both}`] = { ...(out[`${key}/${action}/${both}`] as object), liveLater: await liveText(page, LK) }
      if (width === 1440 || key === 'Id') {
        await toAsk(page, key, action, both)
        await f.evaluate((el) => el.scrollIntoView({ block: 'center' }))
        await page.waitForTimeout(200)
        const shots = await burstShots(page, `${LK} [data-viz-region="columns"]`, () => f.locator('[data-choice-index="0"]').click(), 900)
        await strip(
          context,
          `LK-ride-${key}-${action.replace(/ /g, '')}${both ? '-two' : ''}-${width}`,
          shots.slice(0, 16),
          `List keys ${key} + ${action}${both ? ' (two checks)' : ''} @${width}, real-time CDP captures of the columns after the answer`,
          width === 375 ? 4 : 3,
        )
      }
    }
    save(`lk-ride-${width}.json`, out)
  })
