import { expect, test, type Page } from '@playwright/test'
import { slidingWindowDescriptor } from '../../src/components/visualizations/engines/sliding-window/descriptor'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, goto, markScope, openContext } from './harness'
import { answersOf, walkStepThrough } from './flows'
import { localOnly, localOnlyNote } from '../premium'

/**
 * The sliding-window step-through (wave 2C) across the tier's configs, as
 * the flagships are: each lesson group's presets, every step, walked with
 * checkpoints answered right, wrong and skipped; every control hovered; and
 * the print rendering through the same detectors. Strict by default.
 */

const ANSWERS = answersOf(slidingWindowDescriptor.presets)
const ID = 'sliding-window'
const ALL = slidingWindowDescriptor.presets.map((p) => p.id)
/** The Strings presets show a practice answer: local-only, walked only where the content checkout has it (never CI). */
const PRESETS = ALL.filter((p) => !localOnly(ID, p))
const SKIPPED = ALL.filter((p) => !PRESETS.includes(p)).map((p) => localOnlyNote(ID, p))

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
  test(`sliding window @ ${c.name}`, async ({ browser }) => {
    for (const description of SKIPPED) test.info().annotations.push({ type: 'skipped preset', description })
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'sliding-window')
    let fails: Row[] = []
    try {
      for (const preset of PRESETS) {
        await goto(page, c, `${BASE}/dev/visualizations?sw=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `sw-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.locator(s!).hover()
        await walkStepThrough(page, rec, s!, `sliding-window ${preset}`, {}, ANSWERS)
        await hoverPass(page, rec, s!, `sliding-window ${preset}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      for (const preset of PRESETS.filter((p) => p === 'araaci-k2' || p === 'set-shrink-longest-substring')) {
        await goto(page, c, `${BASE}/dev/visualizations?sw=${preset}`)
        const s = await markScope(page, `[data-viz="${ID}"]`, 0, `psw-${preset}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `sliding-window ${preset} print`, 'start', {}, `sliding-window ${preset} | print`)
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
