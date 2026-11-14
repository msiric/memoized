import { expect, test, type Page } from '@playwright/test'

/**
 * Browsers without size container queries (Safari before 16, Firefox before
 * 110; H3 R2 Q17, R2 G5). Chromium cannot switch them off, so this emulates
 * one: every container is removed (no `@container` rule can match, as in a
 * browser that drops them), and the rules inside
 * `@supports not (container-type: inline-size)` are applied unconditionally
 * (in such a browser that condition is true). Then, at a phone and a desktop
 * width:
 *
 * - each control shows one face: the preset switcher, the list-keys key and
 *   action are their selects (no radiogroup beside a select);
 * - list keys stacks Before over After;
 * - the scrubber thumb sits on its step without `cqw`;
 * - nothing spills out of a frame, and stepping and answering still work.
 */

const GALLERY = '/dev/visualizations'
const EL = '[data-viz="event-loop"] section'
const LK = '[data-viz="list-keys"] section'

async function withoutContainerQueries(page: Page) {
  const applied = await page.evaluate(() => {
    const fallbacks: string[] = []
    const walk = (rules: CSSRuleList) => {
      for (const r of rules) {
        if (r instanceof CSSSupportsRule && /not\s*\(\s*container-type\s*:\s*inline-size\s*\)/.test(r.conditionText))
          fallbacks.push(...[...r.cssRules].map((x) => x.cssText))
        else if ('cssRules' in r && !(r instanceof CSSContainerRule)) walk((r as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules)
      } catch {
        /* cross-origin sheet */
      }
    }
    const st = document.createElement('style')
    st.id = 'no-container-queries'
    st.textContent = `*{container-type:normal!important;container-name:none!important}\n${fallbacks.join('\n')}`
    // Last in the document, as the fallbacks are last in their own sheets, so they win by order.
    document.body.append(st)
    return fallbacks.length
  })
  // The global fallback (segmented controls, the thumb) and list keys' own.
  expect(applied, 'the @supports fallbacks were found').toBeGreaterThanOrEqual(4)
}

async function open(page: Page, width: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width, height: 900 })
  await page.goto(GALLERY)
  for (const sel of [EL, LK]) {
    await page.locator(sel).scrollIntoViewIfNeeded()
    await expect(page.locator(`${sel}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 60_000 })
  }
  await withoutContainerQueries(page)
}

for (const width of [375, 1280])
  test(`without container queries @${width}: one control face, list keys stacks, the thumb is on its step`, async ({ page }) => {
    await open(page, width)
    const el = page.locator(EL)
    const lk = page.locator(LK)
    // Every segmented control shows only its select.
    for (const f of [el, lk]) {
      const segs = f.locator('[data-vz-seg]')
      for (let i = 0; i < (await segs.count()); i++) {
        await expect(segs.nth(i).locator(':scope > [role="radiogroup"]')).toBeHidden()
        await expect(segs.nth(i).locator(':scope > [data-vz-select]')).toBeVisible()
      }
    }
    // List keys stacks: the first After row starts under the last Before row.
    const cols = await lk.evaluate((f) => {
      const box = (s: string) => f.querySelector(s)!.getBoundingClientRect()
      return { before: box('[data-row="before-1"]'), after: box('[data-row="after-0"]') }
    })
    expect(cols.after.top, 'After sits under Before').toBeGreaterThanOrEqual(cols.before.bottom - 1)
    await lk.screenshot({ path: test.info().outputPath(`list-keys-no-cq-${width}.png`) })
    // The thumb sits on its step: step a few times and compare with the rail.
    await el.locator('[data-viz-region="dock"] [role="radio"]').nth(1).click()
    for (let i = 0; i < 3; i++) await el.getByRole('button', { name: 'Next' }).click()
    const thumb = await el.evaluate((f) => {
      const slider = f.querySelector('[role="slider"]')!
      const at = Number(slider.getAttribute('aria-valuenow'))
      const max = Number(slider.getAttribute('aria-valuemax'))
      const t = f.querySelector('[data-viz-part="scrubber-thumb"]')!.getBoundingClientRect()
      const rail = f.querySelector('[data-viz-part="scrubber-rail"]')!.getBoundingClientRect()
      return { at, max, centre: t.left + t.width / 2, left: rail.left, width: rail.width }
    })
    const want = thumb.left + (thumb.at / thumb.max) * thumb.width
    expect(Math.abs(thumb.centre - want), `thumb at ${thumb.centre}, step ${thumb.at} of ${thumb.max} is at ${want}`).toBeLessThanOrEqual(2)
    // Answering still works, and nothing spills out of either frame.
    await lk.locator('[data-viz-part="viz-skip"]').click()
    await expect(lk).toHaveAttribute('data-viz-mode', 'reveal')
    for (const f of [el, lk]) {
      const spill = await f.evaluate((frame) => {
        const fr = frame.getBoundingClientRect()
        return [...frame.querySelectorAll('*')]
          .filter((e) => {
            const r = e.getBoundingClientRect()
            const s = getComputedStyle(e)
            return r.width > 0 && s.visibility !== 'hidden' && s.display !== 'none' && (r.left < fr.left - 1 || r.right > fr.right + 1)
          })
          .map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('data-viz-part') ? `[${e.getAttribute('data-viz-part')}]` : ''}`)
          .slice(0, 5)
      })
      expect(spill, 'nothing spills out of the frame').toEqual([])
    }
  })
