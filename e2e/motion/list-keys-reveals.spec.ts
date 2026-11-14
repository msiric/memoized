import { test, type Page } from '@playwright/test'
import {
  LK,
  LK_ACTION_ID,
  animsOf,
  hydrateListKeys,
  lkChoose,
  openGallery,
  overlapProblems,
  recordAction,
  save,
  strictCheck,
  summarize,
} from './helpers'

/**
 * H0-C task 1 for the list-keys explorable: every key strategy x list action
 * (and both wrapper changes, in the parent-type-change preset), with one and with two checked rows, at full and
 * reduced motion. Records the action change (-> ask) and the reveal
 * (ask -> reveal). The action is an always-visible control (H3 R8).
 *
 * Asserts (unless MOTION_STRICT=0): no §4 flag on the action change, nor on
 * the reveal under reduced motion; G1 everywhere: nothing that moves or fades
 * prints over other text. The full-motion reveal is the one designed
 * sequence (D21): the Before box empties and refills with the verdict, the
 * lines draw with the ride, so its beats are asserted by reveal.spec.ts
 * rather than by the 300 ms step rules.
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
      const problems: string[] = []
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
          const where = `${key}/${action}${both ? ' both' : ''}${reduced ? ' reduced' : ''}`
          const applyS = summarize(apply.motions, reduced)
          const revealS = summarize(reveal.motions, reduced)
          problems.push(
            ...[...applyS.flags, ...(reduced ? revealS.flags : [])].map((x) => `${where}: ${x.kind} ${x.detail}`),
            ...overlapProblems(apply.cap, apply.at).map((o) => `${where} apply ${o}`),
            ...overlapProblems(reveal.cap, reveal.at).map((o) => `${where} reveal ${o}`),
          )
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
        const where = `wrapper ${action}${reduced ? ' reduced' : ''}`
        problems.push(
          ...[...summarize(apply.motions, reduced).flags, ...(reduced ? summarize(reveal.motions, reduced).flags : [])].map(
            (x) => `${where}: ${x.kind} ${x.detail}`,
          ),
          ...overlapProblems(apply.cap, apply.at).map((o) => `${where} apply ${o}`),
          ...overlapProblems(reveal.cap, reveal.at).map((o) => `${where} reveal ${o}`),
        )
        report.push({
          key: 'wrapper',
          action,
          apply: summarize(apply.motions, reduced),
          reveal: { ...summarize(reveal.motions, reduced), anims: animsOf(reveal.cap) },
        })
        await page.waitForTimeout(350)
      }
      save(`list-keys${both ? '-both' : ''}${reduced ? '-reduced' : ''}.json`, report)
      strictCheck(`list keys${both ? ' two checks' : ''}${reduced ? ' reduced' : ''}: §4 flags and G1`, problems)
    })
