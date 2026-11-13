import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { BASE, OUT, Recorder, STRICT, TIER, openContext, type Config } from './harness'
import { settle } from './detectors'

/**
 * Hydration (R12, H0 N6): the server frame and the hydrated frame are the
 * same box. Per page and config:
 * - a JavaScript-disabled load records each visual's frame box (and the next
 *   element's top) and a pre-shot of each frame;
 * - a normal load scrolls every visual into range, waits for its engine (a
 *   static figure keeps its server HTML), and compares: same x, width,
 *   height and following-content position, within half a pixel;
 * - no layout-shift entry (PerformanceObserver) whose source is inside a
 *   visual may be recorded while it loads and swaps (shifts of the page
 *   chrome are logged to hydration/<config>__platform-shifts.json), and no
 *   React hydration warning from a visual may reach the console (the page
 *   chrome's are logged with the platform shifts).
 */

const PAGES = [
  '/dev/visualizations',
  '/dev/visualizations?static=1',
  '/dev/visualizations?lk=parent-type-change',
  '/dev/visualizations/lesson/event-loop',
  '/dev/visualizations/lesson/closures',
]
const CONFIGS: Config[] =
  TIER === 'full'
    ? [
        { name: 'w320', width: 320, height: 900 },
        { name: 'w375', width: 375, height: 900 },
        { name: 'w768', width: 768, height: 900 },
        { name: 'w1280', width: 1280, height: 900 },
        { name: 'w1440', width: 1440, height: 900 },
        { name: 'text150-375', width: 375, height: 900, rootFont: '150%' },
      ]
    : [
        { name: 'w375', width: 375, height: 900 },
        { name: 'w1280', width: 1280, height: 900 },
      ]
const HYDRATION = /did not match|hydrat|Text content does not match|server rendered HTML/i

/** Text-only zoom served in the HTML itself, so it applies before the first paint, with or without JavaScript. */
async function zoomText(page: Page, c: Config, url: string) {
  if (!c.rootFont) return
  await page.route(`${BASE}${url}`, async (route) => {
    const r = await route.fetch()
    const body = (await r.text()).replace('</head>', `<style>html{font-size:${c.rootFont}!important}</style></head>`)
    // The body is decoded and longer now: drop the original length and encoding.
    const headers = { ...r.headers() }
    delete headers['content-length']
    delete headers['content-encoding']
    await route.fulfill({ status: r.status(), headers, body })
  })
}

type Box = { id: string; x: number; y: number; w: number; h: number; afterY: number | null }

async function boxes(page: Page): Promise<Box[]> {
  return page.evaluate(() => {
    const round = (n: number) => Math.round(n * 2) / 2
    return [...document.querySelectorAll('[data-viz]')].map((m, i) => {
      const f = m.querySelector('section, figure, [data-viz-placeholder]') ?? m
      const r = f.getBoundingClientRect()
      const a = m.nextElementSibling?.getBoundingClientRect()
      return {
        id: `${i}:${m.getAttribute('data-viz')}`,
        x: round(r.x),
        y: round(r.y + scrollY),
        w: round(r.width),
        h: round(r.height),
        afterY: a ? round(a.y + scrollY) : null,
      }
    })
  })
}

for (const c of CONFIGS)
  test(`hydration @ ${c.name}`, async ({ browser }) => {
    test.setTimeout(5 * 60_000)
    const rec = new Recorder(c, 'hydration')
    const shots = path.join(OUT, 'hydration')
    fs.mkdirSync(shots, { recursive: true })
    const platform: unknown[] = []
    try {
      for (const url of PAGES) {
        const tag = url.replace(/[^a-z0-9]+/gi, '_')
        // Server frame: JavaScript off.
        const off = await browser.newContext({
          viewport: { width: c.width, height: c.height },
          javaScriptEnabled: false,
          reducedMotion: 'reduce',
          colorScheme: 'dark',
        })
        const p0 = await off.newPage()
        // Without JavaScript a style tag cannot be added after load, so text
        // zoom goes into the served HTML.
        await zoomText(p0, c, url)
        const res = await p0.goto(`${BASE}${url}`, { waitUntil: 'load' })
        if (!res || res.status() >= 400) {
          rec.note(url, 'load', 'page-missing', `HTTP ${res?.status()}`)
          await off.close()
          continue
        }
        const server = await boxes(p0)
        for (const [i, b] of server.entries())
          await p0
            .locator('[data-viz]')
            .nth(i)
            .screenshot({ path: path.join(shots, `${c.name}__${tag}__${i}-server.png`) })
            .catch(() => undefined)
        await off.close()

        // Hydrated: the same page with JavaScript, every engine loaded.
        const { ctx, page } = await openContext(browser, c)
        const logs: string[] = []
        page.on('console', (m) => {
          if ((m.type() === 'error' || m.type() === 'warning') && HYDRATION.test(m.text())) logs.push(m.text())
        })
        page.on('pageerror', (e) => HYDRATION.test(e.message) && logs.push(e.message.slice(0, 300)))
        await page.addInitScript(() => {
          const w = window as unknown as { __shifts: { value: number; sources: string[] }[] }
          w.__shifts = []
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as unknown as {
              value: number
              hadRecentInput: boolean
              sources?: { node?: Node | null }[]
            }[])
              if (!e.hadRecentInput)
                w.__shifts.push({
                  value: e.value,
                  sources: (e.sources ?? []).map((s) => {
                    const n = s.node as Element | null
                    return n && 'closest' in n ? `${n.tagName}${n.closest('[data-viz]') ? ' in ' + n.closest('[data-viz]')!.getAttribute('data-viz') : ''}` : String(n)
                  }),
                })
          }).observe({ type: 'layout-shift', buffered: true })
        })
        // Text zoom from the first paint (a style added after load would itself shift the page).
        await zoomText(page, c, url)
        await page.goto(`${BASE}${url}`, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        const n = await page.locator('[data-viz]').count()
        for (let i = 0; i < n; i++) {
          const m = page.locator('[data-viz]').nth(i)
          await m.scrollIntoViewIfNeeded()
          const interactive = m.locator('section[data-viz-frame]')
          if (await interactive.count()) await interactive.first().waitFor({ state: 'attached' })
          await page
            .waitForFunction((k) => {
              const mount = document.querySelectorAll('[data-viz]')[k as number]
              return !mount.querySelector('section[data-viz-frame]') || !!mount.querySelector('section[data-viz-interactive="true"]')
            }, i, { timeout: 30_000 })
            .catch(() => rec.note(url, `visual ${i}`, 'engine-timeout', 'the engine never swapped in'))
        }
        await page.evaluate(() => window.scrollTo(0, 0))
        await settle(page, 100)
        const live = await boxes(page)
        for (const s of server) {
          const l = live.find((b) => b.id === s.id)
          if (!l) {
            rec.note(url, s.id, 'hydration-shift', 'the visual is missing after hydration')
            continue
          }
          const d = (['x', 'y', 'w', 'h', 'afterY'] as const).filter((k) => s[k] !== null && Math.abs((s[k] as number) - (l[k] as number)) > 0.5)
          if (d.length)
            rec.note(url, s.id, 'hydration-shift', `server vs hydrated: ${d.map((k) => `${k} ${s[k]} -> ${l[k]}`).join(', ')}`, { server: s, live: l })
        }
        const shifts = await page.evaluate(() => (window as unknown as { __shifts: { value: number; sources: string[] }[] }).__shifts)
        // A shift whose source is a visual (or its mount) fails; one from the
        // page chrome (the platform header) is outside the visuals and only logged.
        for (const sh of shifts)
          if (sh.sources.some((x) => / in /.test(x)))
            rec.note(url, 'load', 'layout-shift', `CLS entry ${sh.value.toFixed(4)} from ${sh.sources.join(', ')}`, sh)
          else platform.push({ config: c.name, url, ...sh })
        // A mismatch inside a visual fails (its component stack runs through
        // components/visualizations); one in the page chrome is only logged.
        for (const l of logs)
          if (/components\/visualizations|at Viz \(/.test(l)) rec.note(url, 'load', 'hydration-warning', l.slice(0, 300))
          else platform.push({ config: c.name, url, hydration: l.slice(0, 600) })
        await ctx.close()
      }
    } finally {
      rec.write()
      fs.writeFileSync(path.join(shots, `${c.name}__platform-shifts.json`), JSON.stringify(platform, null, 1))
    }
    if (STRICT) expect(rec.rows.map((r) => `${r.detector} ${r.visual} [${r.state}] ${r.msg}`)).toEqual([])
  })
