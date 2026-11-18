import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { ssrDescriptor } from '../src/components/visualizations/engines/ssr-stream/descriptor'
import type { SSRState } from '../src/components/visualizations/engines/ssr-stream/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The streaming-SSR step-through (wave 4E) through the real `<Viz>` mount on
 * `/dev/visualizations?ssr=<preset>`: every step drawn from its recorded
 * state (each wire line, each slot's view and badge, the waiting click, the
 * handler log), the frame never moving while stepping, each prediction asked
 * on the step before its reveal, keyboard only, axe clean, a complete Start
 * frame without JavaScript, the lazy reserve per preset (and under text
 * zoom), and the phone fit: at 375x667 the changed glyphs, the caption and
 * Next on one screen at every step, every choice on one line.
 *
 * The app is the visual's own (no practice answer): every test runs in CI.
 */

const ID = 'ssr-stream'
const STEP = `[data-viz="${ID}"] section`
const STEPS = VIZ_TABLE[ID][4]!
const PRESETS = ssrDescriptor.presets.map((p) => p.id)

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
  await page.goto(`/dev/visualizations?ssr=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => ({
    wire: [...f.querySelectorAll('[data-wire-line]')].map((l) => l.getAttribute('data-wire-line')),
    ended: f.querySelectorAll('[data-wire-end]').length === 1,
    painted: f.querySelectorAll('[data-screen-blank]').length === 0,
    slots: Object.fromEntries([...f.querySelectorAll('[data-slot]')].map((s) => [s.getAttribute('data-slot'), `${s.getAttribute('data-view')} ${s.getAttribute('data-badge')}`])),
    click: f.querySelectorAll('[data-click]').length === 1,
    out: f.querySelector('[data-out]')?.textContent ?? null,
  }))

const want = (s: SSRState) => ({
  wire: s.wire.map((l) => l.text),
  ended: s.ended,
  painted: s.painted,
  slots: { product: `${s.slots.product.view} ${s.slots.product.badge}`, reviews: `${s.slots.reviews.view} ${s.slots.reviews.badge}` },
  click: s.pendingClick,
  out: s.output.length ? `› ${s.output.join(', ')}` : null,
})

for (const p of ssrDescriptor.presets)
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

test('streaming: "Which slot fills first?" is asked on the shell; the reveal shows Reviews hidden, then both fill at once', async ({ page }) => {
  const f = await openStep(page, 'two-boundary-stream')
  await f.getByRole('slider').focus()
  await page.keyboard.press('ArrowRight')
  await expect(f).toHaveAttribute('data-viz-mode', 'ask')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('Which slot fills first?')
  await page.keyboard.press('1')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Not quite')
  expect((await drawn(page)).slots).toEqual({ product: 'fallback fallback', reviews: 'fallback hidden' })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  expect((await drawn(page)).slots).toEqual({ product: 'content static', reviews: 'content static' })
})

test('streaming: the early click is replayed once after Reviews hydrates, ahead of Product', async ({ page }) => {
  const f = await openStep(page, 'two-boundary-stream')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 12; g++) {
    if ((await f.getAttribute('data-viz-mode')) === 'ask' && (await f.locator('[data-viz-part="viz-prompt"]').textContent())?.includes('click')) break
    await page.keyboard.press((await f.getAttribute('data-viz-mode')) === 'ask' ? '2' : 'ArrowRight')
  }
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('You click Helpful now. What happens?')
  expect((await drawn(page)).click).toBe(true)
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  expect([d.slots, d.out, d.click]).toEqual([{ product: 'content hydrating', reviews: 'content interactive' }, '› Helpful clicked', false])
})

test('one switcher for the lesson; renderToString sends one write at 120 ms', async ({ page }) => {
  const f = await openStep(page, 'two-boundary-stream')
  await f.getByRole('radio', { name: 'renderToString' }).click()
  await expect(f).toHaveAttribute('data-viz-preset', 'renderToString-contrast')
  await f.getByRole('slider').focus()
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  expect([d.wire.length, d.ended, d.painted]).toEqual([4, true, false])
})

// The phone fit (Q15): at 375×667, with the stage scrolled to just under the site header, the changed glyphs,
// the drawing, the caption and Next are all on screen at every step of every preset, and every choice label
// stays on one line. The gallery page has no site header, so the lesson page's (56 px, fixed) is reserved.
const LESSON_HEADER = 56
test('375×667: changed glyphs, drawing, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(240_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of PRESETS) {
    const f = await openStep(page, preset, 375, 667)
    await f.getByRole('slider').focus()
    for (let i = 0; i <= 20; i++) {
      const v = await page.evaluate(([sel, reserve]) => {
        const root = document.querySelector(sel)!
        const header = [...document.querySelectorAll('div.fixed')]
          .map((e) => e.getBoundingClientRect())
          .find((r) => r.top <= 0 && r.height > 30 && r.height < 120)
        const top = header ? header.bottom : reserve
        window.scrollBy(0, root.querySelector('[data-viz-region="wire"]')!.getBoundingClientRect().top - top - 8)
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
          changed: [...root.querySelectorAll('[data-focus], [data-changed]')].every(visible),
          drawing: visible(root.querySelector('[data-viz-region="screen"]')),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
          step: root.getAttribute('data-viz-step'),
          mode: root.getAttribute('data-viz-mode'),
          end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
        }
      }, [STEP, LESSON_HEADER] as const)
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, changed: true, drawing: true, caption: true, next: true })
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

test('the machine is named in words: the wire, each slot and its badge, the handler log', async ({ page }) => {
  const f = await openStep(page, 'two-boundary-stream')
  await f.getByRole('slider').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('2')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('<div hidden id="S:1">…</div>')
  expect(label).toContain('Reviews shows "Loading reviews" (HTML hidden)')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?ssr=two-boundary-stream', { waitUntil: 'load' })
  await expect(page.locator(`${STEP} [data-slot]`)).toHaveCount(2)
  await expect(page.locator(`${STEP} [data-screen-blank]`)).toHaveCount(1)
  await expect(page.locator(STEP)).toHaveAttribute('data-viz-interactive', 'false')
  expect((await page.locator(STEP).boundingBox())!.height).toBeLessThanOrEqual(STEPS['two-boundary-stream'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of PRESETS)
    for (const width of [375, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?ssr=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
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
    await page.goto('/dev/visualizations?ssr=two-boundary-stream&spacer=1&mount=client')
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
