import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { annotatedTreeDescriptor } from '../src/components/visualizations/engines/annotated-tree/descriptor'
import type { GainPanel, SuffixPanel } from '../src/components/visualizations/engines/annotated-tree/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The annotated trees (R4 shared visual "annotated-tree", wave 2D) through
 * the real `<Viz>` mount on `/dev/visualizations?at=static`: final server
 * SVG (no chunk on a hard load), the entry-table footprint at every width
 * and under a client-side mount, nothing outside its svg or stage, every
 * drawn value the recorded one, axe clean, complete without JavaScript, and
 * each figure in its lesson where the local content checkout has the lesson
 * (the three lessons are premium: CI has none, so that test skips there).
 */

const URL_ = '/dev/visualizations?at=static'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const FOOTPRINT = VIZ_TABLE['annotated-tree'][3]!
const PRESETS = annotatedTreeDescriptor.presets.map((p) => p.id)
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

test('hard load ships no visualization JavaScript: the trees are final server SVG', async ({ page }) => {
  const scripts = new Set<string>()
  const on = (r: Request) => {
    if (r.resourceType() === 'script') scripts.add(new URL(r.url()).pathname)
  }
  page.on('request', on)
  await page.goto(URL_, { waitUntil: 'networkidle' })
  for (const p of PRESETS) await figure(page, p).scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  page.off('request', on)
  expect([...scripts].filter((u) => /annotated-tree|visualizations_engines/.test(u))).toEqual([])
  await expect(page.locator('[data-viz="annotated-tree"] > [data-viz-ssr]')).toHaveCount(3)
})

test('the reserved footprint at every width; nothing outside its svg, its stage or the page', async ({ page }) => {
  for (const width of WIDTHS) {
    await open(page, width)
    for (const p of PRESETS) {
      expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(FOOTPRINT[p][tierOf(width)])
      const out = await figure(page, p).evaluate((fig) => {
        const bad: string[] = []
        const st = fig.querySelector('[data-viz-region="stage"]')!.getBoundingClientRect()
        const shown = [...fig.querySelectorAll<SVGSVGElement>('svg[data-viz-panel]')].filter((s) => s.getBoundingClientRect().width > 0)
        for (const s of shown) {
          const r = s.getBoundingClientRect()
          const b = s.getBBox()
          if (r.left < st.left - 0.5 || r.right > st.right + 0.5 || r.bottom > st.bottom + 0.5) bad.push(`${s.dataset.vizPanel} leaves the stage`)
          if (b.x < -1 || b.y < -1 || b.x + b.width > s.viewBox.baseVal.width + 1 || b.y + b.height > s.viewBox.baseVal.height + 1)
            bad.push(`${s.dataset.vizPanel}: drawing outside its svg (${Math.round(b.x)}, ${Math.round(b.width)})`)
          // Every text run inside the svg's own box.
          for (const t of s.querySelectorAll<SVGTextElement>('text')) {
            const tb = t.getBBox()
            if (tb.x < -1 || tb.x + tb.width > s.viewBox.baseVal.width + 1) bad.push(`${s.dataset.vizPanel}: "${t.textContent}" overflows`)
          }
        }
        for (const sec of fig.querySelectorAll<HTMLElement>('[data-viz-section]'))
          if (sec.scrollHeight > sec.clientHeight + 1) bad.push(`${sec.dataset.vizSection} clips vertically`)
        return { bad, shown: shown.map((s) => s.dataset.vizPanel) }
      })
      expect(out.bad, `${p} @${width}`).toEqual([])
      // One svg per panel on screen: the suffix tree's own for the variant.
      const d = annotatedTreeDescriptor.presets.find((x) => x.id === p)!.data
      expect(out.shown, `${p} @${width}`).toEqual(d.panels.map((x) => (x.kind === 'suffix' ? `${x.id}-${width < 768 ? 'narrow' : 'wide'}` : x.id)))
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `page @${width}`).toBe(true)
  }
})

test('client-only render reserves each preset footprint, then the same figure', async ({ page }) => {
  for (const width of [375, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${URL_}&mount=client`, { waitUntil: 'networkidle' })
    for (const p of PRESETS) {
      await figure(page, p).scrollIntoViewIfNeeded()
      expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(FOOTPRINT[p][tierOf(width)])
    }
  }
})

test('every drawn value is the recorded one', async ({ page }) => {
  await open(page, 375)
  const [main, inset] = annotatedTreeDescriptor.presets[0].data.panels as GainPanel[]
  for (const panel of [main, inset]) {
    const svg = page.locator(`svg[data-viz-panel="${panel.id}"]`)
    for (const n of Object.values(panel.nodes)) {
      const g = svg.locator(`[data-node="${n.id}"]`)
      await expect(g).toHaveAttribute('data-through', String(n.through))
      await expect(g.locator('[data-viz-part="through"]')).toHaveText(String(n.through))
    }
  }
  // The marked path 15-20-7: two marked edges under 20, none to its parent.
  const lit = await page.locator('svg[data-viz-panel="gains"] [data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))
  expect(lit).toEqual(['nr-nrl', 'nr-nrr'])
  await expect(page.locator('svg[data-viz-panel="clamp"] [data-viz-part="clamp"]')).toHaveText('max(0, -9)= 0')
  // The trie: END rings on the four words, the cleared flag, the pruned ghost.
  await expect(page.locator('svg[data-viz-panel="search"] [data-end] [data-viz-part="end-ring"]')).toHaveCount(4)
  await expect(page.locator('svg[data-viz-panel="delete-app"] [data-node="app"]')).toHaveAttribute('data-mark', 'cleared')
  await expect(page.locator('svg[data-viz-panel="delete-applet"] [data-node="applet"]')).toHaveAttribute('data-mark', 'pruned')
  await expect(page.locator('svg[data-viz-panel="search"] [data-viz-part="returned"]')).toHaveText(['false', 'true'])
  // The suffix tree: leaves top to bottom are the suffix array; 'ana' and LCP 3 are marked.
  const s = annotatedTreeDescriptor.presets[2].data.panels[0] as SuffixPanel
  const narrow = page.locator('svg[data-viz-panel="suffix-tree-narrow"]')
  const leaves = await narrow.locator('[data-leaf]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-leaf'))))
  expect(leaves).toEqual(s.rows.map((r) => r.sa))
  await expect(narrow.locator('[data-path="ana"]')).toHaveAttribute('data-changed', '')
  await expect(narrow.locator('[data-rank][data-changed] [data-viz-part="lcp"]')).toHaveText('3')
})

test('the stage is a named group described by the text alternative, with each verified output', async ({ page }) => {
  await open(page, 1024)
  for (const p of PRESETS) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
    const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
    expect(description).toMatch(/Verified output/)
  }
  await expect(figure(page, 'max-path-gain-vs-through').locator('details')).toContainText('20: takes 15 from the left and 7 from the right, through = 15 + 7 + 20 = 42, returns 35')
  await expect(figure(page, 'trie-end-markers').locator('details')).toContainText('Verified output, trie-search (Node 24.x): false, true')
  await expect(figure(page, 'trie-end-markers').locator('details')).not.toContainText('trie-delete (Node')
  await expect(figure(page, 'suffix-tree-banana').locator('details')).toContainText('Suffix array (leaves top to bottom): 6, 5, 3, 1, 0, 4, 2.')
})

test('zero axe violations, closed and open', async ({ page }) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page })
        .include('[data-viz="annotated-tree"]')
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
    await page.goto(URL_)
    for (const p of PRESETS) {
      expect((await figure(page, p).boundingBox())!.height).toBe(FOOTPRINT[p][0])
      await figure(page, p).locator('summary').click()
      await expect(figure(page, p).locator('details')).toContainText('Verified output')
    }
  })
})

/** The lesson each preset is placed in (premium: rendered only from a local content checkout). */
const LESSONS: Record<string, { slug: string; source: string }> = {
  'max-path-gain-vs-through': { slug: 'tree-dfs', source: 'dsa-track/common-techniques/tree-dfs/page.mdx' },
  'trie-end-markers': { slug: 'tries', source: 'dsa-track/user-defined-data-structures/tries/page.mdx' },
  'suffix-tree-banana': { slug: 'suffix-arrays-and-suffix-trees', source: 'dsa-track/advanced-topics/suffix-arrays-and-suffix-trees/page.mdx' },
}

test('in its lesson: the figure, its footprint, nothing wider than the column (local checkout only)', async ({ page }) => {
  const have = Object.entries(LESSONS).filter(([, l]) => fs.existsSync(path.join(process.cwd(), 'src', 'content', l.source)))
  test.skip(!have.length, 'the annotated-tree lessons are premium: they render from a local content checkout (src/content) only')
  for (const width of [375, 1440])
    for (const [preset, l] of have) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations/lesson/${l.slug}`, { waitUntil: 'load' })
      const f = figure(page, preset)
      await expect(f).toHaveCount(1)
      expect((await f.boundingBox())!.height, `${preset} in ${l.slug} @${width}`).toBe(FOOTPRINT[preset][tierOf(width)])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${l.slug} @${width}`).toBe(true)
    }
})
