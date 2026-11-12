import { test, type Page } from '@playwright/test'
import { LK, animsOf, hydrateListKeys, openGallery, recordAction, save, summarize } from './helpers'

/**
 * H0-C task 1 for the list-keys explorable: every key strategy x list action
 * (and both wrapper changes), with one and with two checked rows, at full and
 * reduced motion. Records the apply (pick -> ask), the reveal (ask -> reveal)
 * and "Try another action" (reveal -> pick) transitions.
 */

const KEYS = ['Index', 'Id', 'Math.random()']
const ACTIONS = ['Insert at top', 'Delete first', 'Append', 'Reverse']

async function toPick(page: Page) {
  const f = page.locator(LK)
  const mode = await f.getAttribute('data-viz-mode')
  if (mode === 'ask') await f.locator('[data-viz-part="viz-back"]').click()
  if (mode === 'reveal') await f.locator('[data-viz-part="viz-again"]').click()
  await page.waitForTimeout(350)
}

for (const reduced of [false, true])
  for (const both of [false, true])
    test(`list-keys reveals${both ? ' two checks' : ''}${reduced ? ' reduced' : ''}`, async ({ page }) => {
      test.setTimeout(300_000)
      await openGallery(page, { reduced })
      await hydrateListKeys(page)
      const f = page.locator(LK)
      if (both) {
        await f.locator('input[type="checkbox"]').nth(1).check()
        await page.waitForTimeout(350)
      }
      const report: unknown[] = []
      for (const key of KEYS)
        for (const action of ACTIONS) {
          await toPick(page)
          await f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: key }).click()
          await page.waitForTimeout(350)
          const apply = await recordAction(page, LK, () => f.getByRole('button', { name: action, exact: true }).click(), 500)
          await page.waitForTimeout(350)
          const reveal = await recordAction(page, LK, () => f.locator('[data-choice-index="0"]').click(), 700)
          const lines = await f.locator('[data-viz-part="lines"] path').count()
          report.push({
            key,
            action,
            both,
            apply: summarize(apply.motions, reduced),
            reveal: { ...summarize(reveal.motions, reduced), anims: animsOf(reveal.cap), paths: lines },
          })
          await page.waitForTimeout(350)
        }
      // Wrapper scene.
      await f.getByRole('radiogroup', { name: 'Scene' }).getByRole('radio', { name: 'Wrapper type' }).click()
      await page.waitForTimeout(350)
      for (const action of ['type', 'class']) {
        await toPick(page)
        const btn = f.locator(`[data-viz-focus="action-${action}"]`)
        const apply = await recordAction(page, LK, () => btn.click(), 500)
        await page.waitForTimeout(350)
        const reveal = await recordAction(page, LK, () => f.locator('[data-choice-index="0"]').click(), 700)
        report.push({
          key: 'wrapper',
          action,
          apply: summarize(apply.motions, reduced),
          reveal: { ...summarize(reveal.motions, reduced), anims: animsOf(reveal.cap) },
        })
        await page.waitForTimeout(350)
      }
      save(`list-keys${both ? '-both' : ''}${reduced ? '-reduced' : ''}.json`, report)
    })
