import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { lanesDescriptor } from '../src/components/visualizations/engines/lanes/descriptor'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The wave 3B JavaScript-track figures through the real `<Viz>` mount on
 * `/dev/visualizations?js=static`: the prototype object graph (two
 * presets), the hidden-class trees and the four lanes figures. Final server
 * SVG (no chunk on a hard load), the entry-table footprint at every width
 * and under a client-side mount, nothing outside its svg or stage, the
 * drawn values the recorded ones, axe clean, complete without JavaScript,
 * and each figure in its lesson where the local content checkout has it.
 */

const URL_ = '/dev/visualizations?js=static'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const FIGURES = [
  ['prototype-object-graph', 'lookup-and-shadowing'],
  ['prototype-object-graph', 'constructor-fix'],
  ['annotated-tree', 'hidden-class-transitions'],
  ...lanesDescriptor.presets.map((p) => ['lanes', p.id] as const),
] as const
const reserve = (id: string, preset: string) => VIZ_TABLE[id][3]![preset]
const tierOf = (width: number) => (width < 768 ? 0 : width < 1280 ? 1 : 2)
const figure = (page: Page, preset: string) => page.locator(`figure[data-viz-preset="${preset}"]`)

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

async function open(page: Page, width: number, query = '') {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${URL_}${query}`, { waitUntil: 'load' })
}

test('hard load ships no visualization JavaScript: the figures are final server SVG', async ({ page }) => {
  const scripts = new Set<string>()
  const on = (r: Request) => {
    if (r.resourceType() === 'script') scripts.add(new URL(r.url()).pathname)
  }
  page.on('request', on)
  await page.goto(URL_, { waitUntil: 'networkidle' })
  for (const [, p] of FIGURES) await figure(page, p).scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  page.off('request', on)
  expect([...scripts].filter((u) => /lanes|heap-graph|annotated-tree|visualizations_engines/.test(u))).toEqual([])
  await expect(page.locator('[data-viz] > [data-viz-ssr]')).toHaveCount(FIGURES.length)
})

test('the reserved footprint at every width; nothing outside its svg, its stage or the page', async ({ page }) => {
  for (const width of WIDTHS) {
    await open(page, width)
    for (const [id, p] of FIGURES) {
      expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(reserve(id, p)[tierOf(width)])
      const bad = await figure(page, p).evaluate((fig) => {
        const out: string[] = []
        const st = fig.querySelector('[data-viz-region="stage"]')!.getBoundingClientRect()
        const shown = [...fig.querySelectorAll<SVGSVGElement>('svg[data-viz-panel]')].filter((s) => s.getBoundingClientRect().width > 0)
        if (!shown.length) out.push('no panel on screen')
        for (const s of shown) {
          const r = s.getBoundingClientRect()
          const b = s.getBBox()
          const vb = s.viewBox.baseVal
          if (r.left < st.left - 0.5 || r.right > st.right + 0.5 || r.bottom > st.bottom + 0.5) out.push(`${s.dataset.vizPanel} leaves the stage`)
          if (b.x < -1 || b.y < -1 || b.x + b.width > vb.width + 1 || b.y + b.height > vb.height + 1) out.push(`${s.dataset.vizPanel}: drawing outside its svg`)
          for (const t of s.querySelectorAll<SVGTextElement>('text')) {
            const tb = t.getBBox()
            if (tb.x < -1 || tb.x + tb.width > vb.width + 1) out.push(`${s.dataset.vizPanel}: "${t.textContent}" overflows`)
          }
        }
        for (const sec of fig.querySelectorAll<HTMLElement>('[data-viz-section]'))
          if (sec.getClientRects().length && sec.scrollHeight > sec.clientHeight + 1) out.push(`${sec.dataset.vizSection} clips vertically`)
        return out
      })
      expect(bad, `${p} @${width}`).toEqual([])
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `page @${width}`).toBe(true)
  }
})

test('client-only render reserves each preset footprint, then the same figure', async ({ page }) => {
  for (const width of [375, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${URL_}&mount=client`, { waitUntil: 'networkidle' })
    for (const [id, p] of FIGURES) {
      await figure(page, p).scrollIntoViewIfNeeded()
      expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(reserve(id, p)[tierOf(width)])
    }
  }
})

test('the drawn marks are the recorded ones', async ({ page }) => {
  await open(page, 375)
  // Prototypes: the lookup follows two [[Prototype]] links and answers on Object.prototype.toString.
  const inh = figure(page, 'lookup-and-shadowing').locator('svg[data-viz-panel="inherited"]')
  expect(await inh.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(['proto:alice', 'proto:Person.prototype'])
  await expect(inh.locator('[data-node="Object.prototype"] [data-changed]')).toHaveCount(1)
  await expect(inh.locator('[data-kind="constructor"] .vz-d')).toHaveCount(1)
  const before = figure(page, 'constructor-fix').locator('svg[data-viz-panel="before"]')
  await expect(before.locator('[data-viz-part="result"]')).toContainText('false')
  // Hidden classes: two leaves before the fix, one after.
  const hc = figure(page, 'hidden-class-transitions')
  await expect(hc.locator('svg[data-viz-panel="late"] [data-viz-part="objects"]')).toHaveText(['obj1', 'obj2'])
  await expect(hc.locator('svg[data-viz-panel="fixed"] [data-viz-part="objects"]')).toHaveText(['obj1, obj2'])
  // Debounce runs e at 140 and f at 250; throttle a at 0 and f at 150 (the narrow drawing).
  const tl = figure(page, 'debounce-vs-throttle').locator('[data-viz-variant="narrow"] svg')
  expect(await tl.locator('[data-viz-row="debounce"] [data-mark="invoke"]').evaluateAll((es) => es.map((e) => `${e.getAttribute('data-arg')}@${e.getAttribute('data-t')}`))).toEqual(['e@140', 'f@250'])
  expect(await tl.locator('[data-viz-row="throttle"] [data-mark="invoke"]').evaluateAll((es) => es.map((e) => `${e.getAttribute('data-arg')}@${e.getAttribute('data-t')}`))).toEqual(['a@0', 'f@150'])
  await expect(tl.locator('[data-viz-row="throttle"] [data-mark="drop"]')).toHaveCount(4)
  // Dispatch: five badges; stopping at the target skips 4 and 5, in capture 2 to 5.
  const dp = figure(page, 'event-dispatch-path').locator('[data-viz-variant="narrow"]')
  expect(await dp.locator('svg[data-viz-panel="default"] [data-badge]').evaluateAll((es) => es.map((e) => `${e.getAttribute('data-badge')}${e.getAttribute('data-at')}:${e.getAttribute('data-phase')}`).sort())).toEqual([
    '1#outer:1',
    '2#middle:1',
    '3#inner:2',
    '4#middle:3',
    '5#outer:3',
  ])
  await expect(dp.locator('svg[data-viz-panel="stop-at-target"] [data-badge][data-ran]')).toHaveCount(3)
  await expect(dp.locator('svg[data-viz-panel="stop-in-capture"] [data-badge][data-ran]')).toHaveCount(1)
  // PKCE: the browser's lane never carries the verifier or a token.
  const sq = figure(page, 'oauth-pkce-channels').locator('[data-viz-variant="narrow"] svg')
  for (const m of await sq.locator('[data-message][data-channel="front"]').allTextContents()) expect(m).not.toMatch(/code_verifier|access_token|id_token/)
  // Types: A | B admits 3 of 3, A & B 1 of 3.
  const ts = figure(page, 'union-vs-intersection').locator('[data-viz-variant="narrow"]')
  await expect(ts.locator('[data-viz-part="union-span"]')).toContainText('3 of 3')
  await expect(ts.locator('[data-viz-part="both-span"]')).toContainText('1 of 3')
})

test('the stage is a named group described by the text alternative', async ({ page }) => {
  await open(page, 1024)
  for (const [, p] of FIGURES) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
    const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
    expect(description.length, p).toBeGreaterThan(80)
  }
  await expect(figure(page, 'lookup-and-shadowing').locator('details')).toContainText('Marked lookup of alice.toString: alice, then Person.prototype have no own toString; found on Object.prototype.')
  await expect(figure(page, 'event-dispatch-path').locator('details')).toContainText('Verified output, dispatch (Chromium): outer capture, middle capture, inner target, middle bubble, outer bubble')
  await expect(figure(page, 'union-vs-intersection').locator('[data-viz-part="viz-provenance"]')).toHaveText(/TypeScript 5\.9/)
})

test('zero axe violations, closed and open', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page })
        .include('figure[data-viz-kind="static"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(
        result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
        `${label} at ${width}`,
      ).toEqual([])
    }
    await scan('closed')
    for (const [, p] of FIGURES) await figure(page, p).locator('summary').click()
    await scan('text alternative open')
  }
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the figures and their text alternative are complete', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto(URL_)
    for (const [id, p] of FIGURES) {
      expect((await figure(page, p).boundingBox())!.height).toBe(reserve(id, p)[0])
      await figure(page, p).locator('summary').click()
      await expect(figure(page, p).locator('details')).toContainText(/\S/)
    }
  })
})

/** Where each preset is placed (rendered from a local content checkout only). */
const LESSONS: Record<string, { slug: string; source: string; id: string }> = {
  'lookup-and-shadowing': { slug: 'prototypes', id: 'prototype-object-graph', source: 'js-track/core-fundamentals/prototypes/page.mdx' },
  'constructor-fix': { slug: 'prototypes', id: 'prototype-object-graph', source: 'js-track/core-fundamentals/prototypes/page.mdx' },
  'hidden-class-transitions': { slug: 'engine-and-runtime', id: 'annotated-tree', source: 'js-track/core-fundamentals/engine-and-runtime/page.mdx' },
  'union-vs-intersection': { slug: 'advanced-types', id: 'lanes', source: 'js-track/typescript-introduction/advanced-types/page.mdx' },
  'event-dispatch-path': { slug: 'event-handling', id: 'lanes', source: 'js-track/advanced-concepts/event-handling/page.mdx' },
  'debounce-vs-throttle': { slug: 'performance-optimization', id: 'lanes', source: 'js-track/advanced-concepts/performance-optimization/page.mdx' },
  'oauth-pkce-channels': { slug: 'security', id: 'lanes', source: 'js-track/frontend-development/security/page.mdx' },
}

test('in its lesson: the figure, its footprint, nothing wider than the column (local checkout only)', async ({ page }) => {
  const have = Object.entries(LESSONS).filter(([, l]) => fs.existsSync(path.join(process.cwd(), 'src', 'content', l.source)))
  test.skip(!have.length, 'the lessons render from a local content checkout (src/content) only')
  for (const width of [375, 1440])
    for (const [preset, l] of have) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations/lesson/${l.slug}`, { waitUntil: 'load' })
      const f = figure(page, preset)
      await expect(f).toHaveCount(1)
      expect((await f.boundingBox())!.height, `${preset} in ${l.slug} @${width}`).toBe(reserve(l.id, preset)[tierOf(width)])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${l.slug} @${width}`).toBe(true)
    }
})
