import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { annotatedTreeDescriptor } from '../src/components/visualizations/engines/annotated-tree/descriptor'
import { DSA_PRESETS } from '../src/components/visualizations/engines/annotated-tree/presets/dsa'
import { FRONTEND_PRESETS } from '../src/components/visualizations/engines/annotated-tree/presets/frontend'
import type { ResidualPanel } from '../src/components/visualizations/engines/annotated-tree/flow'
import type { CallPanel, GainPanel, GraphPanel, GridPanel, SuffixPanel } from '../src/components/visualizations/engines/annotated-tree/model'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The annotated trees (R4 shared visual "annotated-tree", waves 2D, 3A and 4B) through
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
// The hidden-class trees (wave 3B) the wave 4A DSA figures (`dsa-statics`) and the wave 4D frontend figures (`fe-statics`) are on the JavaScript-track page (`viz-js-statics.spec.ts`).
const PRESETS = annotatedTreeDescriptor.presets.map((p) => p.id).filter((id) => id !== 'hidden-class-transitions' && !DSA_PRESETS.some((d) => d.id === id) && !FRONTEND_PRESETS.some((d) => d.id === id))
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
  await expect(page.locator('[data-viz="annotated-tree"] > [data-viz-ssr]')).toHaveCount(PRESETS.length)
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
      expect(out.shown, `${p} @${width}`).toEqual(
        d.panels.map((x) => (x.kind === 'suffix' || x.kind === 'calls' || (x.kind === 'residual' && x.wide) ? `${x.id}-${width < 768 ? 'narrow' : 'wide'}` : x.id)),
      )
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

test('wave 3A: every drawn value is the recorded one (calls, the spanning tree, the push forest)', async ({ page }) => {
  await open(page, 375)
  const calls = annotatedTreeDescriptor.presets.find((x) => x.id === 'combination-sum-take-skip')!.data.panels[0] as CallPanel
  const tree = page.locator('svg[data-viz-panel="calls-narrow"]')
  const drawn = await tree.locator('[data-node]').evaluateAll((es) => es.map((e) => [Number(e.getAttribute('data-i')), Number(e.getAttribute('data-s')), e.getAttribute('data-t')]))
  expect(drawn).toEqual(calls.nodes.map((n) => [n.i, n.s, n.t.join(',')]))
  const answers = calls.nodes.filter((n) => n.end?.kind === 'answer').map((n) => `[data-viz-part="path"][data-for="${n.id}"]`)
  await expect(tree.locator(answers.join(', '))).toHaveText(['[7]', '[2,2,3]'])
  await expect(tree.locator('[data-end="cut"]')).toHaveCount(8)
  const take = await tree.locator('[data-kind="take"]').count()
  expect(take).toBe(calls.nodes.filter((n) => n.edge === 'take').length)
  // The spanning tree: the accepted edges marked, in order; the two wells never tried unmarked.
  const source = annotatedTreeDescriptor.presets.find((x) => x.id === 'water-wells-virtual-source')!.data.panels[1] as GraphPanel
  const marked = await page.locator('svg[data-viz-panel="source"] [data-edge][data-changed]').evaluateAll((es) => es.map((e) => [e.getAttribute('data-edge'), e.getAttribute('data-accepted')]))
  expect(marked).toEqual(source.edges.filter((e) => e.accepted).map((e) => [`${e.a}-${e.b}`, String(e.accepted)]))
  await expect(page.locator('svg[data-viz-panel="source"] [data-untried]')).toHaveCount(2)
  await expect(page.locator('svg[data-viz-panel="houses"] [data-viz-part="node-note"]')).toHaveText(['well 1', 'well 2', 'well 2'])
  // The push forest: pops numbered in order, one right arrow per push; (1,1) pushed twice by the other rule.
  const [, popped] = annotatedTreeDescriptor.presets.find((x) => x.id === 'k-pairs-lazy-grid')!.data.panels as GridPanel[]
  await expect(page.locator('svg[data-viz-panel="popped"] [data-state="popped"] [data-viz-part="cell-label"]')).toHaveText(['pop 1', 'pop 2', 'pop 3'])
  const arrows = await page.locator('svg[data-viz-panel="popped"] [data-edge]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))
  expect(arrows).toEqual(popped.arrows.map((a) => `${a.from.join(',')}-${a.to.join(',')}`))
  await expect(page.locator('svg[data-viz-panel="twice"] [data-cell="1,1"]')).toHaveAttribute('data-state', 'twice')
  await expect(page.locator('svg[data-viz-panel="twice"] [data-edge][data-to="1,1"]')).toHaveCount(2)
  // The other rule starts from (0,0): 3 is popped first and pushes 5 and 9, which each push 11; only the two arrows into 11 are marked.
  const twicePanel = page.locator('svg[data-viz-panel="twice"]').first()
  expect(await twicePanel.locator('[data-state="pop"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-sum')))).toEqual(['3', '5', '9'])
  expect(await twicePanel.locator('[data-edge]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(['0,0-0,1', '0,0-1,0', '0,1-1,1', '1,0-1,1'])
  expect(await twicePanel.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-to')))).toEqual(['1,1', '1,1'])
})

test('wave 4B: every drawn flow, reverse residual, path and cut is the recorded one', async ({ page }) => {
  await open(page, 375)
  const [one, two, cut] = annotatedTreeDescriptor.presets.find((x) => x.id === 'diamond-reverse-edge')!.data.panels as ResidualPanel[]
  for (const panel of [one, two, cut]) {
    const svg = page.locator(`svg[data-viz-panel="${panel.id}"]`)
    const drawn = await svg.locator('[data-edge]:not([data-reverse])').evaluateAll((es) => es.map((e) => [e.getAttribute('data-edge'), e.getAttribute('data-flow'), e.getAttribute('data-cap')]))
    expect(drawn, panel.id).toEqual(panel.edges.map((e) => [`${e.from}-${e.to}`, String(e.flow), String(e.cap)]))
    await expect(svg.locator('[data-viz-part="flow"]')).toHaveText(panel.edges.map((e) => `${e.flow}/${e.cap}`))
    // One dashed reverse per edge carrying flow, worth that flow.
    const reverses = await svg.locator('[data-reverse]').evaluateAll((es) => es.map((e) => [e.getAttribute('data-edge'), e.getAttribute('data-residual')]))
    expect(reverses, panel.id).toEqual(panel.edges.filter((e) => e.flow > 0).map((e) => [`${e.to}-${e.from}`, String(e.flow)]))
  }
  // Path 1 marks S-A, A-B, B-T; path 2 marks S-B and A-T and runs back along A -> B (its dashed reverse, B -> A).
  const lit = (id: string) => page.locator(`svg[data-viz-panel="${id}"] [data-edge][data-changed]`).evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))
  expect(await lit('path-1')).toEqual(['v0-v1', 'v1-v2', 'v2-v3'])
  expect(await lit('path-2')).toEqual(['v0-v2', 'v2-v1', 'v1-v3'])
  // The cut: S alone shaded, its two edges marked; A -> B carries nothing.
  await expect(page.locator('svg[data-viz-panel="cut"] [data-node][data-cut]')).toHaveCount(1)
  expect(await lit('cut')).toEqual(['v0-v1', 'v0-v2'])
  await expect(page.locator('svg[data-viz-panel="cut"] [data-edge="v1-v2"]')).toHaveAttribute('data-flow', '0')
  // CLRS at the end: 0 reaches 0, 1, 2, 4; the cut edges 1->3, 4->3, 4->5 are marked and full.
  const clrs = page.locator('svg[data-viz-panel="clrs-narrow"]')
  expect(await clrs.locator('[data-node][data-cut]').evaluateAll((es) => es.map((e) => e.getAttribute('data-node')))).toEqual(['v0', 'v1', 'v2', 'v4'])
  expect(await clrs.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => [e.getAttribute('data-edge'), e.getAttribute('data-flow'), e.getAttribute('data-cap')]))).toEqual([
    ['v1-v3', '12', '12'],
    ['v4-v3', '7', '7'],
    ['v4-v5', '4', '4'],
  ])
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
  await expect(figure(page, 'combination-sum-take-skip').locator('details')).toContainText('(0,3) with t [2,2]: skips 2 to (1,3), then takes it to (0,1).')
  await expect(figure(page, 'combination-sum-take-skip').locator('details')).toContainText('Verified output, combination-sum (Node 24.x): [[7],[2,2,3]]')
  await expect(figure(page, 'water-wells-virtual-source').locator('details')).toContainText('Well source 0 to 1, cost 1, accepted 3rd (marked).')
  await expect(figure(page, 'k-pairs-lazy-grid').locator('details')).toContainText('Arrow from (0,0) to (0,1).')
  await expect(figure(page, 'k-pairs-lazy-grid').locator('details')).toContainText('Arrow from (0,0) to (1,0).')
  await expect(figure(page, 'k-pairs-lazy-grid').locator('details')).toContainText('its panel is a structural illustration, not a run')
  await expect(figure(page, 'diamond-reverse-edge').locator('details')).toContainText('the marked path runs back from B to A, cancelling flow')
  await expect(figure(page, 'diamond-reverse-edge').locator('details')).toContainText('Verified output, ff-diamond (Node 24.x): 2')
  await expect(figure(page, 'clrs-23-min-cut').locator('details')).toContainText('Shaded, still reachable from 0: 0, 1, 2, 4.')
  await expect(figure(page, 'clrs-23-min-cut').locator('details')).toContainText('Verified output, ek-clrs (Node 24.x): 23')
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
  'combination-sum-take-skip': { slug: 'backtracking', source: 'dsa-track/common-techniques/backtracking/page.mdx' },
  'water-wells-virtual-source': { slug: 'minimum-spanning-trees', source: 'dsa-track/advanced-topics/minimum-spanning-trees/page.mdx' },
  'k-pairs-lazy-grid': { slug: 'k-way-merge', source: 'dsa-track/common-techniques/k-way-merge/page.mdx' },
  // Wave 4B (the diamond is placed in network-flow-algorithms too, before the CLRS cut).
  'diamond-reverse-edge': { slug: 'maximum-flow', source: 'dsa-track/advanced-topics/maximum-flow/page.mdx' },
  'clrs-23-min-cut': { slug: 'network-flow-algorithms', source: 'dsa-track/advanced-topics/network-flow-algorithms/page.mdx' },
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
