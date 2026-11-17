import { expect, test, type Page } from '@playwright/test'
import { annotatedTreeDescriptor } from '../../src/components/visualizations/engines/annotated-tree/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'

/**
 * The annotated trees (wave 2D) across the tier's configs, as the other
 * static figures are: each preset at rest, every control hovered (the text
 * alternative's summary), and the print rendering, through the same
 * detectors. Strict by default.
 */

// The hidden-class trees (wave 3B) are stressed on the JavaScript-track page (`js-statics.stress.ts`).
const PRESETS = annotatedTreeDescriptor.presets.map((p) => p.id).filter((id) => id !== 'hidden-class-transitions')

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
  test(`annotated tree @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'annotated-tree')
    let fails: Row[] = []
    try {
      await goto(page, c, `${BASE}/dev/visualizations?at=static`)
      for (const [i, id] of PRESETS.entries()) {
        const s = await markScope(page, '[data-viz="annotated-tree"]', i, `at${i}`)
        await rec.check(page, s!, `annotated-tree ${id}`, 'static', {}, `annotated-tree ${id}`)
        await hoverPass(page, rec, s!, `annotated-tree ${id}`)
      }
      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      await goto(page, c, `${BASE}/dev/visualizations?at=static`)
      for (const [i, id] of PRESETS.entries()) {
        const s = await markScope(page, '[data-viz="annotated-tree"]', i, `pat${i}`)
        await rec.check(page, s!, `annotated-tree ${id} print`, 'static', {}, `annotated-tree ${id} | print`)
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
