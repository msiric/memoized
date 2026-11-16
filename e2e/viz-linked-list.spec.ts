import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { linkedListDescriptor } from '../src/components/visualizations/engines/linked-list/descriptor'
import { linkedListFramesDescriptor } from '../src/components/visualizations/engines/linked-list/frames/descriptor'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The pointer-rewiring visuals (R4 shared visual 3, wave 2B) through the
 * real `<Viz>` mount on `/dev/visualizations?ll=<preset>`:
 *
 * - the step-through: every step drawn from its recorded state (each tag
 *   on its node, each arrow to its target), the frame never moving while
 *   stepping (zero layout shift), the prediction asked on the step before
 *   the reveal, keyboard only, axe clean, a complete Start frame without
 *   JavaScript, the lazy reserve per preset;
 * - the static frames (`?ll=static`): final server SVG (no chunk on a hard
 *   load), the entry-table footprint at every width, nothing overflowing.
 */

const STEP = '[data-viz="linked-list-pointer-rewiring"] section'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const STEPS = VIZ_TABLE['linked-list-pointer-rewiring'][4]!
const FRAMES = VIZ_TABLE['linked-list-frames'][3]!
const tierOf = (width: number) => (width < 768 ? 0 : width < 1280 ? 1 : 2)
const figure = (page: Page, preset: string) => page.locator(`figure[data-viz-preset="${preset}"]`)
/** A palindrome frame shows a practice answer: local-only (no content checkout on CI). */
const ID = 'linked-list-pointer-rewiring'
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

async function openStep(page: Page, preset: string, width = 1024, query = '') {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`/dev/visualizations?ll=${preset}${query}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws: each tag's node and each arrow's target, read from the svg. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => {
    const svg = f.querySelector('[data-viz-region="list"] svg')!
    const tags = Object.fromEntries([...svg.querySelectorAll('[data-pointer]')].map((t) => [t.getAttribute('data-pointer'), t.getAttribute('data-at')]))
    // A leaving arrow (fading) is not the state: only the ones at full opacity.
    const links = Object.fromEntries(
      [...svg.querySelectorAll('[data-edge], [data-stub]')]
        .filter((e) => getComputedStyle(e).opacity === '1')
        .map((e) => [e.getAttribute('data-from'), e.getAttribute('data-to')]),
    )
    return { tags, links }
  })

for (const p of linkedListDescriptor.presets)
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
      const s = log.steps[i].state
      const want = {
        tags: Object.fromEntries(s.pointers.map((x) => [x.name, x.at === null ? 'null' : `n${x.at}`])),
        links: Object.fromEntries(s.next.map((t, k) => [`n${k}`, t === null ? 'null' : `n${t}`])),
      }
      await expect.poll(() => drawn(page), { message: `${p.id} step ${i}` }).toEqual(want)
      expect(await f.getAttribute('data-viz-step')).toBe(String(i))
    }
    await expectStep(0)
    const asks = new Set(log.checkpoints.map((c) => c.beforeStep - 1))
    for (let i = 1; i < log.steps.length; i++) {
      // A question open on this step: answer it (the first choice) before moving on.
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
    await expect(f.locator('[data-viz-region="list"] [data-glyph="output"]')).toHaveText(`› ${log.observed.log!.join(' ')}`)
  })

test('reverse-between: the prediction comes before the loop, and the loop is drawn', async ({ page }) => {
  const f = await openStep(page, 'reverse-between-m2-n4')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"], [data-viz-region="dock"]').first()).toContainText('what comes after 2')
  // On the question's step 1 still points to 2.
  expect((await drawn(page)).links.n0).toBe('n1')
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  // 1 -> 4 -> 3 -> 2 -> 1: the loop the reattach step breaks.
  expect([d.links.n0, d.links.n3, d.links.n2, d.links.n1]).toEqual(['n3', 'n2', 'n1', 'n0'])
})

test('palindrome presets: one switcher for the lesson, the question on the step before slow stops', async ({ page }) => {
  test.skip(localOnly(ID, 'palindrome-split-reverse-compare'), localOnlyNote(ID, 'palindrome-split-reverse-compare'))
  const f = await openStep(page, 'palindrome-split-reverse-compare')
  await expect(f.getByRole('radio')).toHaveCount(3)
  await f.getByRole('radio', { name: '1,2,2,1' }).click()
  await expect(f).toHaveAttribute('data-viz-preset', 'palindrome-1221')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  expect(await f.getAttribute('data-viz-step')).toBe('1')
  await page.keyboard.press('2')
  expect((await drawn(page)).tags.slow).toBe('n1')
})

// The flagship's phone fit (Q15, owner ruling for wave 2): at 375×667, with the code pane scrolled to
// just under the site header, the current line, the drawing, the caption and Next are all on screen,
// at every step of every preset, and every choice label stays on one line.
test('375×667: code line, drawing, caption and Next fit under the site header at every step', async ({ page }) => {
  test.setTimeout(180_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const preset of linkedListDescriptor.presets.map((x) => x.id)) {
    if (skipped(preset)) continue
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/dev/visualizations?ll=${preset}`, { waitUntil: 'load' })
    await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
    const f = page.locator(STEP)
    await f.scrollIntoViewIfNeeded()
    await f.getByRole('slider').focus()
    for (let i = 0; i <= 20; i++) {
      const v = await page.evaluate((sel) => {
        const root = document.querySelector(sel)!
        const header = [...document.querySelectorAll('div.fixed')]
          .map((e) => e.getBoundingClientRect())
          .find((r) => r.top <= 0 && r.height > 30 && r.height < 120)
        const top = header ? header.bottom : 0
        window.scrollBy(0, root.querySelector('[data-viz-region="code"]')!.getBoundingClientRect().top - top - 8)
        const visible = (el: Element | null) => {
          if (!el) return true
          const r = el.getBoundingClientRect()
          return r.top >= top - 0.5 && r.bottom <= window.innerHeight + 0.5
        }
        // Every choice label on one line (a label that wraps reads as two choices on a phone).
        const wrapped = [...root.querySelectorAll('[data-viz-part="viz-checkpoint"] [role="radio"] [data-choice-slot] + span')]
          .filter((l) => l.getBoundingClientRect().height > parseFloat(getComputedStyle(l).lineHeight) + 0.5)
          .map((l) => l.textContent)
        return {
          oneLineChoices: wrapped.length ? wrapped : true,
          line: visible(root.querySelector('[aria-current="true"]')),
          drawing: visible(root.querySelector('[data-viz-region="list"] svg')),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
          step: root.getAttribute('data-viz-step'),
          mode: root.getAttribute('data-viz-mode'),
          end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
        }
      }, STEP)
      const { step, mode, end, ...seen } = v
      expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, line: true, drawing: true, caption: true, next: true })
      if (end) break
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('axe: no violations on the step-through (every preset) and the frames', async ({ page }) => {
  for (const p of ['reverse-between-m2-n4', 'palindrome-split-reverse-compare']) {
    if (skipped(p)) continue
    await openStep(page, p)
    const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
  }
  await page.goto('/dev/visualizations?ll=static', { waitUntil: 'load' })
  const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([])
})

test('the machine is named in words: every link and pointer', async ({ page }) => {
  const f = await openStep(page, 'reverse-between-m2-n4')
  const label = await f.locator('[data-viz-region="list"]').getAttribute('aria-label')
  expect(label).toContain('1 points to 2')
  expect(label).toContain('head is on 1')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?ll=reverse-between-m2-n4', { waitUntil: 'load' })
  const svg = page.locator('[data-viz-region="list"] svg')
  await expect(svg.locator('[data-node]')).toHaveCount(6)
  await expect(svg.locator('[data-pointer="head"]')).toHaveCount(1)
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of ['reverse-between-m2-n4', 'palindrome-1231'])
    for (const width of [375, 1024]) {
      if (skipped(preset)) continue
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?ll=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
      const mount = page.locator('[data-viz="linked-list-pointer-rewiring"]')
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
    await page.goto('/dev/visualizations?ll=reverse-between-m2-n4&spacer=1&mount=client')
    const mount = page.locator('[data-viz="linked-list-pointer-rewiring"]')
    const placeholder = mount.locator('[data-viz-placeholder]')
    await expect(placeholder).toHaveCount(1)
    const reserved = (await placeholder.boundingBox())!.height
    await mount.scrollIntoViewIfNeeded()
    await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
    const live = (await page.locator(STEP).boundingBox())!.height
    expect(reserved, `${width} at ${zoom} %: reserve ${reserved} vs live ${live}`).toBeGreaterThanOrEqual(live - 0.5)
  }
})

test('static frames: a hard load ships no visualization JavaScript', async ({ page }) => {
  const scripts = new Set<string>()
  const on = (r: Request) => {
    if (r.resourceType() === 'script') scripts.add(new URL(r.url()).pathname)
  }
  page.on('request', on)
  await page.goto('/dev/visualizations?ll=static', { waitUntil: 'networkidle' })
  for (const p of linkedListFramesDescriptor.presets) await figure(page, p.id).scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  page.off('request', on)
  expect([...scripts].filter((u) => /linked-list|visualizations_engines/.test(u))).toEqual([])
  await expect(page.locator('[data-viz="linked-list-frames"] > [data-viz-ssr]')).toHaveCount(2)
})

test('static frames: the reserved footprint at every width, nothing outside its svg or stage', async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dev/visualizations?ll=static', { waitUntil: 'load' })
    for (const p of linkedListFramesDescriptor.presets) {
      expect((await figure(page, p.id).boundingBox())!.height, `${p.id} @${width}`).toBe(FRAMES[p.id][tierOf(width)])
      const out = await figure(page, p.id).evaluate((fig) => {
        const bad: string[] = []
        const st = fig.querySelector('[data-viz-region="stage"]')!.getBoundingClientRect()
        for (const s of fig.querySelectorAll<SVGSVGElement>('svg[data-viz-panel]')) {
          const r = s.getBoundingClientRect()
          const b = s.getBBox()
          if (r.left < st.left - 0.5 || r.right > st.right + 0.5 || r.bottom > st.bottom + 0.5) bad.push(`${s.dataset.vizPanel} leaves the stage`)
          if (b.x < -1 || b.y < -1 || b.x + b.width > s.viewBox.baseVal.width + 1 || b.y + b.height > s.viewBox.baseVal.height + 1)
            bad.push(`${s.dataset.vizPanel}: drawing outside its svg`)
        }
        for (const el of fig.querySelectorAll<HTMLElement>('[data-viz-section] > p'))
          if (el.scrollWidth > el.clientWidth + 1) bad.push(`truncated: ${el.textContent}`)
        return bad
      })
      expect(out, `${p.id} @${width}`).toEqual([])
    }
  }
})

test('static frames: client-only render reserves each preset footprint, then the same figure', async ({ page }) => {
  for (const width of [375, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dev/visualizations?ll=static&mount=client', { waitUntil: 'networkidle' })
    for (const p of linkedListFramesDescriptor.presets)
      expect((await figure(page, p.id).boundingBox())!.height, `${p.id} @${width}`).toBe(FRAMES[p.id][tierOf(width)])
  }
})
