import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { dpTableDescriptor } from '../src/components/visualizations/engines/dp-table/descriptor'
import type { DPState } from '../src/components/visualizations/engines/dp-table/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The dp-table step-through (R4 shared visual 6, wave 3A) through the real
 * `<Viz>` mount on `/dev/visualizations?dp=<preset>`: every step drawn from
 * its recorded state (each cell's value, the index tag on the cell written,
 * the read tag and the arrow from the cell read, the "this item" bars), the
 * frame never moving while stepping (zero layout shift), each prediction
 * asked on the step before its reveal, keyboard only, axe clean, a complete
 * Start frame without JavaScript, the lazy reserve per preset (and under
 * text zoom), and the phone fit: at 375x667 the code line, the changed
 * glyphs, the caption and Next on one screen at every step, every choice on
 * one line.
 *
 * Both presets show a practice answer: local-only (e2e/premium.ts). On CI
 * (free samples only) every test here skips, saying why.
 */

const ID = 'dp-table-dependencies'
const STEP = `[data-viz="${ID}"] section`
const STEPS = VIZ_TABLE[ID][4]!
const PRESETS = dpTableDescriptor.presets.map((p) => p.id)
const skipped = (preset: string) => {
  if (!localOnly(ID, preset)) return false
  test.info().annotations.push({ type: 'skipped preset', description: localOnlyNote(ID, preset) })
  return true
}

let errors: string[] = []
test.beforeEach(({ page }) => {
  errors = []
  page.on('console', (m) => {
    if (m.type() === 'error' && !/api\/auth|Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
})
test.afterEach(() => {
  expect(errors, 'no console errors or hydration warnings').toEqual([])
})

async function openStep(page: Page, preset: string, width = 1024, height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto(`/dev/visualizations?dp=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws, read from the svg and the heading. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => {
    const svg = f.querySelector('[data-viz-part="dp-table"]')!
    // A tag fading out (a ghost) is not the state.
    const tags = Object.fromEntries([...svg.querySelectorAll('[data-tag]')].map((t) => [t.getAttribute('data-tag-name'), t.getAttribute('data-at')]))
    const arc = svg.querySelector('[data-viz-part="arc"]')
    return {
      cells: [...svg.querySelectorAll('[data-cell]')].map((c) => c.getAttribute('data-value')),
      tags,
      arc: arc ? `${arc.getAttribute('data-from')}->${arc.getAttribute('data-to')}` : null,
      bars: [...svg.querySelectorAll('[data-bar]')].map((b) => b.getAttribute('data-bar')),
      changed: [...svg.querySelectorAll('[data-cell][data-changed]')].map((c) => c.getAttribute('data-cell')),
      item: f.querySelector('[data-glyph="item"]')?.textContent ?? null,
    }
  })

const want = (s: DPState) => ({
  cells: s.f.map(String),
  tags: s.j === null ? {} : { [s.names.index]: `cell-${s.j}`, [`${s.names.index} - ${s.names.item}`]: `cell-${s.read}` },
  arc: s.j === null ? null : `cell-${s.read}->cell-${s.j}`,
  bars: s.pass.map((i) => `cell-${i}`),
  changed: s.j === null ? [] : [`cell-${s.j}`],
  item: s.x === null ? '–' : String(s.x),
})

for (const p of dpTableDescriptor.presets)
  test(`${p.id}: every step draws its recorded state, both ways, and the frame never moves`, async ({ page }) => {
    test.skip(localOnly(ID, p.id), localOnlyNote(ID, p.id))
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const f = await openStep(page, p.id)
    const box0 = await f.boundingBox()
    const next = page.locator('p', { hasText: 'Text after the visual' })
    const after0 = (await next.boundingBox())!.y
    await f.getByRole('slider').focus()
    const log = p.log
    const expectStep = async (i: number) => {
      await expect.poll(() => drawn(page), { message: `${p.id} step ${i}` }).toEqual(want(log.steps[i].state))
      expect(await f.getAttribute('data-viz-step')).toBe(String(i))
    }
    await expectStep(0)
    const asks = new Set(log.checkpoints.map((c) => c.beforeStep - 1))
    for (let i = 1; i < log.steps.length; i++) {
      if ((await f.getAttribute('data-viz-mode')) === 'ask') {
        expect(asks.has(i - 1), `asked on step ${i - 1}`).toBe(true)
        await page.keyboard.press('1')
        await page.waitForTimeout(100)
        if ((await f.getAttribute('data-viz-step')) === String(i)) {
          await expectStep(i)
          continue
        }
      }
      await page.keyboard.press('ArrowRight')
      await expectStep(i)
    }
    for (let i = log.steps.length - 2; i >= 0; i--) {
      await page.keyboard.press('ArrowLeft')
      await expectStep(i)
    }
    // Zero layout shift: the frame and the text after it are where they were.
    expect(await f.boundingBox()).toEqual(box0)
    expect((await next.boundingBox())!.y).toBe(after0)
    // The output is the run's own.
    await page.keyboard.press('End')
    await expect(f.locator('[data-out]')).toHaveText(`› ${log.observed.log!.join(' ')}`)
  })

test('j upward: asked before f[2] is written, with f[1] already barred; the reveal reads it and f[4] ends true', async ({ page }) => {
  test.skip(localOnly(ID, 'knapsack-1d-asc'), localOnlyNote(ID, 'knapsack-1d-asc'))
  const f = await openStep(page, 'knapsack-1d-asc')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('f[1] was just set for item 1. What does f[2] become?')
  expect((await drawn(page)).bars).toEqual(['cell-1'])
  await page.keyboard.press('1')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  expect([d.arc, d.cells[2]]).toEqual(['cell-1->cell-2', 'true'])
  await expect(f.locator('[data-viz-part="arc"]')).toHaveAttribute('data-reused', 'true')
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('› true')
})

test('one switcher for the lesson; j downward locks in a prediction and returns false', async ({ page }) => {
  test.skip(localOnly(ID, 'knapsack-1d-desc-vs-asc'), localOnlyNote(ID, 'knapsack-1d-desc-vs-asc'))
  const f = await openStep(page, 'knapsack-1d-desc-vs-asc')
  await expect(f.getByRole('radio', { name: 'j upward' })).toHaveCount(1)
  await expect(f).toHaveAttribute('data-viz-mode', 'ask')
  await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
  await f.getByRole('slider').focus()
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('› false')
  // Downward never draws an arrow out of a barred cell.
  await f.getByRole('radio', { name: 'j upward' }).click()
  await expect(f).toHaveAttribute('data-viz-preset', 'knapsack-1d-asc')
})

// The flagship's phone fit (Q15): at 375×667, with the code pane scrolled to just under the site header,
// the current line, the changed glyphs, the drawing, the caption and Next are all on screen, at every step
// of every preset, and every choice label stays on one line. The gallery page has no site header, so the
// lesson page's (56 px, fixed) is reserved: as strict as a lesson.
const LESSON_HEADER = 56
test('375×667: code line, changed glyphs, drawing, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of PRESETS) {
    if (skipped(preset)) continue
    const f = await openStep(page, preset, 375, 667)
    await f.getByRole('slider').focus()
    for (let i = 0; i <= 30; i++) {
      const v = await page.evaluate(([sel, reserve]) => {
        const root = document.querySelector(sel)!
        const header = [...document.querySelectorAll('div.fixed')]
          .map((e) => e.getBoundingClientRect())
          .find((r) => r.top <= 0 && r.height > 30 && r.height < 120)
        const top = header ? header.bottom : reserve
        window.scrollBy(0, root.querySelector('[data-viz-region="code"]')!.getBoundingClientRect().top - top - 8)
        const visible = (el: Element | null) => {
          if (!el) return true
          const r = el.getBoundingClientRect()
          return r.top >= top - 0.5 && r.bottom <= window.innerHeight + 0.5
        }
        const wrapped = [...root.querySelectorAll('[data-viz-part="viz-checkpoint"] [role="radio"] [data-choice-slot] + span')]
          .filter((l) => l.getBoundingClientRect().height > parseFloat(getComputedStyle(l).lineHeight) + 0.5)
          .map((l) => l.textContent)
        return {
          oneLineChoices: wrapped.length ? wrapped : true,
          line: visible(root.querySelector('[aria-current="true"]')),
          changed: [...root.querySelectorAll('[data-focus], [data-changed]')].every(visible),
          drawing: visible(root.querySelector('[data-viz-part="dp-table"]')),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
          step: root.getAttribute('data-viz-step'),
          mode: root.getAttribute('data-viz-mode'),
          end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
        }
      }, [STEP, LESSON_HEADER] as const)
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, line: true, changed: true, drawing: true, caption: true, next: true })
      if (end) break
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('the frame stays within about 850 px at 375 on every preset', async ({ page }) => {
  for (const p of PRESETS) {
    if (skipped(p)) continue
    const f = await openStep(page, p, 375)
    expect((await f.boundingBox())!.height, p).toBeLessThanOrEqual(850)
  }
})

test('axe: no violations on the step-through', async ({ page }) => {
  for (const p of PRESETS) {
    if (skipped(p)) continue
    await openStep(page, p)
    const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
})

test('the machine is named in words: every cell, the item and where the write read', async ({ page }) => {
  test.skip(localOnly(ID, 'knapsack-1d-asc'), localOnlyNote(ID, 'knapsack-1d-asc'))
  const f = await openStep(page, 'knapsack-1d-asc')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('1')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('f[0] true, f[1] true, f[2] true, f[3] false, f[4] false')
  expect(label).toContain('x is 1.')
  expect(label).toContain('f[2] was written from f[1], which this item already wrote')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  test.skip(localOnly(ID, 'knapsack-1d-desc-vs-asc'), localOnlyNote(ID, 'knapsack-1d-desc-vs-asc'))
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?dp=knapsack-1d-desc-vs-asc', { waitUntil: 'load' })
  const svg = page.locator('[data-viz-part="dp-table"]')
  await expect(svg.locator('[data-cell]')).toHaveCount(5)
  await expect(svg.locator('[data-cell][data-value="true"]')).toHaveCount(1)
  await expect(page.locator(STEP)).toHaveAttribute('data-viz-interactive', 'false')
  expect((await page.locator(STEP).boundingBox())!.height).toBeLessThanOrEqual(STEPS['knapsack-1d-desc-vs-asc'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of PRESETS)
    for (const width of [375, 1024]) {
      if (skipped(preset)) continue
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?dp=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
      const mount = page.locator(`[data-viz="${ID}"]`)
      const placeholder = mount.locator('[data-viz-placeholder]')
      await expect(placeholder).toHaveCount(1)
      const h = STEPS[preset][width < 768 ? 0 : 1]
      expect((await placeholder.boundingBox())!.height, `${preset} @${width}`).toBe(h)
      await mount.scrollIntoViewIfNeeded()
      await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
      expect((await page.locator(STEP).boundingBox())!.height, `${preset} @${width}`).toBeLessThanOrEqual(h)
    }
})

test('lazy mount under text zoom: the placeholder reserves at least the live frame (Q16)', async ({ page }) => {
  test.skip(localOnly(ID, 'knapsack-1d-asc'), localOnlyNote(ID, 'knapsack-1d-asc'))
  for (const [width, zoom] of [
    [375, 150],
    [320, 150],
    [1280, 200],
    [768, 125],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript((z) => {
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style')
        st.textContent = `html{font-size:${z}% !important}`
        document.head.append(st)
      })
    }, zoom)
    await page.goto('/dev/visualizations?dp=knapsack-1d-asc&spacer=1&mount=client')
    const mount = page.locator(`[data-viz="${ID}"]`)
    const placeholder = mount.locator('[data-viz-placeholder]')
    await expect(placeholder).toHaveCount(1)
    const reserved = (await placeholder.boundingBox())!.height
    await mount.scrollIntoViewIfNeeded()
    await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
    const live = (await page.locator(STEP).boundingBox())!.height
    expect(reserved, `${width} at ${zoom} %: reserve ${reserved} vs live ${live}`).toBeGreaterThanOrEqual(live - 0.5)
  }
})
