import { test, type Page } from '@playwright/test'
import { LK, LK_ACTION_ID, animsOf, hydrateListKeys, lkChoose, openGallery, recordAction, save, summarize } from './helpers'

/**
 * H0-C task 1 for the list-keys explorable: every key strategy x list action
 * (and both wrapper changes, in the parent-type-change preset), with one and with two checked rows, at full and
 * reduced motion. Records the action change (-> ask) and the reveal
 * (ask -> reveal). The action is an always-visible control (H3 R8).
 */

const KEYS = ['Index', 'Id', 'Math.random()']
const ACTIONS = ['Insert at top', 'Delete first', 'Append', 'Reverse']

/** Leaves the action on a different one, so choosing `action` is a change. */
async function away(page: Page, action: string) {
  await lkChoose(page, { action: action === 'insert-top' ? 'append' : 'insert-top' })
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
          await lkChoose(page, { key })
          await away(page, LK_ACTION_ID[action])
          const apply = await recordAction(
            page,
            LK,
            () => f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), LK_ACTION_ID[action]),
            500,
          )
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
          await page.waitForTimeout(900)
        }
      // The wrapper scene is its own preset (VIZ-H D17).
      await page.goto('/dev/visualizations?lk=parent-type-change')
      await hydrateListKeys(page)
      for (const action of ['type', 'class']) {
        await lkChoose(page, { action: action === 'type' ? 'class' : 'type' })
        const apply = await recordAction(
          page,
          LK,
          () => f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), action),
          500,
        )
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
