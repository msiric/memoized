import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { AX_RECORDING, FRONTEND_PRESETS, GIT_RECORDING, STATE_RECORDING } from '../src/components/visualizations/engines/annotated-tree/presets/frontend'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'

/**
 * The wave 4D frontend figures (four annotated-tree presets on the `boxes`
 * panel kind) through the real `<Viz>` mount on `/dev/visualizations?fe=static`:
 * the context render causes, the Module Federation share scope, the DOM
 * beside its accessibility tree and the commit graphs. Final server
 * SVG (no chunk on a hard load), the entry-table footprint at every width
 * and under a client-side mount, nothing outside its svg or stage, the
 * drawn values the recorded ones, axe clean, complete without JavaScript,
 * and each figure in its lesson where the local content checkout has it.
 */

const URL_ = '/dev/visualizations?fe=static'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const FIGURES = FRONTEND_PRESETS.map((p) => ['annotated-tree', p.id] as const)
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
  // State management: each component's render state is the recorded one; the carrying edges; the memo glyph.
  const ctx = figure(page, 'context-render-causes')
  for (const id of ['split', 'split-memo', 'providers'] as const) {
    const svg = ctx.locator(`svg[data-viz-panel="${id}"]`)
    const rendered = await svg.locator('[data-node][data-rendered]').evaluateAll((es) => es.map((e) => e.getAttribute('data-node')))
    expect(rendered, id).toEqual(STATE_RECORDING.runs[id].afterSetUser)
    expect(await svg.locator('[data-node][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-node'))), id).toEqual(STATE_RECORDING.runs[id].afterSetUser)
  }
  await expect(ctx.locator('svg[data-viz-panel="split-memo"] [data-viz-part="edge-tag"]')).toHaveText('memo')
  await expect(ctx.locator('svg[data-viz-panel="providers"] [data-viz-part="cause"]')).toHaveText(['skipped', 'skipped', 'set: owns user', 'skipped', 'context changed'])
  // Module Federation: one shared copy with singleton, cart's own without; the warning on cart's arrow.
  const fed = figure(page, 'federation-react-singleton')
  expect(await fed.locator('svg[data-viz-panel="singleton"] [data-node^="react-"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-version')))).toEqual(['19.0.0'])
  expect(await fed.locator('svg[data-viz-panel="unshared"] [data-node^="react-"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-version')))).toEqual(['19.0.0', '18.3.1'])
  await expect(fed.locator('svg[data-viz-panel="singleton"] [data-edge][data-from="cart"] [data-viz-part="edge-tag"]')).toHaveText('warning')
  await expect(fed.locator('svg[data-viz-panel="unshared"] [data-edge][data-from="cart"]')).toHaveAttribute('data-to', 'react-cart')
  // Accessibility: the struck rows are the elements Chromium leaves out; the Tab badges; the overridden role.
  const ax = figure(page, 'dom-vs-accessibility-tree')
  const exposed = new Set(AX_RECORDING.ax.map((n) => n.dom))
  expect(await ax.locator('svg[data-viz-panel="dom"] [data-node][data-state="gone"]').evaluateAll((es) => es.map((e) => Number(e.getAttribute('data-dom'))))).toEqual(AX_RECORDING.dom.filter((d) => !exposed.has(d.id)).map((d) => d.id))
  await expect(ax.locator('svg[data-viz-panel="dom"] [data-viz-part="tab"]')).toHaveText(['1', '2', '3'])
  await expect(ax.locator('svg[data-viz-panel="dom"] [data-viz-part="tab"][data-changed]')).toHaveText('2')
  await expect(ax.locator('svg[data-viz-panel="ax"] [data-node][data-changed]')).toHaveAttribute('data-role', 'button')
  await expect(ax.locator('svg[data-viz-panel="dom"] [data-edge]')).toHaveCount(1)
  // Git: each panel's commits and parents are the recorded ones; ghosts are the unreferenced commits.
  const git = figure(page, 'merge-rebase-squash-revert-reset')
  for (const id of ['merge', 'rebase', 'squash', 'revert', 'reset'] as const) {
    const svg = git.locator(`svg[data-viz-panel="${id}"]`)
    const run = GIT_RECORDING.panels[id]
    for (const [hash, parents] of await svg.locator('[data-node]').evaluateAll((es) => es.map((e) => [e.getAttribute('data-hash'), e.getAttribute('data-parents')])))
      expect(run.commits.find((c) => c.hash === hash)!.parents.join(','), `${id} ${hash}`).toBe(parents)
    expect(await svg.locator('[data-node][data-state="ghost"]').evaluateAll((es) => es.map((e) => e.getAttribute('data-hash')).sort())).toEqual([...run.unreachable].sort())
  }
  await expect(git.locator('svg[data-viz-panel="reset"] [data-viz-part="ref"]')).toHaveText(['origin/main', 'HEAD@{1}', 'HEAD→main'])
})

test('the stage is a named group described by the text alternative', async ({ page }) => {
  await open(page, 1024)
  for (const [, p] of FIGURES) {
    const stage = figure(page, p).locator('[data-viz-region="stage"]')
    await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
    const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
    expect(description.length, p).toBeGreaterThan(80)
  }
  await expect(figure(page, 'context-render-causes').locator('details')).toContainText('Sidebar: does not render (skipped: memo).')
  await expect(figure(page, 'federation-react-singleton').locator('details')).toContainText("cart (requires ^18.0.0) gets react 19.0.0, shell's copy")
  await expect(figure(page, 'dom-vs-accessibility-tree').locator('details')).toContainText('Tab stop 2 (marked)')
  await expect(figure(page, 'merge-rebase-squash-revert-reset').locator('details')).toContainText('Verified output, git-reset')
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
  'context-render-causes': { slug: 'state-management', id: 'annotated-tree', source: 'js-track/frontend-development/state-management/page.mdx' },
  'federation-react-singleton': { slug: 'micro-frontends', id: 'annotated-tree', source: 'js-track/frontend-development/micro-frontends/page.mdx' },
  'dom-vs-accessibility-tree': { slug: 'accessibility', id: 'annotated-tree', source: 'js-track/frontend-development/accessibility/page.mdx' },
  'merge-rebase-squash-revert-reset': { slug: 'git', id: 'annotated-tree', source: 'js-track/frontend-development/git/page.mdx' },
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
