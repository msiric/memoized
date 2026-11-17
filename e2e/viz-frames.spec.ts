import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { FRAMES_VIZ, framesVizFor } from '../src/components/visualizations/engines/frames/gallery'
import type { FState } from '../src/components/visualizations/engines/frames/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The frames step-throughs (wave 3C: generator frames, the mapLimit worker
 * pool, reentrant emit) through the real `<Viz>` mount on
 * `/dev/visualizations?fx=<preset>`: every step draws its recorded lanes,
 * chips, readouts and printed lines both ways with the frame and the text
 * after it fixed; each prediction is asked on the step before its reveal;
 * keyboard only, axe clean, a complete Start frame without JavaScript, the
 * lazy reserve per preset (and under text zoom), frames within about 850 px
 * at 375, and the 375x667 fit: the code line, the changed chips, the lanes,
 * the caption and Next on one screen at every step, every choice on one
 * line, with the lesson's site header reserved.
 *
 * Every frame of these visuals shows a practice answer's lines (or sits in
 * a group that does): local-only (e2e/premium.ts).
 */

const PRESETS = FRAMES_VIZ.flatMap((d) => d.presets.map((p) => ({ id: d.id, preset: p.id, log: p.log })))
const STEP = (id: string) => `[data-viz="${id}"] section`
const skipped = (id: string, preset: string) => {
  if (!localOnly(id, preset)) return false
  test.info().annotations.push({ type: 'skipped preset', description: localOnlyNote(id, preset) })
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
  const id = framesVizFor(preset)!
  await page.setViewportSize({ width, height })
  await page.goto(`/dev/visualizations?fx=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP(id)}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP(id))
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws: each lane's chips (a chip on its way out is not the state), the readouts, the output. */
const drawn = (page: Page, id: string) =>
  page.locator(STEP(id)).evaluate((f) => {
    const lanes = Object.fromEntries(
      [...f.querySelectorAll('[role="img"] [data-viz-region]')]
        .filter((r) => !['readouts', 'console'].includes(r.getAttribute('data-viz-region')!))
        .map((r) => [r.getAttribute('data-viz-region'), [...r.querySelectorAll('[data-chip]')].filter((c) => !c.closest('[data-motion-pop-id]')).map((c) => c.textContent!.trimEnd())]),
    )
    const vars = [...f.querySelectorAll('[data-var]')].map((v) => v.textContent)
    const out = [...f.querySelectorAll('[data-out]')].filter((o) => !o.closest('[data-motion-pop-id]')).map((o) => o.textContent)
    return { lanes, vars, out }
  })

const want = (s: FState) => ({
  // A status chip is padded with no-break spaces to its preset's widest label.
  lanes: Object.fromEntries(s.lanes.map((l) => [`fx-${l.id}`, l.chips.map((c) => c.label.trimEnd())])),
  vars: s.vars.map((v) => `${v.name}${v.value}`),
  out: s.output.map((o) => `› ${o}`),
})

for (const { id, preset, log } of PRESETS)
  test(`${id}/${preset}: every step draws its recorded state, both ways, and the frame never moves`, async ({ page }) => {
    test.skip(localOnly(id, preset), localOnlyNote(id, preset))
    test.setTimeout(120_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const f = await openStep(page, preset)
    const box0 = await f.boundingBox()
    const after = page.locator('p', { hasText: 'Text after the visual' })
    const after0 = (await after.boundingBox())!.y
    await f.getByRole('slider').focus()
    const expectStep = async (i: number) => {
      await expect.poll(() => drawn(page, id), { message: `${preset} step ${i}` }).toEqual(want(log.steps[i].state))
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
    expect((await after.boundingBox())!.y).toBe(after0)
  })

test('twoWay: asked before next(10); 10 becomes x and 99 was dropped', async ({ page }) => {
  test.skip(localOnly('generator-frames', 'twoWay-next-arg'), localOnlyNote('generator-frames', 'twoWay-next-arg'))
  const f = await openStep(page, 'twoWay-next-arg')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('next(10) resumes g. What is x?')
  // On the question's step g is paused at its first yield and x does not exist yet.
  expect((await drawn(page, 'generator-frames')).lanes['fx-g']).toEqual(['paused at 2'])
  await page.keyboard.press('1')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  expect((await drawn(page, 'generator-frames')).lanes['fx-g']).toEqual(['running', 'x = 10'])
  await expect(f.locator('[data-out]').last()).toHaveText('› got: 10')
})

test('mapLimit: the free worker claims index 2 while a is still in flight, and results stay in input order', async ({ page }) => {
  test.skip(localOnly('worker-pool', 'refill-on-settle'), localOnlyNote('worker-pool', 'refill-on-settle'))
  const f = await openStep(page, 'refill-on-settle')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  // Asked once index 1 has settled: B is already in slot 1.
  expect((await drawn(page, 'worker-pool')).lanes['fx-results']).toEqual(['0: _', '1: B', '2: _', '3: _'])
  await page.keyboard.press('1')
  const d = await drawn(page, 'worker-pool')
  expect(d.lanes['fx-worker-0']).toEqual(['awaiting', '0: a'])
  expect(d.lanes['fx-worker-1']).toEqual(['awaiting', '2: c'])
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText("› [ 'A', 'B', 'C', 'D' ]")
})

test('emit: the outer emit skips the once record the nested emit consumed', async ({ page }) => {
  test.skip(localOnly('emit-frames', 'once-consumed-by-nested-emit'), localOnlyNote('emit-frames', 'once-consumed-by-nested-emit'))
  const f = await openStep(page, 'once-consumed-by-nested-emit')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('emit 1 reaches O. Does once run?')
  await page.keyboard.press('1')
  const d = await drawn(page, 'emit-frames')
  expect(d.lanes['fx-emit-1']).toEqual(['skipped', 'A', 'O'])
  expect(d.lanes['fx-records']).toEqual(['A'])
  expect(d.lanes['fx-order']).toEqual(["'outer'", "'inner'", "'once'"])
})

// The flagship's phone fit (Q15): at 375×667, with the code pane scrolled to just under the site header,
// the current line, the changed chips, the lanes, the caption and Next are all on screen, at every step of
// every preset, and every choice label stays on one line. The gallery page has no site header, so the
// lesson page's (56 px, fixed) is reserved: as strict as a lesson.
const LESSON_HEADER = 56
test('375×667: code line, changed chips, lanes, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(300_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const { id, preset } of PRESETS) {
    if (skipped(id, preset)) continue
    const f = await openStep(page, preset, 375, 667)
    await f.getByRole('slider').focus()
    for (let i = 0; i <= 30; i++) {
      const v = await page.evaluate(
        ([sel, reserve]) => {
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
            changed: [...root.querySelectorAll('[data-focus]')].every(visible),
            lanes: visible(root.querySelector('[role="img"]')),
            caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
            next: visible(root.querySelector('[data-viz-part="viz-next"]')),
            step: root.getAttribute('data-viz-step'),
            mode: root.getAttribute('data-viz-mode'),
            end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
          }
        },
        [STEP(id), LESSON_HEADER] as const,
      )
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, line: true, changed: true, lanes: true, caption: true, next: true })
      if (end) break
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('the frame stays within about 850 px at 375 on every preset', async ({ page }) => {
  for (const { id, preset } of PRESETS) {
    if (skipped(id, preset)) continue
    const f = await openStep(page, preset, 375)
    expect((await f.boundingBox())!.height, preset).toBeLessThanOrEqual(850)
  }
})

test('axe: no violations on the step-throughs', async ({ page }) => {
  for (const preset of ['twoWay-next-arg', 'refill-on-settle', 'once-consumed-by-nested-emit']) {
    const id = framesVizFor(preset)!
    if (skipped(id, preset)) continue
    await openStep(page, preset)
    const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
})

test('the machine is named in words: each lane and what it holds', async ({ page }) => {
  test.skip(localOnly('generator-frames', 'take-closes-source'), localOnlyNote('generator-frames', 'take-closes-source'))
  const f = await openStep(page, 'take-closes-source')
  await f.getByRole('slider').focus()
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('pulled 1, closed 0')
  expect(label).toContain('source(), holding paused at 22')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  test.skip(localOnly('worker-pool', 'refill-on-settle'), localOnlyNote('worker-pool', 'refill-on-settle'))
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?fx=refill-on-settle', { waitUntil: 'load' })
  const f = page.locator(STEP('worker-pool'))
  await expect(f.locator('[data-viz-region="fx-results"] [data-chip]')).toHaveCount(4)
  await expect(f.locator('[data-viz-region="fx-worker-0"] [data-chip]')).toHaveText([/^not started/])
  await expect(f).toHaveAttribute('data-viz-interactive', 'false')
  expect((await f.boundingBox())!.height).toBeLessThanOrEqual(VIZ_TABLE['worker-pool'][4]!['refill-on-settle'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of ['twoWay-next-arg', 'lazy-pipeline-pull', 'fixed-batches-contrast', 'removed-before-turn'])
    for (const width of [375, 1024]) {
      const id = framesVizFor(preset)!
      if (skipped(id, preset)) continue
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?fx=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
      const mount = page.locator(`[data-viz="${id}"]`)
      const placeholder = mount.locator('[data-viz-placeholder]')
      await expect(placeholder).toHaveCount(1)
      const h = VIZ_TABLE[id][4]![preset][width < 768 ? 0 : 1]
      expect((await placeholder.boundingBox())!.height, `${preset} @${width}`).toBe(h)
      await mount.scrollIntoViewIfNeeded()
      await expect(page.locator(`${STEP(id)}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
      expect((await page.locator(STEP(id)).boundingBox())!.height, `${preset} @${width}`).toBeLessThanOrEqual(h)
    }
})

test('lazy mount under text zoom: the placeholder reserves at least the live frame (Q16)', async ({ page }) => {
  test.skip(localOnly('worker-pool', 'refill-on-settle'), localOnlyNote('worker-pool', 'refill-on-settle'))
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
    await page.goto('/dev/visualizations?fx=refill-on-settle&spacer=1&mount=client')
    const mount = page.locator('[data-viz="worker-pool"]')
    const placeholder = mount.locator('[data-viz-placeholder]')
    await expect(placeholder).toHaveCount(1)
    const reserved = (await placeholder.boundingBox())!.height
    await mount.scrollIntoViewIfNeeded()
    await expect(page.locator(`${STEP('worker-pool')}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
    const live = (await page.locator(STEP('worker-pool')).boundingBox())!.height
    expect(reserved, `${width} at ${zoom} %: reserve ${reserved} vs live ${live}`).toBeGreaterThanOrEqual(live - 0.5)
  }
})
