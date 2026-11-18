import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import type { ForestPanel, HeapPanel, IntervalPanel, RecursionPanel, SegmentPanel } from '../src/components/visualizations/engines/annotated-tree/dsa'
import { DSA_PRESETS } from '../src/components/visualizations/engines/annotated-tree/presets/dsa'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The wave 4A DSA-track figures (five annotated-tree presets) through the
 * real `<Viz>` mount on `/dev/visualizations?dsa=static`: the segment tree,
 * the union-find forest, the heap tree over its array, the fib call trees
 * and the interval dp table. Final server
 * SVG (no chunk on a hard load), the entry-table footprint at every width
 * and under a client-side mount, nothing outside its svg or stage, the
 * drawn values the recorded ones, axe clean, complete without JavaScript,
 * and each figure in its lesson where the local content checkout has it.
 */

const URL_ = '/dev/visualizations?dsa=static'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const FIGURES = DSA_PRESETS.map((p) => ['annotated-tree', p.id] as const)
const data = (id: string) => DSA_PRESETS.find((p) => p.id === id)!.data.panels
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
  expect([...scripts].filter((u) => /annotated-tree|visualizations_engines/.test(u))).toEqual([])
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

test('the drawn values and marks are the recorded ones', async ({ page }) => {
  await open(page, 375)
  // Segment tree: every node's range, sum and index; the cover of query(1, 3); the update path; the lazy tags.
  const seg = data('segment-tree-query-cover') as SegmentPanel[]
  for (const p of seg) {
    const svg = figure(page, 'segment-tree-query-cover').locator(`svg[data-viz-panel="${p.id}"]`)
    const drawn = await svg.locator('[data-node]').evaluateAll((es) => es.map((e) => [e.getAttribute('data-node'), e.getAttribute('data-range'), e.getAttribute('data-sum'), e.getAttribute('data-cover'), e.getAttribute('data-tag')]))
    expect(drawn, p.id).toEqual(p.nodes.map((n) => [String(n.idx), `${n.start},${n.end}`, String(n.sum), n.cover ?? null, n.tag ? String(n.tag) : null]))
  }
  const q = figure(page, 'segment-tree-query-cover').locator('svg[data-viz-panel="query"]')
  expect(await q.locator('[data-node][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-range')))).toEqual(['2,2', '1,1', '3,3'])
  await expect(q.locator('[data-cover="disjoint"] rect.vz-d')).toHaveCount(3)
  const up = figure(page, 'segment-tree-query-cover').locator('svg[data-viz-panel="update"]')
  await expect(up.locator('[data-path] [data-viz-part="sum"]')).toHaveText(['36→43', '9→16', '4→11', '3→10'])
  await expect(up.locator('[data-edge][data-changed]')).toHaveCount(3)
  await expect(figure(page, 'segment-tree-query-cover').locator('svg[data-viz-panel="lazy-tags"] [data-viz-part="lazy-tag"]')).toHaveText(['+10', '+10'])
  // Union-find: node i in column i, its arrow to parent[i], the parent[] cells the call wrote marked.
  for (const p of data('dsu-parent-forest') as ForestPanel[]) {
    const svg = figure(page, 'dsu-parent-forest').locator(`svg[data-viz-panel="${p.id}"]`)
    expect(await svg.locator('[data-node]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-parent'))))).toEqual(p.parent)
    expect(await svg.locator('[data-edge]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(p.parent.flatMap((v, i) => (v === i ? [] : [`${i}-${v}`])))
    expect(await svg.locator('[data-row="parent"] [data-cell]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-value'))))).toEqual(p.parent)
    expect(await svg.locator('[data-row="parent"] [data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-cell')))).toEqual(p.changed.map((i) => `parent:${i}`))
    await expect(svg.locator('[data-link]')).toHaveCount(p.parent.length)
  }
  // Heap: the array cells, one link per cell, the formulas on the root's edges, the smaller child marked.
  for (const p of data('insert-4-10-3-5-1-then-extract') as HeapPanel[]) {
    const svg = figure(page, 'insert-4-10-3-5-1-then-extract').locator(`svg[data-viz-panel="${p.id}"]`)
    expect(await svg.locator('[data-cell]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-value'))))).toEqual(p.heap)
    expect(await svg.locator('[data-node]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-value'))))).toEqual(p.heap)
    await expect(svg.locator('[data-link]')).toHaveCount(p.heap.length)
  }
  const heap = figure(page, 'insert-4-10-3-5-1-then-extract')
  await expect(heap.locator('svg[data-viz-panel="inserted"] [data-viz-part="formula"]')).toHaveText(['2i+1', '2i+2'])
  await expect(heap.locator('svg[data-viz-panel="moved"] [data-node][data-changed]')).toHaveAttribute('data-value', '3')
  await expect(heap.locator('svg[data-viz-panel="sifted"] [data-node][data-changed]')).toHaveAttribute('data-value', '5')
  // Fib: 15 and 9 calls; the repeated subproblems marked; memo[2] and memo[3] hit; the memo table in write order.
  const [naive, memo] = data('fib5') as RecursionPanel[]
  const fib = figure(page, 'fib5')
  expect(await fib.locator('svg[data-viz-panel="naive"] [data-node]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-n'))))).toEqual(naive.nodes.map((n) => n.n))
  await expect(fib.locator('svg[data-viz-panel="naive"] [data-repeat]')).toHaveCount(5)
  await expect(fib.locator('svg[data-viz-panel="memo"] [data-node]')).toHaveCount(memo.nodes.length)
  await expect(fib.locator('svg[data-viz-panel="memo"] [data-viz-part="memo-hit"]')).toHaveText(['memo[2]', 'memo[3]'])
  expect(await fib.locator('svg[data-viz-panel="memo"] [data-row="memo"] [data-cell]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-value'))))).toEqual([1, 2, 3, 5])
  // LPS: row 0 is 1 2 3 3 4; dp[0][4] marked with the used arrow to dp[1][3]; both orders numbered.
  const [table, byLength, byRow] = data('lps-interval-triangle') as IntervalPanel[]
  const lps = figure(page, 'lps-interval-triangle')
  expect(await lps.locator('svg[data-viz-panel="table"] [data-cell]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-value'))))).toEqual(table.cells.map((c) => c.value))
  await expect(lps.locator('svg[data-viz-panel="table"] [data-edge][data-used]')).toHaveAttribute('data-to', '1,3')
  for (const p of [byLength, byRow]) {
    const orders = await lps.locator(`svg[data-viz-panel="${p.id}"] [data-cell][data-order]`).evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-order'))))
    expect(orders, p.id).toEqual(p.cells.filter((c) => c.order !== undefined).map((c) => c.order))
  }
})

test('the stage is a named group described by the text alternative', async ({ page }) => {
  await open(page, 1024)
  for (const [, p] of FIGURES) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
    const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
    expect(description.length, p).toBeGreaterThan(80)
  }
  await expect(figure(page, 'segment-tree-query-cover').locator('details')).toContainText('Node 8 [1,1]: sum 3, full (marked).')
  await expect(figure(page, 'dsu-parent-forest').locator('details')).toContainText('Verified output, union-find-rank (Node 24.x): 1, 1, 1, 4')
  await expect(figure(page, 'insert-4-10-3-5-1-then-extract').locator('details')).toContainText('Array [1, 3, 4, 10, 5], read as a tree by index.')
  await expect(figure(page, 'fib5').locator('details')).toContainText('Memo writes, in order: memo[2] = 1, memo[3] = 2, memo[4] = 3, memo[5] = 5.')
  await expect(figure(page, 'lps-interval-triangle').locator('details')).toContainText('dp[0][4] (marked) reads dp[1][3] (used here), dp[1][4], dp[0][3].')
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
  'segment-tree-query-cover': { slug: 'segment-trees', id: 'annotated-tree', source: 'dsa-track/advanced-topics/segment-trees/page.mdx' },
  'dsu-parent-forest': { slug: 'union-find', id: 'annotated-tree', source: 'dsa-track/advanced-topics/union-find/page.mdx' },
  'insert-4-10-3-5-1-then-extract': { slug: 'heaps', id: 'annotated-tree', source: 'dsa-track/user-defined-data-structures/heaps/page.mdx' },
  fib5: { slug: 'recursion-and-memoization', id: 'annotated-tree', source: 'dsa-track/common-techniques/recursion-and-memoization/page.mdx' },
  'lps-interval-triangle': { slug: 'palindromic-subsequence', id: 'annotated-tree', source: 'dsa-track/common-techniques/palindromic-subsequence/page.mdx' },
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
