import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'

/**
 * Static diagrams on /dev/visualizations?static=1 (VIZ-01 spec §3.3 to §3.5,
 * §6.4, §7): the closures environment-records figures through the real
 * `<Viz>` mount. Server markup only: no visualization chunk on a hard load,
 * fixed footprint, no overflow at any width, axe clean, full text
 * alternative, and screenshots at the five spec widths.
 */

const GALLERY = '/dev/visualizations?static=1'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const PRESETS = ['var-vs-let-loop', 'factory-calls-vs-aliases'] as const
// entry-table.ts (checked against the computed footprint by registry.test.ts).
const FOOTPRINT: Record<
  (typeof PRESETS)[number],
  { narrow: number; wide: number }
> = {
  'var-vs-let-loop': { narrow: 858, wide: 540 },
  'factory-calls-vs-aliases': { narrow: 782, wide: 518 },
}
/** The section layout each width shows (stage 288/343 stacked; 606/638/734 in two columns). */
const SECTION_WIDTH: Record<(typeof WIDTHS)[number], number> = {
  320: 288,
  375: 343,
  768: 295,
  1024: 295,
  1440: 359,
}

const figure = (page: Page, preset: string) =>
  page.locator(`figure[data-viz-preset="${preset}"]`)

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

const scripts = (page: Page) => {
  const urls = new Set<string>()
  const on = (r: Request) => {
    if (r.resourceType() === 'script') urls.add(new URL(r.url()).pathname)
  }
  page.on('request', on)
  return { urls, stop: () => page.off('request', on) }
}

test('hard load ships no visualization JavaScript: the server SVG is final', async ({
  page,
}) => {
  // The figures' chunk, identified as what a client-only render requests.
  const client = scripts(page)
  await open(page, 1024, '&mount=client')
  await page.waitForTimeout(500)
  client.stop()

  const hard = scripts(page)
  await open(page, 1024)
  for (const p of PRESETS) await figure(page, p).scrollIntoViewIfNeeded()
  await page.mouse.move(200, 400)
  await figure(page, PRESETS[0]).hover()
  await page.waitForTimeout(1_000)
  hard.stop()

  const chunk = [...client.urls].filter((u) => !hard.urls.has(u))
  expect(
    chunk.length,
    'a client-only render loads the figure chunk',
  ).toBeGreaterThan(0)
  expect(
    [...hard.urls].filter((u) => /env-records|visualizations_engines/.test(u)),
  ).toEqual([])
  // The server markup is kept as is: never re-rendered on the client.
  await expect(
    page.locator('[data-viz="environment-records"] > [data-viz-ssr]'),
  ).toHaveCount(2)
})

test('client-only render: the placeholder reserves each preset footprint, then the same figure', async ({
  page,
}) => {
  for (const [width, variant] of [
    [375, 'narrow'],
    [1024, 'wide'],
  ] as const) {
    await open(page, width, '&mount=client')
    for (const p of PRESETS)
      expect((await figure(page, p).boundingBox())!.height).toBe(
        FOOTPRINT[p][variant],
      )
  }
})

test('fixed footprint and no overflow at any width', async ({ page }) => {
  for (const width of WIDTHS) {
    await open(page, width)
    const variant = width < 768 ? 'narrow' : 'wide'
    for (const p of PRESETS) {
      expect(
        (await figure(page, p).boundingBox())!.height,
        `${p} at ${width}`,
      ).toBe(FOOTPRINT[p][variant])
      const report = await figure(page, p).evaluate((fig) => {
        const out: string[] = []
        const stage = fig
          .querySelector('[data-viz-region="stage"]')!
          .getBoundingClientRect()
        const svgs = [...fig.querySelectorAll('svg[data-viz-width]')].filter(
          (s) =>
            getComputedStyle(s).display !== 'none' &&
            s.closest('[data-viz-variant]') &&
            (s as SVGElement).getBoundingClientRect().width > 0,
        ) as SVGSVGElement[]
        for (const s of svgs) {
          const r = s.getBoundingClientRect()
          const box = s.getBBox()
          if (r.left < stage.left - 0.5 || r.right > stage.right + 0.5)
            out.push(`svg ${r.width} wide leaves the stage`)
          if (r.bottom > stage.bottom + 0.5) out.push('svg below the stage')
          if (box.x < -3 || box.x + box.width > r.width + 3)
            out.push(`drawing ${box.width} wider than its svg ${r.width}`)
          if (box.y + box.height > r.height + 3)
            out.push('drawing taller than its svg')
        }
        for (const el of fig.querySelectorAll<HTMLElement>(
          '[data-viz-region], figcaption',
        ))
          if (el.scrollHeight > el.clientHeight + 1)
            out.push(`${el.tagName} clips vertically`)
        const heading = fig.querySelectorAll<HTMLElement>(
          '[data-viz-section] > p',
        )
        for (const h of heading)
          if (h.scrollWidth > h.clientWidth + 1)
            out.push(`heading truncated: ${h.textContent}`)
        return { out, widths: svgs.map((s) => Number(s.dataset.vizWidth)) }
      })
      expect(report.out, `${p} at ${width}`).toEqual([])
      // One SVG per section, laid out for this width (never scaled below 1:1).
      expect(report.widths, `${p} at ${width}`).toEqual([
        SECTION_WIDTH[width],
        SECTION_WIDTH[width],
      ])
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `page at ${width}`,
    ).toBe(true)
  }
})

test('hover or focus on a function brings its [[Environment]] path forward, CSS only (D21)', async ({
  page,
}) => {
  await open(page, 1024)
  const fig = figure(page, 'factory-calls-vs-aliases')
  await fig.scrollIntoViewIfNeeded()
  const svg = fig.locator('[data-viz-section="counters"] svg:visible')
  const opacities = () =>
    svg.evaluate((el) => {
      const out: Record<string, string> = {}
      for (const n of el.querySelectorAll('[data-node], [data-edge]'))
        out[n.getAttribute('data-node') ?? n.getAttribute('data-edge')!] = getComputedStyle(n).opacity
      return out
    })
  const boxes = () =>
    svg.evaluate((el) =>
      [...el.querySelectorAll('[data-node], [data-edge]')].map((n) => {
        const r = n.getBoundingClientRect()
        return [r.x, r.y, r.width, r.height].map(Math.round).join(',')
      }),
    )
  const rest = await boxes()
  expect(Object.values(await opacities()).every((o) => o === '1')).toBe(true)

  // Hover: fA's record, its env link and both names that alias it stay; the rest dims.
  await svg.locator('[data-node="fA"]').hover()
  await page.waitForTimeout(300)
  const hovered = await opacities()
  for (const k of ['fA', 'env:fA', 'callA', 'module', 'ref:module.counter1', 'ref:module.sameCounter'])
    expect(hovered[k], k).toBe('1')
  for (const k of ['fB', 'env:fB', 'callB', 'ref:module.counter2']) expect(hovered[k], k).toBe('0.4')
  expect(await boxes(), 'nothing moves').toEqual(rest)
  // The other section is untouched.
  const account = fig.locator('[data-viz-section="account"] svg:visible [data-node="call"]')
  expect(await account.evaluate((n) => getComputedStyle(n).opacity)).toBe('1')

  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  expect(Object.values(await opacities()).every((o) => o === '1')).toBe(true)

  // Keyboard: functions are in the tab order, named, with the focus ring.
  await svg.locator('[data-node="fA"]').focus()
  await page.keyboard.press('Tab')
  await expect(svg.locator('[data-node="fB"]')).toBeFocused()
  await expect(svg.locator('[data-node="fB"]')).toHaveAccessibleName(
    'ƒ B, named counter2, created in createCounter() call B',
  )
  await page.waitForTimeout(300)
  const focused = await opacities()
  expect([focused.fB, focused.callB, focused['ref:module.counter2'], focused.fA]).toEqual(['1', '1', '1', '0.4'])
  const ring = await svg
    .locator('[data-node="fB"]')
    .evaluate((n) => [getComputedStyle(n).outlineStyle, getComputedStyle(n).outlineWidth])
  expect(ring).toEqual(['solid', '2px'])
  expect(await boxes(), 'nothing moves on focus').toEqual(rest)
})

test('the hover path is instant under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 1024)
  const n = figure(page, 'var-vs-let-loop').locator('svg:visible [data-node="call"]').first()
  expect(await n.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
})

test('text alternative: the image is named and fully described, and "Diagram as text" opens', async ({
  page,
}) => {
  await open(page, 375)
  for (const p of PRESETS) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAttribute('role', 'group')
    const name = await figure(page, p).locator('p').first().textContent()
    await expect(stage).toHaveAccessibleName(name!)
    const description = await stage.evaluate(
      (el) =>
        document.getElementById(el.getAttribute('aria-describedby')!)!
          .textContent!,
    )
    expect(description).toMatch(/Verified output/)
    expect(description.length).toBeGreaterThan(300)
    await figure(page, p).locator('summary').click()
    await expect(figure(page, p).locator('details')).toHaveAttribute('open', '')
  }
  await expect(
    figure(page, 'var-vs-let-loop').locator('details'),
  ).toContainText('Verified output, var (Node 24.x): 3, 3, 3')
  await expect(
    figure(page, 'var-vs-let-loop').locator('details'),
  ).toContainText('Verified output, let (Node 24.x): 0, 1, 2')
})

test('zero axe violations, closed and open', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page })
        .include('[data-viz="environment-records"]')
        .withTags([
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22aa',
          'best-practice',
        ])
        .analyze()
      expect(
        result.violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
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
  test('the figures and their text alternative are complete', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto(GALLERY)
    for (const p of PRESETS) {
      expect((await figure(page, p).boundingBox())!.height).toBe(
        FOOTPRINT[p].narrow,
      )
      await figure(page, p).locator('summary').click()
      await expect(figure(page, p).locator('details')).toContainText(
        'Verified output',
      )
    }
  })
})

test('screenshots at 320, 375, 768, 1024 and 1440 (plus print)', async ({
  page,
}, testInfo) => {
  for (const width of WIDTHS) {
    await open(page, width)
    for (const p of PRESETS) {
      const path = testInfo.outputPath(`static-${p}-${width}.png`)
      await figure(page, p).screenshot({ path, animations: 'disabled' })
      await testInfo.attach(`${p}-${width}`, { path, contentType: 'image/png' })
    }
  }
  await page.emulateMedia({ media: 'print' })
  await open(page, 1024)
  for (const p of PRESETS)
    await figure(page, p).screenshot({
      path: testInfo.outputPath(`static-${p}-print.png`),
    })
  await page.emulateMedia({ media: 'screen' })
  // Grayscale (A7): the highlight must still read by its 2.5 px stroke.
  await page.addStyleTag({ content: 'figure { filter: grayscale(1) }' })
  for (const p of PRESETS)
    await figure(page, p).screenshot({
      path: testInfo.outputPath(`static-${p}-grayscale.png`),
    })
})
