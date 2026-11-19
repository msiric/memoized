import { expect, test, type Page } from '@playwright/test'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'

/**
 * The wave 4D frontend figures (four annotated-tree presets) across the tier's configs, as the other static figures are:
 * each figure at rest, every control hovered (the text alternative's
 * summary), and the print rendering, through the same detectors. Strict by
 * default.
 */

const FIGURES = ['context-render-causes', 'federation-react-singleton', 'dom-vs-accessibility-tree', 'merge-rebase-squash-revert-reset']
const URL_ = '/dev/visualizations?fe=static'

async function hoverPass(page: Page, rec: Recorder, scope: string, visual: string) {
  const n = await page.evaluate((s) => {
    const root = document.querySelector(s)!
    const ctl = [...root.querySelectorAll('button, summary')].filter(
      (e) => (e as HTMLElement).getClientRects().length > 0 && getComputedStyle(e).visibility === 'visible',
    )
    ctl.forEach((e, i) => e.setAttribute('data-stress-hover', String(i)))
    return ctl.length
  }, scope)
  for (let i = 0; i < n; i++) {
    const el = page.locator(`${scope} [data-stress-hover="${i}"]`)
    try {
      await el.hover({ timeout: 2000 })
    } catch {
      continue
    }
    await rec.check(page, scope, visual, 'hover summary', {}, `${visual} | hover`)
  }
  await page.mouse.move(0, 0)
}

for (const c of activeConfigs()) {
  test(`frontend statics @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'fe-statics')
    let fails: Row[] = []
    try {
      await goto(page, c, `${BASE}${URL_}`)
      for (const [i, id] of FIGURES.entries()) {
        const s = await markScope(page, '[data-viz]', i, `fe${i}`)
        await rec.check(page, s!, `fe ${id}`, 'static', {}, `fe ${id}`)
        await hoverPass(page, rec, s!, `fe ${id}`)
      }
      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      await goto(page, c, `${BASE}${URL_}`)
      for (const [i, id] of FIGURES.entries()) {
        const s = await markScope(page, '[data-viz]', i, `pfe${i}`)
        await rec.check(page, s!, `fe ${id} print`, 'static', {}, `fe ${id} | print`)
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
