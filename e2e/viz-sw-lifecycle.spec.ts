import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { swDescriptor } from '../src/components/visualizations/engines/sw-lifecycle/descriptor'
import { SLOTS, TABS, tabText, workerLabel, type SwState } from '../src/components/visualizations/engines/sw-lifecycle/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The service-worker lifecycle step-through (wave 4E) through the real
 * `<Viz>` mount on `/dev/visualizations?swl=<preset>`: every step drawn from
 * its recorded state (each slot's worker, each tab's controller, the cache
 * names), the frame never moving while stepping (zero layout shift), each
 * prediction asked on the step before its reveal, keyboard only, axe clean, a
 * complete Start frame without JavaScript, the lazy reserve per preset (and
 * under text zoom), and the phone fit: at 375x667 the tabs, the slots, the
 * caption and Next on one screen at every step, every choice on one line.
 * The visual's own worker (no practice answer): every test runs on CI.
 */

const ID = 'sw-lifecycle'
const STEP = `[data-viz="${ID}"] section`
const STEPS = VIZ_TABLE[ID][4]!
const PRESETS = swDescriptor.presets.map((p) => p.id)

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
  await page.goto(`/dev/visualizations?swl=${preset}`, { waitUntil: 'load' })
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws: each slot's chips, each tab card's text, the caches. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => {
    const chips = (region: string) => [...f.querySelectorAll(`[data-viz-region="${region}"] [data-flip-id] [data-chip]`)].map((c) => c.textContent?.trim())
    return {
      slots: Object.fromEntries(['installing', 'waiting', 'active'].map((s) => [s, chips(`swl-${s}`)])),
      tabs: Object.fromEntries(['A', 'B'].map((t) => [t, f.querySelector(`[data-viz-region="swl-tab-${t}"] [data-glyph]`)?.textContent?.trim()])),
      caches: chips('swl-caches'),
    }
  })

const want = (s: SwState) => ({
  slots: Object.fromEntries(SLOTS.map((k) => [k, s.slots[k].map(workerLabel)])),
  tabs: Object.fromEntries(TABS.map((t) => [t, tabText(s.tabs[t])])),
  caches: [...s.caches],
})

for (const p of swDescriptor.presets)
  test(`${p.id}: every step draws its recorded state, both ways, and the frame never moves`, async ({ page }) => {
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
    expect(await f.boundingBox()).toEqual(box0)
    expect((await next.boundingBox())!.y).toBe(after0)
  })

test('update: asked on the waiting step; tab A stays with v1 after its reload and v2 still waits', async ({ page }) => {
  const f = await openStep(page, 'update-and-reload')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('Reload tab A. Who controls it then?')
  expect((await drawn(page)).slots.waiting).toEqual(['v2'])
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Not quite')
  await expect(f.locator('[data-viz-region="swl-tab-A"]')).toHaveAttribute('data-controller', 'v1')
  expect((await drawn(page)).slots.waiting).toEqual(['v2'])
  // The end: a new tab under v2, only v2-static left.
  await page.keyboard.press('End')
  await expect(f.locator('[data-viz-region="swl-tab-A"]')).toHaveAttribute('data-controller', 'v2')
  await expect.poll(async () => (await drawn(page)).caches).toEqual(['v2-static'])
})

test('skipWaiting: both open tabs move to v2 at activation; one switcher for the lesson', async ({ page }) => {
  const f = await openStep(page, 'skipWaiting')
  await expect(f.getByRole('radio', { name: 'First visit' })).toHaveCount(1)
  await f.getByRole('slider').focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-region="swl-tab-B"]')).toHaveAttribute('data-controller', 'v1')
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  for (const t of ['A', 'B']) await expect(f.locator(`[data-viz-region="swl-tab-${t}"]`)).toHaveAttribute('data-controller', 'v2')
  expect((await drawn(page)).slots.active).toEqual(['v2 activating'])
})

test('first visit: v1 activates and tab A stays uncontrolled until it reloads', async ({ page }) => {
  const f = await openStep(page, 'first-install-claim')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  await expect(f.locator('[data-viz-region="swl-tab-A"]')).toHaveAttribute('data-controller', 'none')
  await page.keyboard.press('End')
  await expect(f.locator('[data-viz-region="swl-tab-A"]')).toHaveAttribute('data-controller', 'v1')
})

// The phone fit (Q15): at 375×667, with the stage scrolled to just under the site header, the tabs, the
// changed glyphs, the slots, the caption and Next are all on screen at every step of every preset, and
// every choice label stays on one line. No code pane: the stage's top is the anchor. The gallery page has
// no site header, so the lesson page's (56 px, fixed) is reserved: as strict as a lesson.
const LESSON_HEADER = 56
test('375×667: tabs, slots, changed glyphs, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of PRESETS) {
    const f = await openStep(page, preset, 375, 667)
    await f.getByRole('slider').focus()
    for (let i = 0; i <= 20; i++) {
      const v = await page.evaluate(([sel, reserve]) => {
        const root = document.querySelector(sel)!
        const top = reserve
        window.scrollBy(0, root.querySelector('[data-viz-region="stage"]')!.getBoundingClientRect().top - top - 8)
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
          tabs: visible(root.querySelector('[data-viz-region="swl-tab-A"]')),
          changed: [...root.querySelectorAll('[data-focus]')].every(visible),
          slots: visible(root.querySelector('[data-viz-part="registration"]')),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
          step: root.getAttribute('data-viz-step'),
          mode: root.getAttribute('data-viz-mode'),
          end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
        }
      }, [STEP, LESSON_HEADER] as const)
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, tabs: true, changed: true, slots: true, caption: true, next: true })
      if (end) break
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('the frame stays within about 850 px at 375 on every preset', async ({ page }) => {
  for (const p of PRESETS) {
    const f = await openStep(page, p, 375)
    expect((await f.boundingBox())!.height, p).toBeLessThanOrEqual(850)
  }
})

test('axe: no violations on the step-through', async ({ page }) => {
  for (const p of PRESETS) {
    await openStep(page, p)
    const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
})

test('the machine is named in words: every tab, every slot, the caches', async ({ page }) => {
  const f = await openStep(page, 'skipWaiting')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('2')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('Tab A is controlled by v2, controllerchange fired once.')
  expect(label).toContain('active: v2 (activating)')
  expect(label).toContain('Redundant: v1.')
  expect(label).toContain('Cache Storage: v1-static, v2-static.')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?swl=update-and-reload', { waitUntil: 'load' })
  await expect(page.locator('[data-viz-region="swl-active"] [data-chip]')).toHaveText(['v1'])
  await expect(page.locator('[data-viz-region="swl-tab-B"]')).toHaveAttribute('data-controller', 'v1')
  await expect(page.locator(STEP)).toHaveAttribute('data-viz-interactive', 'false')
  expect((await page.locator(STEP).boundingBox())!.height).toBeLessThanOrEqual(STEPS['update-and-reload'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of PRESETS)
    for (const width of [375, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?swl=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
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
    await page.goto('/dev/visualizations?swl=update-and-reload&spacer=1&mount=client')
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
