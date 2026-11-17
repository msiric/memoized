import { expect, test, type Page } from '@playwright/test'
import { FRAMES_VIZ } from '../../src/components/visualizations/engines/frames/gallery'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'
import { localOnly, localOnlyNote } from '../premium'

/**
 * The frames step-throughs (wave 3C) across the tier's configs, as the
 * flagships are: every preset of the three visuals, every step, walked with
 * checkpoints answered right, wrong and skipped; every control hovered; and
 * the print rendering through the same detectors. Strict by default.
 */

const ANSWERS = answersOf(FRAMES_VIZ.flatMap((d) => d.presets))
const ALL = FRAMES_VIZ.flatMap((d) => d.presets.map((p) => ({ id: d.id, preset: p.id })))
/** Every frame shows a practice answer (or sits in its group): local-only, walked only where the content checkout has it (never CI). */
const PRESETS = ALL.filter((p) => !localOnly(p.id, p.preset))
const SKIPPED = ALL.filter((p) => !PRESETS.includes(p)).map((p) => localOnlyNote(p.id, p.preset))

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
  test(`frames @ ${c.name}`, async ({ browser }) => {
    for (const description of SKIPPED) test.info().annotations.push({ type: 'skipped preset', description })
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'frames')
    let fails: Row[] = []
    try {
      for (const { id, preset } of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?fx=${preset}`)
        const s = await markScope(page, `[data-viz="${id}"]`, 0, `fx-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `${id} ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `${id} ${preset}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      for (const { id, preset } of PRESETS.filter((p) => ['twoWay-next-arg', 'refill-on-settle', 'once-consumed-by-nested-emit'].includes(p.preset))) {
        await goto(page, c, `${BASE}/dev/visualizations?fx=${preset}`)
        const s = await markScope(page, `[data-viz="${id}"]`, 0, `pfx-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `${id} ${preset} print`, 'start', {}, `${id} ${preset} | print`)
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
