import { expect, test, type Page } from '@playwright/test'
import { eventLoopDescriptor } from '../../src/components/visualizations/engines/event-loop/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'
import { localOnly, localOnlyNote } from '../premium'

/**
 * Wave 4C across the tier's configs: the event-loop lesson groups (Exercise
 * 2; the call-stack traces, local-only) walked step by step with their
 * questions answered right, wrong and skipped, every control hovered; the
 * three JavaScript core figures at rest, hovered and in print. Strict by
 * default.
 */

const STEPS = ['exercise-2-async1-async2', 'who-called-inner', 'await-async-frames']
const ANSWERS = answersOf(eventLoopDescriptor.presets.filter((p) => STEPS.includes(p.id)))
const WALKED = STEPS.filter((p) => !localOnly('event-loop', p))
const SKIPPED = STEPS.filter((p) => !WALKED.includes(p)).map((p) => localOnlyNote('event-loop', p))
const FIGURES = ['gc-reachability-cycle-and-weak-edge', 'retainer-paths', 'extends-two-chains']
const CORE = '/dev/visualizations?core=static'

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
  test(`js core @ ${c.name}`, async ({ browser }) => {
    for (const description of SKIPPED) test.info().annotations.push({ type: 'skipped preset', description })
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'js-core')
    let fails: Row[] = []
    try {
      for (const preset of WALKED) {
        await goto(page, c, `${BASE}/dev/visualizations?el=${preset}`)
        const s = await markScope(page, '[data-viz="event-loop"]', 0, `el-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `event-loop ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `event-loop ${preset}`)
      }
      await goto(page, c, `${BASE}${CORE}`)
      for (const [i, id] of FIGURES.entries()) {
        const s = await markScope(page, '[data-viz]', i, `core${i}`)
        await rec.check(page, s!, `core ${id}`, 'static', {}, `core ${id}`)
        await hoverPass(page, rec, s!, `core ${id}`)
      }
      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      await goto(page, c, `${BASE}${CORE}`)
      for (const [i, id] of FIGURES.entries()) {
        const s = await markScope(page, '[data-viz]', i, `pcore${i}`)
        await rec.check(page, s!, `core ${id} print`, 'static', {}, `core ${id} | print`)
      }
      for (const preset of WALKED) {
        await goto(page, c, `${BASE}/dev/visualizations?el=${preset}`)
        const s = await markScope(page, '[data-viz="event-loop"]', 0, `pel-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `event-loop ${preset} print`, 'start', {}, `event-loop ${preset} | print`)
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
