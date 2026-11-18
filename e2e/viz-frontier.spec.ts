import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * The frontier step-through (waves 2A and 4B, `bfs-dfs-frontier`) on
 * /dev/visualizations?fr=<preset>, through the real `<Viz>` mount: every
 * preset walked to its end with the keyboard, the frame never moving, nothing
 * clipping at any width, the lazy reserve (also under text zoom), the
 * server-rendered Start frame without JavaScript, the phone fit, axe, and no
 * console errors or hydration warnings.
 */

const GALLERY = '/dev/visualizations'
const ALL_PRESETS = [
  'bfs-levels',
  'binary-matrix-8dir',
  'dijkstra-lazy-heap',
  'min-effort-grid',
  'bst-iterator-stack',
  // Wave 4B: Graph DFS (stack mode) and Topological Sort (queue mode, in-degree badges).
  'dfs-directed-recstack',
  'dfs-back-edge',
  'dfs-finish-order',
  'kahn-indegree',
  'course-schedule-ii-edges',
  'kahn-cycle-stall',
  'mht-leaf-peeling',
] as const
/**
 * Radios at Start at 1024: the group switcher's segments (one preset: none;
 * four: a select, none) plus the choices of a question asked at Start.
 */
const RADIOS: Record<string, number> = {
  'bst-iterator-stack': 0,
  'dfs-directed-recstack': 3,
  'dfs-back-edge': 3,
  'dfs-finish-order': 3,
  'kahn-indegree': 2,
  'course-schedule-ii-edges': 2,
  'kahn-cycle-stall': 0,
  'mht-leaf-peeling': 3,
}
const STEPS = VIZ_TABLE['bfs-dfs-frontier'][4]!
const WIDTHS = [320, 375, 768, 1024, 1440] as const

// A lesson group with a practice-answer preset (binary matrix, minimum
// effort, the BST iterator, course schedule and minimum height trees) is
// local-only: without the content checkout (CI) its presets are skipped,
// saying why, and the rest (the Graph DFS group) still run.
const LOCAL_ONLY = ALL_PRESETS.filter((p) => localOnly('bfs-dfs-frontier', p))
const PRESETS = ALL_PRESETS.filter((p) => !LOCAL_ONLY.includes(p))
test.skip(() => PRESETS.length === 0, LOCAL_ONLY.map((p) => localOnlyNote('bfs-dfs-frontier', p)).join('; '))
test.beforeEach(() => {
  for (const p of LOCAL_ONLY) test.info().annotations.push({ type: 'skipped preset', description: localOnlyNote('bfs-dfs-frontier', p) })
})

const mount = (page: Page) => page.locator('[data-viz="bfs-dfs-frontier"]')
const frame = (page: Page) => mount(page).locator('section')
const slider = (page: Page) => frame(page).getByRole('slider')

let errors: string[] = []
test.beforeEach(({ page }) => {
  errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
})
test.afterEach(() => {
  expect(errors, 'no console errors or hydration warnings').toEqual([])
})

async function open(page: Page, width: number, preset: string, query = '', height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto(`${GALLERY}?fr=${preset}${query}`)
  await expect(mount(page).locator('[data-viz-interactive="true"]')).toBeVisible({ timeout: 30_000 })
}

async function state(page: Page) {
  const f = frame(page)
  return {
    step: Number(await f.getAttribute('data-viz-step')),
    last: Number(await f.getAttribute('data-viz-last')),
    mode: await f.getAttribute('data-viz-mode'),
  }
}

/** Page-relative boxes of the frame, its regions and the paragraph after it (the code pane's position and width only). */
async function layoutSnapshot(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-viz="bfs-dfs-frontier"]')!
    const els = [
      ['frame', root.querySelector('section')],
      ...[...root.querySelectorAll('[data-viz-region]')].map((el) => [el.getAttribute('data-viz-region'), el] as const),
      ['after', root.nextElementSibling],
    ] as const
    return Object.fromEntries(
      els.map(([k, el]) => {
        const r = el!.getBoundingClientRect()
        const h = k === 'code' ? 0 : Math.round(r.height)
        return [k, [Math.round(r.x), Math.round(r.y + window.scrollY), Math.round(r.width), h]]
      }),
    )
  })
}

test('loads paused at Start with its group switcher, and walks to the end with the keyboard', async ({ page }) => {
  test.setTimeout(300_000)
  for (const preset of PRESETS) {
    await open(page, 1024, preset)
    const s0 = await state(page)
    expect(s0.step).toBe(0)
    await page.waitForTimeout(1500)
    expect((await state(page)).step, 'no autoplay').toBe(0)
    // Each lesson's frame offers only its own presets.
    const radios = await frame(page).locator('[data-viz-part="viz-presets"] [role="radio"], [role="radiogroup"] [role="radio"]').count()
    expect(radios, preset).toBe(RADIOS[preset] ?? 2)
    await slider(page).focus()
    let asked = 0
    for (let g = 0; g < 40; g++) {
      const s = await state(page)
      if (s.step === s.last) break
      if (s.mode === 'ask') asked++
      await page.keyboard.press(s.mode === 'ask' ? '1' : 'ArrowRight')
      await page.waitForTimeout(60)
      // Focus is never lost to the page.
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-viz="bfs-dfs-frontier"]')))).toBe(true)
    }
    const end = await state(page)
    expect(end.step, `${preset} reaches its end`).toBe(end.last)
    expect(asked, `${preset} asks its question`).toBe(1)
    // The console shows the run's output at the end.
    await expect(frame(page).locator('[data-viz-region="console"] [data-out]').first()).toBeVisible()
    // Home returns to Start.
    await slider(page).focus()
    await page.keyboard.press('Home')
    await expect.poll(async () => (await state(page)).step).toBe(0)
  }
})

test('the frame never moves while stepping, answering and bursting (zero layout shift)', async ({ page }) => {
  test.setTimeout(600_000)
  for (const width of [375, 1024])
    for (const preset of PRESETS) {
      await open(page, width, preset)
      await page.evaluate(() => {
        ;(window as unknown as { __shifts: number }).__shifts = 0
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
            if (!e.hadRecentInput) (window as unknown as { __shifts: number }).__shifts += e.value
        }).observe({ type: 'layout-shift' })
      })
      const base = await layoutSnapshot(page)
      const [n, w] = STEPS[preset]
      expect(base.frame[3], `${preset} frame height at ${width}`).toBeLessThanOrEqual(width < 768 ? n : w)
      await slider(page).focus()
      for (let g = 0; g < 40; g++) {
        const s = await state(page)
        if (s.step === s.last) break
        await page.keyboard.press(s.mode === 'ask' ? '2' : 'ArrowRight')
        await page.waitForTimeout(350)
        expect(await layoutSnapshot(page), `${preset} step ${s.step + 1} at ${width}`).toEqual(base)
      }
      await page.keyboard.press('Home')
      for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight', { delay: 0 })
      await page.waitForTimeout(350)
      expect(await layoutSnapshot(page), `${preset} burst at ${width}`).toEqual(base)
      expect(await page.evaluate(() => (window as unknown as { __shifts: number }).__shifts), 'cumulative layout shift').toBe(0)
    }
})

test('nothing overflows its reserved box at any width or step', async ({ page }) => {
  test.setTimeout(720_000)
  for (const width of WIDTHS)
    for (const preset of PRESETS) {
      await open(page, width, preset)
      await slider(page).focus()
      for (let g = 0; g < 40; g++) {
        // Settled states: a step's last beat lands within 560 ms (Q1).
        await page.waitForTimeout(650)
        const problems = await page.evaluate(() => {
          const root = document.querySelector('[data-viz="bfs-dfs-frontier"] section')!
          const out: string[] = []
          for (const el of root.querySelectorAll<HTMLElement>('[data-viz-region], [data-viz-part="viz-caption"], [data-viz-part="viz-prompt"]')) {
            if (el.dataset.vizRegion === 'code') continue
            if (el.scrollHeight > el.clientHeight + 1) out.push(`${el.dataset.vizRegion ?? el.dataset.vizPart} clips vertically`)
            if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.dataset.vizRegion ?? el.dataset.vizPart} clips horizontally`)
          }
          const canvas = root.querySelector('[data-viz-region="canvas"]')!.getBoundingClientRect()
          const svg = root.querySelector('[data-viz-part="frontier-canvas"]')!.getBoundingClientRect()
          if (svg.right > canvas.right + 0.5 || svg.bottom > canvas.bottom + 0.5) out.push('the drawing leaves its panel')
          const pane = root.querySelector('[data-viz-region="code"]')!.getBoundingClientRect()
          for (const line of root.querySelectorAll('[data-viz-region="code"] [aria-current="true"]')) {
            const r = line.getBoundingClientRect()
            if (r.top < pane.top - 0.5 || r.bottom > pane.bottom + 0.5) out.push('current line outside the code window')
          }
          return out
        })
        const s = await state(page)
        expect(problems, `${preset} step ${s.step} at ${width}`).toEqual([])
        if (s.step === s.last) break
        await page.keyboard.press(s.mode === 'ask' ? '2' : 'ArrowRight')
      }
    }
})

test('lazy mount: the client placeholder reserves the entry table, at least the live frame, also under text zoom', async ({ browser }) => {
  test.setTimeout(600_000)
  for (const preset of PRESETS)
    for (const [width, zoom] of [
      [375, 100],
      [1024, 100],
      [375, 150],
      [1280, 200],
    ] as const) {
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((z) => {
        document.addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style')
          s.textContent = `html{font-size:${z}% !important}`
          document.head.append(s)
        })
      }, zoom)
      await page.goto(`${GALLERY}?fr=${preset}&spacer=1&mount=client`)
      const placeholder = mount(page).locator('[data-viz-placeholder]')
      await expect(placeholder).toHaveCount(1)
      const reserved = (await placeholder.boundingBox())!.height
      if (zoom === 100) expect(reserved).toBe(width < 768 ? STEPS[preset][0] : STEPS[preset][1])
      await mount(page).scrollIntoViewIfNeeded()
      await expect(mount(page).locator('[data-viz-interactive="true"]')).toBeVisible({ timeout: 30_000 })
      const live = (await frame(page).boundingBox())!.height
      expect(reserved, `${preset} ${width} at ${zoom} %`).toBeGreaterThanOrEqual(live - 0.5)
      await context.close()
    }
})

// Q15, as the event loop: with the code pane just under the site header on
// a 375x667 phone, the current line, the changed glyphs, the caption and
// Next are all on screen, at every step of every preset.
test('375x667 fit: code line, changed glyph, caption and Next stay visible under the site header (Q15)', async ({ page }) => {
  test.setTimeout(420_000)
  for (const preset of PRESETS) {
    await open(page, 375, preset, '', 667)
    await slider(page).focus()
    for (let g = 0; g < 40; g++) {
      const v = await page.evaluate(() => {
        const root = document.querySelector('[data-viz="bfs-dfs-frontier"] section')!
        const header = [...document.querySelectorAll('div.fixed')]
          .map((e) => e.getBoundingClientRect())
          .find((r) => r.top <= 0 && r.height > 30 && r.height < 120)
        const top = header ? header.bottom : 0
        const code = root.querySelector('[data-viz-region="code"]')!
        window.scrollBy(0, code.getBoundingClientRect().top - top - 8)
        const visible = (el: Element | null) => {
          if (!el) return true
          const r = el.getBoundingClientRect()
          return r.top >= top - 0.5 && r.bottom <= window.innerHeight + 0.5
        }
        return {
          line: visible(root.querySelector('[aria-current="true"]')),
          changed: [...root.querySelectorAll('[data-focus]')].every(visible),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: visible(root.querySelector('[data-viz-part="viz-next"]')),
        }
      })
      const s = await state(page)
      expect(v, `${preset} step ${s.step} (${s.mode})`).toEqual({ line: true, changed: true, caption: true, next: true })
      if (s.step === s.last) break
      await page.keyboard.press(s.mode === 'ask' ? '1' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the Start frame and a working "Steps as text" are server-rendered', async ({ page }) => {
    for (const preset of PRESETS) {
      await page.setViewportSize({ width: 375, height: 900 })
      await page.goto(`${GALLERY}?fr=${preset}`)
      const f = frame(page)
      await expect(f).toHaveAttribute('data-viz-interactive', 'false')
      expect((await f.boundingBox())!.height).toBeLessThanOrEqual(STEPS[preset][0])
      await expect(f.locator('[data-viz-part="frontier-canvas"]')).toBeVisible()
      await f.locator('summary').click()
      await expect(f.locator('details').getByText('Verified output (Node 24.x):')).toBeVisible()
    }
  })
})

test('zero axe violations at Start, at the question and at its reveal', async ({ page }) => {
  test.setTimeout(300_000)
  for (const width of [375, 1024])
    for (const preset of PRESETS) {
      await open(page, width, preset)
      const check = async (when: string) => {
        const r = await new AxeBuilder({ page }).include('[data-viz="bfs-dfs-frontier"]').analyze()
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`), `${preset} ${when} at ${width}`).toEqual([])
      }
      await check('Start')
      await slider(page).focus()
      for (let g = 0; g < 30 && (await state(page)).mode !== 'ask'; g++) await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(400)
      await check('question')
      await page.keyboard.press('1')
      await page.waitForTimeout(600)
      await check('reveal')
    }
})
