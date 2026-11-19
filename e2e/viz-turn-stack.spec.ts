import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { turnStackDescriptor } from '../src/components/visualizations/engines/turn-stack/descriptor'
import { key, stackOf, type HullState } from '../src/components/visualizations/engines/turn-stack/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The convex-hull turn-stack step-through (R4 `monotone-chain-turn-pops`,
 * wave 4E) through the real `<Viz>` mount on `/dev/visualizations?ch=<preset>`:
 * every step drawn from its recorded state (each point's role, the stack's
 * polyline, the finished lower chain, the turn arrow and its value, the
 * joined hull), the frame never moving while stepping (zero layout shift),
 * each prediction asked on the step before its reveal, keyboard only, axe
 * clean, a complete Start frame without JavaScript, the lazy reserve per
 * preset (and under text zoom), and the phone fit: at 375x667 the code line,
 * the changed glyphs, the plot, the caption and Next on one screen at every
 * step, every choice on one line.
 *
 * Every preset shows a practice answer: local-only (e2e/premium.ts). On CI
 * (free samples only) every test here skips, saying why.
 */

const ID = 'hull-turn-stack'
const STEP = `[data-viz="${ID}"] section`
const STEPS = VIZ_TABLE[ID][4]!
const PRESETS = turnStackDescriptor.presets.map((p) => p.id)
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
  await page.goto(`/dev/visualizations?ch=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${STEP}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(STEP)
  await f.scrollIntoViewIfNeeded()
  return f
}

/** What the stage draws, read from the svg, the heading and the turn column. */
const drawn = (page: Page) =>
  page.locator(STEP).evaluate((f) => {
    const svg = f.querySelector('[data-viz-part="hull-plot"]')!
    const turn = svg.querySelector('[data-viz-part="turn"]')
    const roles = Object.fromEntries([...svg.querySelectorAll('[data-point]')].map((p) => [p.getAttribute('data-point'), p.getAttribute('data-role')]))
    return {
      chain: f.querySelector('[data-chain]')?.getAttribute('data-chain') ?? null,
      stack: svg.querySelector('[data-stack]')?.getAttribute('data-stack') ?? svg.querySelector('[data-hull]')?.getAttribute('data-hull') ?? null,
      done: svg.querySelector('[data-done]')?.getAttribute('data-done') ?? null,
      turn: turn ? `${turn.getAttribute('data-turn')} ${turn.getAttribute('data-cross')}` : null,
      value: f.querySelector('[data-value]')?.getAttribute('data-value') ?? null,
      verdict: f.querySelector('[data-verdict]')?.getAttribute('data-verdict') ?? null,
      popped: Object.keys(roles).filter((k) => roles[k] === 'popped'),
      arriving: Object.keys(roles).filter((k) => roles[k] === 'arriving'),
    }
  })

const want = (s: HullState) => {
  const stack = stackOf(s)
  return {
    chain: s.chain ?? 'none',
    stack: stack.length > 1 ? stack.map(key).join(' ') : null,
    done: s.chain === 'upper' && s.lower.length > 1 ? s.lower.map(key).join(' ') : null,
    turn: s.turn ? `${key(s.turn.o)} ${key(s.turn.a)} ${key(s.turn.p)} ${s.turn.cross}` : null,
    value: s.output.length ? null : s.turn ? String(s.turn.cross) : null,
    verdict: s.output.length ? null : s.turn ? (s.turn.pops ? 'pop' : 'keep') : null,
    popped: s.popped ? [key(s.popped)] : [],
    arriving: s.p && !s.turn?.pops && stack.some((q) => key(q) === key(s.p!)) ? [key(s.p)] : [],
  }
}

for (const p of turnStackDescriptor.presets)
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
    await expect(f.locator('[data-out]')).toHaveText(log.observed.log!.join(' ').replace(/(\],)/g, '$1'))
  })

test('lesson points: asked with (0,0), (1,1) on the lower stack; the reveal pops (1,1) on a right turn, cross −1', async ({ page }) => {
  test.skip(localOnly(ID, 'monotone-chain-turn-pops'), localOnlyNote(ID, 'monotone-chain-turn-pops'))
  const f = await openStep(page, 'monotone-chain-turn-pops')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('(2,1) arrives next. Does (1,1) stay?')
  expect((await drawn(page)).stack).toBe('0,0 1,1')
  await page.keyboard.press('2')
  await expect(f.locator('[data-viz-part="viz-feedback"]')).toContainText('Right')
  const d = await drawn(page)
  expect([d.turn, d.verdict, d.popped]).toEqual(['0,0 1,1 2,1 -1', 'pop', ['1,1']])
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('[[3,3],[0,3],[0,0],[3,0]]')
})

test('one switcher for the lesson; with < 0 (1,0) stays on a straight run, with <= 0 it is popped', async ({ page }) => {
  test.skip(localOnly(ID, 'fence-collinear-lt'), localOnlyNote(ID, 'fence-collinear-lt'))
  const f = await openStep(page, 'fence-collinear-lt')
  await expect(f.getByRole('radio', { name: 'Fence <= 0' })).toHaveCount(1)
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('(2,0) is next, in line. Does (1,0) stay?')
  await page.keyboard.press('1')
  expect((await drawn(page)).turn).toBe('0,0 1,0 2,0 0')
  expect((await drawn(page)).verdict).toBe('keep')
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('[[3,3],[0,3],[0,0],[1,0],[2,0],[3,0]]')
  await f.getByRole('radio', { name: 'Fence <= 0' }).click()
  await expect(f).toHaveAttribute('data-viz-preset', 'fence-collinear-le')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('2')
  const d = await drawn(page)
  expect([d.turn, d.verdict, d.popped]).toEqual(['0,0 1,0 2,0 0', 'pop', ['1,0']])
  await page.keyboard.press('End')
  await expect(f.locator('[data-out]')).toHaveText('[[3,3],[0,3],[0,0],[3,0]]')
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
          drawing: visible(root.querySelector('[data-viz-part="hull-plot"]')),
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

test('the machine is named in words: the chains, the turn test and what it did', async ({ page }) => {
  test.skip(localOnly(ID, 'monotone-chain-turn-pops'), localOnlyNote(ID, 'monotone-chain-turn-pops'))
  const f = await openStep(page, 'monotone-chain-turn-pops')
  await f.getByRole('slider').focus()
  for (let g = 0; g < 20 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('2')
  const label = await f.locator('[role="img"]').first().getAttribute('aria-label')
  expect(label).toContain('Points in sorted order: (0,0), (0,3), (1,1), (2,1), (2,2), (3,0), (3,3).')
  expect(label).toContain('Lower chain: (0,0).')
  expect(label).toContain('cross((0,0), (1,1), (2,1)) is -1, a right turn, so (1,1) is popped.')
})

test('without JavaScript the Start frame is complete', async ({ browser }) => {
  test.skip(localOnly(ID, 'monotone-chain-turn-pops'), localOnlyNote(ID, 'monotone-chain-turn-pops'))
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations?ch=monotone-chain-turn-pops', { waitUntil: 'load' })
  const svg = page.locator('[data-viz-part="hull-plot"]')
  await expect(svg.locator('[data-point]')).toHaveCount(7)
  await expect(svg.locator('[data-point][data-role="idle"]')).toHaveCount(7)
  await expect(svg.locator('[data-label]')).toHaveCount(7)
  await expect(page.locator(STEP)).toHaveAttribute('data-viz-interactive', 'false')
  expect((await page.locator(STEP).boundingBox())!.height).toBeLessThanOrEqual(STEPS['monotone-chain-turn-pops'][0])
  await ctx.close()
})

test('client-only render: the placeholder reserves each preset’s estimate, an upper bound for the live frame', async ({ page }) => {
  for (const preset of PRESETS)
    for (const width of [375, 1024]) {
      if (skipped(preset)) continue
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations?ch=${preset}&spacer=1&mount=client`, { waitUntil: 'load' })
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
  test.skip(localOnly(ID, 'fence-collinear-le'), localOnlyNote(ID, 'fence-collinear-le'))
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
    await page.goto('/dev/visualizations?ch=fence-collinear-le&spacer=1&mount=client')
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
