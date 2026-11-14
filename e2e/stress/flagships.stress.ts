import { expect, test, type Page } from '@playwright/test'
import { eventLoopDescriptor } from '../../src/components/visualizations/engines/event-loop/descriptor'
import { varVsLetLoop, factoryCallsVsAliases } from '../../src/components/visualizations/engines/env-records/presets/closures'
import { BASE, Recorder, type Row, failing, gated, activeConfigs, envDetectOptions, goto, markScope, openContext } from './harness'
import { answersOf, walkListKeys, walkStepThrough } from './flows'

/**
 * The three flagships on /dev/visualizations across the tier's configs:
 * - every preset (switched with the control that shows) and every step,
 *   walked three times per preset: checkpoints answered right, wrong and
 *   skipped;
 * - list keys: every key x action, answered or skipped, plus the wrapper
 *   scene by pointer and by keyboard;
 * - the closures figures (server SVG);
 * - hover: each control hovered, detectors run, the frame must not move;
 * - print emulation: the light rendering of each visual through the same
 *   detectors (contrast on paper included).
 * Strict by default (STRESS_STRICT=0 records only).
 */

const ENV_OPTS = envDetectOptions([varVsLetLoop.data, factoryCallsVsAliases.data])
const EL_ANSWERS = answersOf(eventLoopDescriptor.presets)

/** Hovers every visible control of the visual and checks each hovered state. */
async function hoverPass(page: Page, rec: Recorder, scope: string, visual: string) {
  const n = await page.evaluate((s) => {
    const root = document.querySelector(s)!
    const ctl = [...root.querySelectorAll('button, [role="radio"], [role="slider"], summary, select, label:has(input), svg [tabindex]')].filter(
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
  test(`flagships @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(10 * 60_000)
    const { ctx, page } = await openContext(browser, c)
    const rec = new Recorder(c, 'flagships')
    let fails: Row[] = []
    try {
      // Event loop: both presets, every step, three answer policies.
      await goto(page, c, `${BASE}/dev/visualizations`)
      const el = await markScope(page, '[data-viz="event-loop"]', 0, 'el')
      await page.locator(el!).scrollIntoViewIfNeeded()
      await page.locator(el!).hover()
      await walkStepThrough(page, rec, el!, 'event-loop', {}, EL_ANSWERS)
      await hoverPass(page, rec, el!, 'event-loop')

      // List keys: every key x action, pick / ask / reveal.
      const lk = await markScope(page, '[data-viz="list-keys"]', 0, 'lk')
      await page.locator(lk!).scrollIntoViewIfNeeded()
      await page.locator(lk!).hover()
      await walkListKeys(page, rec, lk!, 'list-keys')
      await hoverPass(page, rec, lk!, 'list-keys')

      // Text-only zoom: does the visual's text follow the root font size? (N5: real selectors.)
      if (c.rootFont) {
        const sizes = await page.evaluate(() => {
          const px = (sel: string) => {
            const e = document.querySelector(sel)
            return e ? getComputedStyle(e).fontSize : null
          }
          return {
            prose: px('[data-viz="event-loop"] + p'),
            caption: px('[data-viz="event-loop"] [data-viz-part="viz-caption"], [data-viz="event-loop"] [data-viz-region="dock"] p'),
            code: px('[data-viz="event-loop"] [data-viz-region="code"] code'),
            title: px('[data-viz="event-loop"] header p'),
            listKeysCard: px('[data-viz="list-keys"] [data-row]'),
          }
        })
        rec.note('all v2 visuals', 'text zoom', 'text-zoom', `root font ${c.rootFont}: prose ${sizes.prose}, caption ${sizes.caption}, code ${sizes.code}, title ${sizes.title}, list-keys card ${sizes.listKeysCard}`, sizes)
      }

      await goto(page, c, `${BASE}/dev/visualizations?lk=parent-type-change`)
      const lkw = await markScope(page, '[data-viz="list-keys"]', 0, 'lkw')
      await page.locator(lkw!).scrollIntoViewIfNeeded()
      await page.locator(lkw!).hover()
      await walkListKeys(page, rec, lkw!, 'list-keys wrapper', true)

      // Environment records: both presets, server SVG.
      await goto(page, c, `${BASE}/dev/visualizations?static=1`)
      for (const [i, id] of ['var-vs-let-loop', 'factory-calls-vs-aliases'].entries()) {
        const s = await markScope(page, '[data-viz="environment-records"]', i, `er${i}`)
        await rec.check(page, s!, `environment-records ${id}`, 'static', ENV_OPTS, `environment-records ${id}`)
        await hoverPass(page, rec, s!, `environment-records ${id}`)
      }

      // Print: the light rendering through the same detectors (R10).
      await page.emulateMedia({ media: 'print' })
      await goto(page, c, `${BASE}/dev/visualizations`)
      for (const v of ['event-loop', 'list-keys']) {
        const s = await markScope(page, `[data-viz="${v}"]`, 0, `print-${v}`)
        await page.locator(s!).scrollIntoViewIfNeeded()
        await page.waitForSelector(`${s} section[data-viz-interactive="true"]`, { timeout: 30_000 })
        await rec.check(page, s!, `${v} print`, 'start', {}, `${v} | print`)
      }
      await goto(page, c, `${BASE}/dev/visualizations?static=1`)
      for (const [i, id] of ['var-vs-let-loop', 'factory-calls-vs-aliases'].entries()) {
        const s = await markScope(page, '[data-viz="environment-records"]', i, `per${i}`)
        await rec.check(page, s!, `environment-records ${id} print`, 'static', ENV_OPTS, `environment-records ${id} | print`)
      }
      await page.emulateMedia({ media: 'screen' })
    } finally {
      // Mark pending-decision rows before writing, so the JSON says which ones they are.
      fails = failing(rec.rows.filter((r) => r.detector !== 'text-zoom'), (id, n) =>
        test.info().annotations.push({ type: `pending decision (${id})`, description: `${c.name}: ${n} rows` }),
      )
      rec.write()
      await ctx.close()
    }
    if (gated(c)) expect(fails.map((r) => `${r.detector} ${r.visual} [${r.state}] ${r.msg}`)).toEqual([])
  })
}
