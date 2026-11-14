import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, type Request } from '@playwright/test'
import { heapGraphDescriptor } from '../src/components/visualizations/engines/heap-graph/descriptor'
import { layoutDiagram } from '../src/components/visualizations/engines/heap-graph/layout'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The heap graphs on /dev/visualizations?static=1 (R4 shared visual 4,
 * identity mode) through the real `<Viz>` mount: server markup only (no
 * chunk on a hard load), the entry-table footprint at every width, no
 * overflow, the CSS-only trace (hover, keyboard, tap) in lime with nothing
 * dimmed and the changed mark kept neutral, paper without a trace, 44 px
 * targets, a full text alternative, axe clean, and complete without
 * JavaScript. The closures figure's contract (`viz-static.spec.ts`), for
 * the second static system.
 */

const GALLERY = '/dev/visualizations?static=1'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const PRESETS = heapGraphDescriptor.presets.map((p) => p.id)
const FOOTPRINT = VIZ_TABLE['heap-graph'][3]!
const tierOf = (width: number) => (width < 768 ? 0 : width < 1280 ? 1 : 2)
const LIME = 'rgb(163, 230, 53)'
const GREY = 'rgb(113, 113, 122)'
/** The changed mark (tokens-v3 `changed`, zinc-300). */
const CHANGED = 'rgb(212, 212, 216)'

const figure = (page: Page, preset: string) => page.locator(`figure[data-viz-preset="${preset}"]`)
const panelSvg = (page: Page, preset: string, panel: string) =>
  figure(page, preset).locator(`[data-viz-section="${panel}"] svg:visible`)

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

async function open(page: Page, width: number, query = '') {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(GALLERY + query, { waitUntil: 'networkidle' })
  for (const p of PRESETS) await expect(figure(page, p)).toBeVisible()
}

/** Each node and arrow of a panel: lit (lime) or at rest; throws if anything is dimmed (G ruling 1). */
const state = (svg: Locator) =>
  svg.evaluate((el, lime) => {
    const out: Record<string, string> = {}
    for (const n of el.querySelectorAll('[data-node], [data-edge]')) {
      const cs = getComputedStyle(n)
      if (cs.opacity !== '1') throw new Error(`dimmed: ${n.outerHTML.slice(0, 60)}`)
      out[n.getAttribute('data-node') ?? n.getAttribute('data-edge')!] = cs.color === lime ? 'lit' : 'rest'
    }
    return out
  }, LIME)

test('hard load ships no visualization JavaScript: the heap graphs are final server SVG', async ({ page }) => {
  const scripts = new Set<string>()
  const on = (r: Request) => {
    if (r.resourceType() === 'script') scripts.add(new URL(r.url()).pathname)
  }
  page.on('request', on)
  await open(page, 1024)
  for (const p of PRESETS) await figure(page, p).scrollIntoViewIfNeeded()
  await figure(page, PRESETS[0]).hover()
  await page.waitForTimeout(1000)
  page.off('request', on)
  expect([...scripts].filter((u) => /heap-graph|visualizations_engines/.test(u))).toEqual([])
  await expect(page.locator('[data-viz="heap-graph"] > [data-viz-ssr]')).toHaveCount(2)
})

test('client-only render: the placeholder reserves each preset footprint, then the same figure', async ({ page }) => {
  for (const width of [375, 1024, 1440]) {
    await open(page, width, '&mount=client')
    for (const p of PRESETS) expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(FOOTPRINT[p][tierOf(width)])
  }
})

test('fixed footprint, the layout for the width, and no overflow at any width', async ({ page }) => {
  for (const width of WIDTHS) {
    await open(page, width)
    const variant = width < 768 ? 'narrow' : 'wide'
    for (const p of heapGraphDescriptor.presets) {
      expect((await figure(page, p.id).boundingBox())!.height, `${p.id} @${width}`).toBe(FOOTPRINT[p.id][tierOf(width)])
      const scene = layoutDiagram(p.data, variant)
      // The stage holds 288 (320, 375), 606 (768, 1024) or 734 (1440); a sub-width shows from its stage width.
      const stage = width < 768 ? 288 : width < 1280 ? 606 : 734
      const k = scene.widths.filter((w) => w <= stage).length - 1
      const report = await figure(page, p.id).evaluate((fig) => {
        const out: string[] = []
        const st = fig.querySelector('[data-viz-region="stage"]')!.getBoundingClientRect()
        const svgs = [...fig.querySelectorAll('svg[data-viz-width]')].filter(
          (s) => getComputedStyle(s).display !== 'none' && (s as SVGElement).getBoundingClientRect().width > 0,
        ) as SVGSVGElement[]
        for (const s of svgs) {
          const r = s.getBoundingClientRect()
          const hits = [...s.querySelectorAll<SVGElement>('.vz-hit')]
          hits.forEach((h) => (h.style.display = 'none'))
          const box = s.getBBox()
          hits.forEach((h) => (h.style.display = ''))
          if (r.left < st.left - 0.5 || r.right > st.right + 0.5) out.push(`svg ${r.width} wide leaves the stage`)
          if (r.bottom > st.bottom + 0.5) out.push('svg below the stage')
          if (box.x < -3 || box.x + box.width > r.width + 3) out.push(`drawing ${box.width} wider than its svg ${r.width}`)
          if (box.y + box.height > r.height + 3) out.push('drawing taller than its svg')
        }
        for (const el of fig.querySelectorAll<HTMLElement>('[data-viz-region], figcaption'))
          if (el.scrollHeight > el.clientHeight + 1) out.push(`${el.tagName} clips vertically`)
        for (const h of fig.querySelectorAll<HTMLElement>('[data-viz-section] > p'))
          if (h.scrollWidth > h.clientWidth + 1) out.push(`heading truncated: ${h.textContent}`)
        return {
          out,
          widths: svgs.map((s) => Number(s.dataset.vizWidth)),
        }
      })
      expect(report.out, `${p.id} @${width}`).toEqual([])
      expect(report.widths, `${p.id} @${width}: one svg per panel, laid out for this width`).toEqual(
        scene.panels.map((x) => x.scenes[k].width),
      )
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `page @${width}`).toBe(true)
  }
})

test('hover or focus on a name traces what it identifies, CSS only, nothing dims, one path at a time (D21)', async ({ page }) => {
  await open(page, 1024)
  const svg = panelSvg(page, 'identity-alias-rebind-spread', 'spread')
  await svg.scrollIntoViewIfNeeded()
  const rest = await state(svg)
  expect(Object.values(rest).every((s) => s === 'rest')).toBe(true)
  const boxes = () =>
    svg.evaluate((el) =>
      [...el.querySelectorAll('[data-node], [data-edge]')].map((n) => {
        const r = n.getBoundingClientRect()
        return [r.x, r.y, r.width, r.height].map(Math.round).join(',')
      }),
    )
  const before = await boxes()

  // Hover copy: copy, its arrow, Object B, B.stats and the shared Object C light; original's side stays at rest.
  await svg.locator('[data-node="v-copy"]').hover()
  await page.waitForTimeout(300)
  const hovered = await state(svg)
  for (const k of ['v-copy', 'bind:v-copy', 'oB', 'ref:oB.stats', 'oC']) expect(hovered[k], k).toBe('lit')
  for (const k of ['v-original', 'bind:v-original', 'oA', 'ref:oA.stats']) expect(hovered[k], k).toBe('rest')
  expect(await boxes(), 'nothing moves').toEqual(before)
  // The changed mark keeps its neutral colour inside a lit object.
  expect(await svg.locator('[data-node="oC"] .vz-ch').evaluate((n) => getComputedStyle(n).stroke)).toBe(CHANGED)

  // Hover original: the same Object C lights from the other name (one object, two paths).
  await svg.locator('[data-node="v-original"]').hover()
  await page.waitForTimeout(300)
  const other = await state(svg)
  expect([other['v-original'], other.oA, other['ref:oA.stats'], other.oC, other['v-copy'], other.oB]).toEqual([
    'lit',
    'lit',
    'lit',
    'lit',
    'rest',
    'rest',
  ])
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  expect(Object.values(await state(svg)).every((s) => s === 'rest')).toBe(true)

  // Keyboard: names are in the tab order, named, ringed, and trace while nothing is hovered.
  await svg.locator('[data-node="v-original"]').focus()
  await page.keyboard.press('Tab')
  const copy = svg.locator('[data-node="v-copy"]')
  await expect(copy).toBeFocused()
  await expect(copy).toHaveAccessibleName('copy identifies Object B, and through it Object C')
  await page.waitForTimeout(300)
  const focused = await state(svg)
  expect([focused['v-copy'], focused.oB, focused.oC, focused['v-original']]).toEqual(['lit', 'lit', 'lit', 'rest'])
  expect(await copy.locator('.vz-fb').evaluate((n) => [getComputedStyle(n).outlineStyle, getComputedStyle(n).outlineWidth])).toEqual([
    'solid',
    '2px',
  ])
  // A hovered name wins over a keyboard focus.
  await svg.locator('[data-node="v-original"]').hover()
  await page.waitForTimeout(300)
  const mixed = await state(svg)
  expect([mixed['v-original'], mixed['v-copy'], mixed.oB]).toEqual(['lit', 'rest', 'rest'])
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  // A mouse click never sticks.
  await copy.click()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  expect(Object.values(await state(svg)).every((s) => s === 'rest')).toBe(true)
})

test('at rest every arrow is grey and each panel has one neutral mark: the written row or the moved arrow (Q9)', async ({ page }) => {
  await open(page, 1024)
  const fig = figure(page, 'identity-alias-rebind-spread')
  await fig.scrollIntoViewIfNeeded()
  const marks = await fig.evaluate((el) =>
    [...el.querySelectorAll('[data-viz-section]')].filter((s) => s.getBoundingClientRect().width > 0).map((s) => {
      const svg = [...s.querySelectorAll('svg')].find((x) => x.getBoundingClientRect().width > 0)!
      return {
        panel: s.getAttribute('data-viz-section'),
        marks: svg.querySelectorAll('[data-changed]').length,
        rest: [...svg.querySelectorAll('[data-edge]:not([data-changed]) .vz-e')].map((p) => getComputedStyle(p).stroke),
        moved: [...svg.querySelectorAll('[data-edge][data-changed] .vz-e')].map((p) => [getComputedStyle(p).stroke, getComputedStyle(p).strokeWidth]),
        row: [...svg.querySelectorAll('rect[data-changed]')].map((p) => [getComputedStyle(p).stroke, getComputedStyle(p).strokeWidth]),
      }
    }),
  )
  expect(marks.map((m) => m.marks)).toEqual([1, 1, 1])
  for (const m of marks) expect(new Set(m.rest)).toEqual(new Set([GREY]))
  expect(marks[0].row).toEqual([[CHANGED, '2px']])
  expect(marks[1].moved).toEqual([[CHANGED, '2.5px']])
  expect(marks[2].row).toEqual([[CHANGED, '2px']])
})

test.describe('touch (R2M-16)', () => {
  test.use({ hasTouch: true, isMobile: true })
  test('a tap traces a name; a second tap puts it down; another name takes over', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'hover', value: 'none' },
        { name: 'pointer', value: 'coarse' },
      ],
    })
    await open(page, 375)
    const svg = panelSvg(page, 'spread-vs-nested-vs-deep', 'deep')
    const lit = () =>
      svg.evaluate(
        (el, lime) => ['v-original', 'v-copy'].filter((id) => getComputedStyle(el.querySelector(`[data-node=${id}]`)!).color === lime),
        LIME,
      )
    const tap = async (id: string) => {
      const box = svg.locator(`[data-node=${id}] .vz-fb`)
      await box.scrollIntoViewIfNeeded()
      const b = (await box.boundingBox())!
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
      await page.waitForTimeout(300)
    }
    await tap('v-original')
    expect(await lit()).toEqual(['v-original'])
    await tap('v-original')
    expect(await lit(), 'the second tap puts it down').toEqual([])
    await tap('v-original')
    await tap('v-copy')
    expect(await lit(), 'one path at a time').toEqual(['v-copy'])
    await page.touchscreen.tap(3, 3)
    await page.waitForTimeout(300)
    expect(await lit()).toEqual([])
  })
})

test('paper never shows a trace or the hint, even with a name focused (print)', async ({ page }) => {
  await open(page, 1024)
  const svg = panelSvg(page, 'identity-alias-rebind-spread', 'alias')
  await svg.locator('[data-node="v-original"]').focus()
  await page.keyboard.press('Tab')
  await page.emulateMedia({ media: 'print' })
  const colors = await svg.evaluate((el) => [...el.querySelectorAll('[data-node], [data-edge]')].map((n) => getComputedStyle(n).color))
  expect(colors).not.toContain(LIME)
  const hint = figure(page, 'identity-alias-rebind-spread').locator('[data-viz-part="hint"] >> visible=true')
  await expect(hint).toHaveCount(0)
  await page.emulateMedia({ media: 'screen' })
})

test('every name has a touch target of at least 44 px', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('[data-viz="heap-graph"] svg.vz-s [tabindex] .vz-hit')]
        .map((r) => r.getBoundingClientRect())
        .filter((r) => r.width > 0)
        .map((r) => Math.min(r.width, r.height)),
    )
    expect(sizes.length).toBeGreaterThan(0)
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(44)
  }
})

test('the trace is instant under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 1024)
  const n = panelSvg(page, PRESETS[0], 'alias').locator('[data-node="oA"]')
  expect(await n.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
})

test('text alternative: named, fully described, verified outputs, and "Diagram as text" opens', async ({ page }) => {
  await open(page, 375)
  for (const p of PRESETS) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAttribute('role', 'group')
    await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
    const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
    expect(description).toMatch(/Verified output/)
    expect(description).toMatch(/identify one object/)
    await figure(page, p).locator('summary').click()
    await expect(figure(page, p).locator('details')).toHaveAttribute('open', '')
  }
  const dt = figure(page, 'identity-alias-rebind-spread').locator('details')
  await expect(dt).toContainText('Verified output, update (Node 24.x): 2, 99, false')
  await expect(dt).toContainText('Marked: the arrow of record, now to Object B, moved by record = { count: 99 }.')
  await expect(figure(page, 'spread-vs-nested-vs-deep').locator('details')).toContainText(
    'Object A.b and Object B.b identify one object, Object C.',
  )
})

test('zero axe violations, closed and open', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page })
        .include('[data-viz="heap-graph"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(
        result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        `${label} at ${width}`,
      ).toEqual([])
    }
    await scan('closed')
    for (const p of PRESETS) await figure(page, p).locator('summary').click()
    await scan('text alternative open')
  }
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the figures and their text alternative are complete', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto(GALLERY)
    for (const p of PRESETS) {
      expect((await figure(page, p).boundingBox())!.height).toBe(FOOTPRINT[p][0])
      await figure(page, p).locator('summary').click()
      await expect(figure(page, p).locator('details')).toContainText('Verified output')
    }
  })
})

test('screenshots at 320, 375, 768, 1024 and 1440 (plus print and grayscale)', async ({ page }, testInfo) => {
  for (const width of WIDTHS) {
    await open(page, width)
    for (const p of PRESETS) {
      const path = testInfo.outputPath(`heap-${p}-${width}.png`)
      await figure(page, p).screenshot({ path, animations: 'disabled' })
      await testInfo.attach(`${p}-${width}`, { path, contentType: 'image/png' })
    }
  }
  await page.emulateMedia({ media: 'print' })
  await open(page, 1024)
  for (const p of PRESETS) await figure(page, p).screenshot({ path: testInfo.outputPath(`heap-${p}-print.png`) })
  await page.emulateMedia({ media: 'screen' })
  // Grayscale (A7): the mark still reads by its doubled edge, the moved arrow by its weight.
  await page.addStyleTag({ content: 'figure { filter: grayscale(1) }' })
  for (const p of PRESETS) await figure(page, p).screenshot({ path: testInfo.outputPath(`heap-${p}-grayscale.png`) })
})
