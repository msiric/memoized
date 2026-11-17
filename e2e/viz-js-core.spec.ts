import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Request } from '@playwright/test'
import { eventLoopDescriptor } from '../src/components/visualizations/engines/event-loop/descriptor'
import { VIZ_TABLE } from '../src/components/visualizations/entry-table'
import { localOnly, localOnlyNote } from './premium'

/**
 * Wave 4C, the JavaScript core visuals, through the real `<Viz>` mount.
 *
 * Static figures on `/dev/visualizations?core=static` (the reachability heap
 * graphs, the two-chain prototype graph): final server SVG, the entry-table
 * footprint at every width and under a client mount, nothing outside its svg
 * or stage, the drawn marks the recorded ones, axe, complete without
 * JavaScript, and each in its lesson where the local checkout has it.
 *
 * Event-loop lesson groups on `?el=<preset>` (Exercise 2; the call-stack
 * traces, local-only: their group reads a practice question): each question
 * asked on the step before its reveal, the finale's console and trace the
 * recorded run, frames within about 850 px at 375, and the 375x667 fit at
 * every step with the lesson's site header reserved.
 */

const CORE_URL = '/dev/visualizations?core=static'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
const FIGURES = [
  ['heap-graph', 'gc-reachability-cycle-and-weak-edge'],
  ['heap-graph', 'retainer-paths'],
  ['prototype-object-graph', 'extends-two-chains'],
] as const
const STEPS = ['exercise-2-async1-async2', 'who-called-inner', 'await-async-frames'] as const
const reserve = (id: string, preset: string) => VIZ_TABLE[id][3]![preset]
const tierOf = (width: number) => (width < 768 ? 0 : width < 1280 ? 1 : 2)
const figure = (page: Page, preset: string) => page.locator(`figure[data-viz-preset="${preset}"]`)
const EL = '[data-viz="event-loop"] section'
const logOf = (preset: string) => eventLoopDescriptor.presets.find((p) => p.id === preset)!.log
const skipped = (preset: string) => {
  if (!localOnly('event-loop', preset)) return false
  test.info().annotations.push({ type: 'skipped preset', description: localOnlyNote('event-loop', preset) })
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

async function open(page: Page, width: number, query = '') {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(`${CORE_URL}${query}`, { waitUntil: 'load' })
}

async function openStep(page: Page, preset: string, width = 1024, height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto(`/dev/visualizations?el=${preset}`, { waitUntil: 'load' })
  // The frame is replaced when it hydrates: wait for the live one before touching it.
  await expect(page.locator(`${EL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  return f
}

test.describe('static figures', () => {
  test('hard load ships no visualization JavaScript: the figures are final server SVG', async ({ page }) => {
    const scripts = new Set<string>()
    const on = (r: Request) => {
      if (r.resourceType() === 'script') scripts.add(new URL(r.url()).pathname)
    }
    page.on('request', on)
    await page.goto(CORE_URL, { waitUntil: 'networkidle' })
    for (const [, p] of FIGURES) await figure(page, p).scrollIntoViewIfNeeded()
    await page.waitForTimeout(1000)
    page.off('request', on)
    expect([...scripts].filter((u) => /heap-graph|prototype|visualizations_engines/.test(u))).toEqual([])
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
          const shown = [...fig.querySelectorAll<SVGSVGElement>('[data-viz-region="stage"] svg')].filter((s) => s.getBoundingClientRect().width > 0)
          if (!shown.length) out.push('no drawing on screen')
          for (const s of shown) {
            const r = s.getBoundingClientRect()
            const vb = s.viewBox.baseVal
            // The drawing without the names' touch bands (`.vz-hit`, 7 px beyond a name by design).
            const parts = [...s.querySelectorAll<SVGGraphicsElement>(':scope > g, :scope > text')].flatMap((g) =>
              g.matches('g:has(> .vz-hit)') ? [...g.querySelectorAll<SVGGraphicsElement>(':scope > :not(.vz-hit)')] : [g],
            )
            const boxes = parts.map((g) => g.getBBox()).filter((x) => x.width || x.height)
            const b = {
              x: Math.min(...boxes.map((x) => x.x)),
              y: Math.min(...boxes.map((x) => x.y)),
              width: Math.max(...boxes.map((x) => x.x + x.width)) - Math.min(...boxes.map((x) => x.x)),
              height: Math.max(...boxes.map((x) => x.y + x.height)) - Math.min(...boxes.map((x) => x.y)),
            }
            if (r.left < st.left - 0.5 || r.right > st.right + 0.5 || r.bottom > st.bottom + 0.5) out.push('an svg leaves the stage')
            if (b.x < -1 || b.y < -1 || b.x + b.width > vb.width + 1 || b.y + b.height > vb.height + 1) out.push('drawing outside its svg')
            for (const t of s.querySelectorAll<SVGTextElement>('text')) {
              const tb = t.getBBox()
              if (tb.x < -1 || tb.x + tb.width > vb.width + 1) out.push(`"${t.textContent}" overflows`)
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
      await page.goto(`${CORE_URL}&mount=client`, { waitUntil: 'networkidle' })
      for (const [id, p] of FIGURES) {
        await figure(page, p).scrollIntoViewIfNeeded()
        expect((await figure(page, p).boundingBox())!.height, `${p} @${width}`).toBe(reserve(id, p)[tierOf(width)])
      }
    }
  })

  test('the drawn marks are the recorded ones', async ({ page }) => {
    await open(page, 375)
    const shown = (preset: string, panel: string) => figure(page, preset).locator(`[data-viz-section="${panel}"] svg >> visible=true`).first()
    // Memory Management: the held cycle is all live; cleared, both nodes greyed with one reference each; the weak key dashed.
    await expect(shown('gc-reachability-cycle-and-weak-edge', 'held').locator('[data-node][data-gone]')).toHaveCount(0)
    const cleared = shown('gc-reachability-cycle-and-weak-edge', 'cleared')
    await expect(cleared.locator('[data-node][data-gone]')).toHaveCount(2)
    await expect(cleared.locator('[data-node][data-gone] [data-viz-part="badge"]')).toHaveText(['rc 1', 'rc 1'])
    await expect(cleared.locator('[data-viz-part="island"]')).toHaveText('collectible')
    const weak = shown('gc-reachability-cycle-and-weak-edge', 'weak')
    await expect(weak.locator('[data-edge][data-weak] .vz-d')).toHaveCount(1)
    await expect(weak.locator('[data-node][data-gone]')).toHaveCount(2)
    // Memory Leaks: the cache link marked, the subtree collapsed and live; the keys Map's link marked; the shared context.
    const cache = shown('retainer-paths', 'cache')
    expect(await cache.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(["ref:o1.'panel'"])
    await expect(cache.locator('[data-viz-part="note"]').first()).toHaveText('100 li')
    await expect(cache.locator('[data-node][data-gone]')).toHaveCount(0)
    await expect(shown('retainer-paths', 'weak-held').locator('[data-edge][data-weak]')).toHaveCount(1)
    const ctx = shown('retainer-paths', 'context')
    expect(await ctx.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(['ref:handler.context'])
    await expect(ctx.locator('[data-node="huge"]')).not.toHaveAttribute('data-gone', '')
    // Objects and Classes: two chains; the super hop marked; Car's own link to Function.prototype.
    const ext = figure(page, 'extends-two-chains').locator('svg[data-viz-panel="extends"]')
    expect(await ext.locator('[data-kind="proto"]').evaluateAll((es) => es.map((e) => `${e.getAttribute('data-from')}>${e.getAttribute('data-to')}`).sort())).toEqual(
      ['Animal.prototype>Object.prototype', 'Animal>Function.prototype', 'Dog.prototype>Animal.prototype', 'Dog>Animal', 'Function.prototype>Object.prototype', 'Object.prototype>null', 'rex>Dog.prototype'].sort(),
    )
    expect(await ext.locator('[data-edge][data-changed]').evaluateAll((es) => es.map((e) => e.getAttribute('data-edge')))).toEqual(['proto:Dog.prototype'])
    await expect(ext.locator('[data-node="Animal.prototype"] [data-changed]')).toHaveCount(1)
    const manual = figure(page, 'extends-two-chains').locator('svg[data-viz-panel="manual"]')
    await expect(manual.locator('[data-edge="proto:Car"]')).toHaveAttribute('data-to', 'Function.prototype')
    await expect(manual.locator('[data-viz-part="result"]')).toContainText('Toyota is driving.')
  })

  test('the stage is a named group described by the text alternative', async ({ page }) => {
    await open(page, 1024)
    for (const [, p] of FIGURES) {
      const stage = figure(page, p).locator('[data-viz-region="stage"]')
      await expect(stage).toHaveAccessibleName((await figure(page, p).locator('p').first().textContent())!)
      const description = await stage.evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')!)!.textContent!)
      expect(description.length, p).toBeGreaterThan(80)
    }
    await expect(figure(page, 'gc-reachability-cycle-and-weak-edge').locator('details')).toContainText('Collectible: Node B, Node C: no root reaches them through strong references.')
    await expect(figure(page, 'extends-two-chains').locator('details')).toContainText("The constructor Dog's own chain: Dog → Animal → Function.prototype → Object.prototype.")
    await expect(figure(page, 'retainer-paths').locator('[data-viz-part="viz-provenance"]')).toHaveText(/chromium/i)
  })

  test('zero axe violations, closed and open', async ({ page }) => {
    for (const width of [375, 1024]) {
      await open(page, width)
      const scan = async (label: string) => {
        const result = await new AxeBuilder({ page })
          .include('figure[data-viz-kind="static"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`), `${label} at ${width}`).toEqual([])
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
      await page.goto(CORE_URL)
      for (const [id, p] of FIGURES) {
        expect((await figure(page, p).boundingBox())!.height).toBe(reserve(id, p)[0])
        await figure(page, p).locator('summary').click()
        await expect(figure(page, p).locator('details')).toContainText(/\S/)
      }
    })
  })
})

test.describe('event-loop lesson groups', () => {
  test('Exercise 2: asked after Script End, before async1 resumes; the finale is the recorded log', async ({ page }) => {
    const f = await openStep(page, 'exercise-2-async1-async2')
    await f.getByRole('slider').focus()
    for (let g = 0; g < 30 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
    await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('What logs after Script End?')
    expect(Number(await f.getAttribute('data-viz-step'))).toBe(12)
    expect(await f.locator('[data-viz-region="console"] [data-out] span[title]').allTextContents()).toEqual(['Script Start', 'Async 1 Start', 'Async 2', 'Promise 1', 'Script End'])
    await page.keyboard.press('1')
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    const out = await f.locator('[data-viz-region="console"] [data-out] span[title]').allTextContents()
    expect(out).toEqual(logOf('exercise-2-async1-async2').observed.log)
  })

  test('the timer trace: inner and the timer frames, no outer (local-only)', async ({ page }) => {
    test.skip(skipped('who-called-inner'), localOnlyNote('event-loop', 'who-called-inner'))
    const f = await openStep(page, 'who-called-inner')
    await f.getByRole('slider').focus()
    for (let g = 0; g < 30 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) await page.keyboard.press('ArrowRight')
    await expect(f.locator('[data-viz-part="viz-prompt"]')).toHaveText('Which frames will console.trace() print?')
    await expect(f.locator('[data-trace]')).toHaveCount(0)
    await page.keyboard.press('2')
    await page.waitForTimeout(1500)
    const frames = await f.locator('[data-trace] > span:nth-child(2)').allTextContents()
    expect(frames).toEqual(logOf('who-called-inner').observed.log!.slice(1))
    expect(frames.join(' ')).not.toMatch(/outer/)
    expect(await f.locator('[data-viz-region="stack"]').innerText()).toMatch(/inner/)
  })

  test('the await contrast: o2, then async o1, though o1 is off the stack (local-only)', async ({ page }) => {
    test.skip(skipped('await-async-frames'), localOnlyNote('event-loop', 'await-async-frames'))
    const f = await openStep(page, 'await-async-frames')
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(1500)
    expect(await f.locator('[data-trace] > span:nth-child(2)').allTextContents()).toEqual(['o2', 'async o1'])
    expect(await f.locator('[data-viz-region="stack"]').innerText()).not.toMatch(/o1/)
  })

  // The flagship's phone fit (Q15): at 375×667, with the code pane scrolled to just under the site header,
  // the current line, the changed glyphs, the caption and Next are all on screen at every step of every
  // preset, and every choice label stays on one line. The gallery has no site header, so the lesson's
  // (56 px, fixed) is reserved: as strict as a lesson.
  const LESSON_HEADER = 56
  test('375×667: code line, changed glyphs, caption and Next fit under the site header at every step', async ({ page }) => {
    test.setTimeout(300_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const preset of STEPS) {
      if (skipped(preset)) continue
      const f = await openStep(page, preset, 375, 667)
      await f.getByRole('slider').focus()
      for (let i = 0; i <= 40; i++) {
        const v = await page.evaluate(
          ([sel, reserve]) => {
            const root = document.querySelector(sel)!
            const header = [...document.querySelectorAll('div.fixed')].map((e) => e.getBoundingClientRect()).find((r) => r.top <= 0 && r.height > 30 && r.height < 120)
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
              changed: [...root.querySelectorAll('[data-focus]')].every(visible),
              caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
              next: visible(root.querySelector('[data-viz-part="viz-next"]')),
              step: root.getAttribute('data-viz-step'),
              mode: root.getAttribute('data-viz-mode'),
              end: root.querySelector('[data-viz-part="viz-next"]')!.hasAttribute('data-viz-end'),
            }
          },
          [EL, LESSON_HEADER] as const,
        )
        const { step, mode, end, ...seen } = v
        expect(seen, `${preset} step ${step} (${mode})`).toEqual({ oneLineChoices: true, line: true, changed: true, caption: true, next: true })
        if (end) break
        await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
        await page.waitForTimeout(30)
      }
    }
  })

  test('the frame stays within about 850 px at 375 on every preset, and never moves while stepping', async ({ page }) => {
    for (const preset of STEPS) {
      if (skipped(preset)) continue
      const f = await openStep(page, preset, 375)
      const h = (await f.boundingBox())!.height
      expect(h, preset).toBeLessThanOrEqual(850)
      await f.getByRole('slider').focus()
      await page.keyboard.press('End')
      await page.waitForTimeout(1500)
      expect((await f.boundingBox())!.height, `${preset} at its end`).toBe(h)
    }
  })

  test('axe: no violations on the lesson groups', async ({ page }) => {
    for (const preset of STEPS) {
      if (skipped(preset)) continue
      await openStep(page, preset)
      const r = await new AxeBuilder({ page }).include('[data-viz]').analyze()
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`), preset).toEqual([])
    }
  })
})

/** Where each visual is placed (fixtures.ts); the event-loop lesson is committed, the others render from a local checkout. */
const LESSONS: { slug: string; viz: string; source?: string }[] = [
  { slug: 'event-loop', viz: '[data-viz="event-loop"] section[data-viz-preset="exercise-2-async1-async2"]' },
  { slug: 'context-and-call-stack', viz: '[data-viz="event-loop"] section', source: 'js-track/core-fundamentals/context-and-call-stack/page.mdx' },
  { slug: 'memory-management', viz: 'figure[data-viz-preset="gc-reachability-cycle-and-weak-edge"]', source: 'js-track/core-fundamentals/memory-management/page.mdx' },
  { slug: 'memory-leaks', viz: 'figure[data-viz-preset="retainer-paths"]', source: 'js-track/advanced-concepts/memory-leaks/page.mdx' },
  { slug: 'objects-and-classes', viz: 'figure[data-viz-preset="extends-two-chains"]', source: 'js-track/core-fundamentals/objects-and-classes/page.mdx' },
]

test('in its lesson: each visual, nothing wider than the column (local checkout where the lesson is not committed)', async ({ page }) => {
  test.setTimeout(180_000)
  const have = LESSONS.filter((l) => !l.source || fs.existsSync(path.join(process.cwd(), 'src', 'content', l.source)))
  for (const l of LESSONS.filter((x) => !have.includes(x))) test.info().annotations.push({ type: 'skipped lesson', description: `${l.slug}: needs src/content` })
  for (const width of [375, 1440])
    for (const l of have) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`/dev/visualizations/lesson/${l.slug}`, { waitUntil: 'load' })
      const v = page.locator(l.viz).first()
      await v.scrollIntoViewIfNeeded()
      await expect(v, `${l.slug} @${width}`).toBeVisible({ timeout: 30_000 })
      const column = await page.locator('article, main').first().boundingBox()
      const box = (await v.boundingBox())!
      expect(box.x + box.width, `${l.slug} @${width}`).toBeLessThanOrEqual((column?.x ?? 0) + (column?.width ?? width) + 1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${l.slug} page @${width}`).toBe(true)
    }
})
