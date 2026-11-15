import { expect, test, type Page } from '@playwright/test'
import { linkedListDescriptor } from '../../src/components/visualizations/engines/linked-list/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'

/**
 * The pointer-rewiring visuals (wave 2B) across the tier's configs, as the
 * flagships are: each lesson group's presets (switched with the control
 * that shows), every step, walked with checkpoints answered right, wrong
 * and skipped; every control hovered; the two static frames; and the print
 * rendering through the same detectors. Strict by default.
 */

const ANSWERS = answersOf(linkedListDescriptor.presets)
const GROUPS = ['reverse-between-m2-n4', 'palindrome-split-reverse-compare']

async function hoverPass(page: Page, rec: Recorder, scope: string, visual: string) {
  const n = await page.evaluate((s) => {
    const root = document.querySelector(s)!
    const ctl = [...root.querySelectorAll('button, [role="radio"], [role="slider"], summary, select')].filter(
      (e) => (e as HTMLElement).getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible',
    )
    ctl.forEach((e, i) => e.setAttribute('data-stress-hover', String(i)))
    return ctl.length
  }, scope)
  for (let i = 0; i < n; i++) {
    const el = page.locator(`${scope} [data-stress-hover="${i}"]`)
    const label = await el.evaluate((e) => (e.getAttribute('aria-label') ?? e.textContent ?? e.tagName).trim().slice(0, 24))
    try {
      await el.hover({ timeout: 2000 })
    } catch {
      continue
    }
    await rec.check(page, scope, visual, `hover ${label}`, {}, `${visual} | hover`)
  }
  await page.mouse.move(0, 0)
}

for (const c of activeConfigs()) {
  test(`linked list @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'linked-list')
    let fails: Row[] = []
    try {
      for (const preset of GROUPS) {
        await goto(page, c, `${BASE}/dev/visualizations?ll=${preset}`)
        const s = await markScope(page, '[data-viz="linked-list-pointer-rewiring"]', 0, `ll-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `linked-list ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `linked-list ${preset}`)
      }
      await goto(page, c, `${BASE}/dev/visualizations?ll=static`)
      for (const [i, id] of ['floyd-rho', 'full-reversal-strip'].entries()) {
        const s = await markScope(page, '[data-viz="linked-list-frames"]', i, `llf${i}`)
        await rec.check(page, s!, `linked-list-frames ${id}`, 'static', {}, `linked-list-frames ${id}`)
        await hoverPass(page, rec, s!, `linked-list-frames ${id}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      for (const preset of GROUPS) {
        await goto(page, c, `${BASE}/dev/visualizations?ll=${preset}`)
        const s = await markScope(page, '[data-viz="linked-list-pointer-rewiring"]', 0, `pll-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `linked-list ${preset} print`, 'start', {}, `linked-list ${preset} | print`)
      }
      await goto(page, c, `${BASE}/dev/visualizations?ll=static`)
      for (const [i, id] of ['floyd-rho', 'full-reversal-strip'].entries()) {
        const s = await markScope(page, '[data-viz="linked-list-frames"]', i, `pllf${i}`)
        await rec.check(page, s!, `linked-list-frames ${id} print`, 'static', {}, `linked-list-frames ${id} | print`)
      }
      await page.emulateMedia({ media: 'screen' })
    } finally {
      fails = failing(rec.rows.filter((r) => r.detector !== 'text-zoom'), (id, n) =>
        test.info().annotations.push({ type: `pending decision (${id})`, description: `${c.name}: ${n} rows` }),
      )
      rec.write()
      await ctx.close()
    }
    if (gated(c)) expect(fails.map((r) => `${r.detector} ${r.visual} [${r.state}] ${r.msg}`)).toEqual([])
  })
}
