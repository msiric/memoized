import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { slidingWindowDescriptor } from '../src/components/visualizations/engines/sliding-window/descriptor'
import { chipLabel } from '../src/components/visualizations/engines/sliding-window/layout'
import type { SWState } from '../src/components/visualizations/engines/sliding-window/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The sliding-window step-through (R4 shared visual 2, wave 2C) through the
 * real `<Viz>` mount on `/dev/visualizations?sw=<preset>`: every step drawn
 * from its recorded state (each edge on its cell, the band from one to the
 * other, the read cell dashed, the store's chips, the best length), the
 * frame never moving while stepping (zero layout shift), each prediction
 * asked on the step before its reveal, keyboard only, axe clean, a complete
 * Start frame without JavaScript, the lazy reserve per preset (and under
 * text zoom), and the phone fit: at 375x667 the code line, the changed
 * glyphs, the caption and Next on one screen at every step, every choice on
 * one line.
 *
 * The Strings presets show a practice answer: local-only (e2e/premium.ts).
 */

const ID = 'sliding-window'
const STEP = `[data-viz="${ID}"] section`
const STEPS = VIZ_TABLE[ID][4]!
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
  await page.goto(`/dev/visualizations?sw=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws, read from the svg, the store lane and the heading. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => {
    const svg = f.querySelector('[data-viz-part="window-strip"]')!
    const tags = Object.fromEntries([...svg.querySelectorAll('[data-tag]')].map((t) => [t.getAttribute('data-edge-name'), t.getAttribute('data-at')]))
    const band = svg.querySelector('[data-viz-part="window-band"]')
    const cells = [...svg.querySelectorAll('[data-cell]')]
    // A chip on its way out (fading) is not the state.
    const chips = [...f.querySelectorAll('[data-viz-region="store"] [data-chip]')]
      .filter((c) => !c.closest('[data-motion-pop-id]'))
      .map((c) => c.textContent)
    return {
      tags,
      // The band's span (its segments' group names its ends), and how many segments it draws.
      band: band?.hasAttribute('data-from') ? `${band.getAttribute('data-from')}..${band.getAttribute('data-to')}` : null,
      segments: band ? band.querySelectorAll('rect').length : 0,
      inside: cells.filter((c) => c.hasAttribute('data-in')).map((c) => c.getAttribute('data-cell')),
      read: cells.filter((c) => c.hasAttribute('data-read')).map((c) => c.getAttribute('data-cell')),
      chips,
      best: f.querySelector('[data-glyph="best"]')?.textContent ?? null,
    }
  })

const want = (s: SWState) => ({
  tags: { [s.names.left]: `cell-${s.left}`, ...(s.right === null ? {} : { [s.names.right]: `cell-${s.right}` }) },
  band: s.right === null ? null : `cell-${s.left}..cell-${s.right}`,
  segments: s.right === null ? 0 : s.right - s.left + 1,
  inside: s.right === null ? [] : Array.from({ length: s.right - s.left + 1 }, (_, k) => `cell-${s.left + k}`),
  read: s.pending && s.right !== null ? [`cell-${s.right}`] : [],
  chips: s.store.map(chipLabel),
  best: String(s.best),
})

for (const p of slidingWindowDescriptor.presets)
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

test('araaci-k2: the question comes while 3 keys remain, and windowStart stops at 2', async ({ page }) => {
  const f = await openStep(page, 'araaci-k2')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('Where does windowStart stop?')
  // On the question's step the window still holds a, r and c.
  expect((await drawn(page)).chips).toEqual(['a: 2', 'r: 1', 'c: 1'])
  await page.keyboard.press('1')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  expect(d.tags.windowStart).toBe('cell-2')
  expect(d.chips).toEqual(['a: 2', 'c: 1'])
})

test('araaci presets: one switcher for the lesson; the if run locks in a prediction and returns 4', async ({ page }) => {
  const f = await openStep(page, 'araaci-k2')
  await expect(f.getByRole('radio')).toHaveCount(2)
  await f.getByRole('radio', { name: 'if instead' }).click()
  await expect(f).toHaveAttribute('data-viz-preset', 'araaci-k2-if')
  // The prediction is asked at Start and judged at the end.
  await expect(f).toHaveAttribute('data-viz-mode', 'ask')
  await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').first().click()
  await f.getByRole('slider').focus()
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('› 4')
  // The window it ends on is still over K: 3 keys.
  expect((await drawn(page)).chips).toHaveLength(3)
})

test('strings presets: the answer resolves from the checkout, the switcher offers the four inputs, and abba with if returns 3', async ({ page }) => {
  test.skip(localOnly(ID, 'set-shrink-longest-substring'), localOnlyNote(ID, 'set-shrink-longest-substring'))
  const f = await openStep(page, 'set-shrink-longest-substring')
  // Four presets: the switcher is its select.
  await expect(f.locator('select')).toHaveCount(1)
  await f.locator('select').selectOption({ label: 'abba, if' })
  await expect(f).toHaveAttribute('data-viz-preset', 'set-shrink-abba-if')
  await f.locator('[data-viz-part="viz-checkpoint"] [role="radio"]').nth(1).click()
  await f.getByRole('slider').focus()
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('› 3')
  // The window holds b twice while ss holds one b.
  const d = await drawn(page)
  expect(d.inside).toEqual(['cell-1', 'cell-2', 'cell-3'])
  expect(d.chips).toEqual(['b', 'a'])
})

// The flagship's phone fit (Q15, owner ruling for wave 2): at 375×667, with the code pane scrolled to
// just under the site header, the current line, the changed glyphs, the drawing, the caption and Next are
// all on screen, at every step of every preset, and every choice label stays on one line. The gallery
// page has no site header, so the lesson page's (56 px, fixed) is reserved: as strict as a lesson.
const LESSON_HEADER = 56
test('375×667: code line, changed glyphs, drawing, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of slidingWindowDescriptor.presets.map((x) => x.id)) {
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
          drawing: visible(root.querySelector('[data-viz-part="window-strip"]')),
          store: visible(root.querySelector('[data-viz-region="store"]')),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
          step: root.getAttribute('data-viz-step'),
          mode: root.getAttribute('data-viz-mode'),
          end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
        }
      }, [STEP, LESSON_HEADER] as const)
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({
        oneLineChoices: true,
        line: true,
        changed: true,
        drawing: true,
        store: true,
        caption: true,
        next: true,
      })
      if (end) break
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('the frame stays within about 850 px at 375 on every preset', async ({ page }) => {
  for (const p of slidingWindowDescriptor.presets) {
    if (skipped(p.id)) continue
    const f = await openStep(page, p.id, 375)
    expect((await f.boundingBox())!.height, p.id).toBeLessThanOrEqual(850)
  }
})

test('axe: no violations on the step-through', async ({ page }) => {
  for (const p of ['araaci-k2', 'set-shrink-longest-substring']) {
    if (skipped(p)) continue
    await openStep(page, p)
    const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
})

test('the machine is named in words: the window, the store and the best length', async ({ page }) => {
  const f = await openStep(page, 'araaci-k2')
  await f.getByRole('slider').focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('The window is "araac"')
  expect(label).toContain('charFrequency holds a: 3, r: 1, c: 1 (3 keys, K is 2)')
  expect(label).toContain('maxLength is 4')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?sw=araaci-k2', { waitUntil: 'load' })
  const svg = page.locator('[data-viz-part="window-strip"]')
  await expect(svg.locator('[data-cell]')).toHaveCount(6)
  await expect(svg.locator('[data-edge-name="windowStart"]')).toHaveCount(1)
  await expect(page.locator(STEP)).toHaveAttribute('data-viz-interactive', 'false')
  expect((await page.locator(STEP).boundingBox())!.height).toBeLessThanOrEqual(STEPS['araaci-k2'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of ['araaci-k2', 'araaci-k2-if', 'set-shrink-abcabcbb'])
    for (const width of [375, 1024]) {
      if (skipped(preset)) continue
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?sw=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
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
    await page.goto('/dev/visualizations?sw=araaci-k2&spacer=1&mount=client')
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
