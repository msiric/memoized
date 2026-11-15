import { expect, test, type Page } from '@playwright/test'
import { frontierDescriptor } from '../../src/components/visualizations/engines/frontier/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'

/**
 * The frontier step-through (wave 2A) across the tier's configs, as the
 * flagships are walked: one page per lesson group (`?fr=`), every preset of
 * the group (switched with the control that shows) and every step, three
 * times per preset (questions answered right, wrong and skipped); every
 * control hovered; and the light print rendering of each group through the
 * same detectors. Strict by default (STRESS_STRICT=0 records only).
 */

const ANSWERS = answersOf(frontierDescriptor.presets)
/** The first preset of each lesson group: its page offers the rest of the group. */
const GROUPS = ['bfs-levels', 'dijkstra-lazy-heap', 'bst-iterator-stack']

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
  test(`frontier @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(15 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'frontier')
    let fails: Row[] = []
    try {
      for (const preset of GROUPS) {
        await goto(page, c, `${BASE}/dev/visualizations?fr=${preset}`)
        const s = await markScope(page, '[data-viz="bfs-dfs-frontier"]', 0, `fr-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `frontier ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `frontier ${preset}`)
      }
      await page.emulateMedia({ media: 'print' })
      for (const preset of GROUPS) {
        await goto(page, c, `${BASE}/dev/visualizations?fr=${preset}`)
        const s = await markScope(page, '[data-viz="bfs-dfs-frontier"]', 0, `print-fr-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `frontier ${preset} print`, 'start', {}, `frontier ${preset} | print`)
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
