import { expect, type BrowserContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

export const AUDIT =
  '/Users/mariosiric/Documents/memoized-content-audit/audit/content-quality/program-runs/VIZ/2026-11-12-hardening/R1'
/** Override with R1_MOTION_OUT so a re-run never overwrites the R1 evidence. */
export const SHOTS = process.env.R1_MOTION_OUT ?? path.join(AUDIT, 'shots-motion')
export const DATA = path.join(SHOTS, 'data')
export const EL = '[data-viz="event-loop"] section'
export const LK = '[data-viz="list-keys"] section'

export function save(name: string, data: unknown) {
  fs.mkdirSync(DATA, { recursive: true })
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(data, null, 2))
}

export async function open(page: Page, opts: { width: number; height?: number; query?: string; reduced?: boolean }) {
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: opts.width, height: opts.height ?? 900 })
  await page.goto('/dev/visualizations' + (opts.query ?? ''))
  await expect(page.locator(`${EL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

export async function hydrateLK(page: Page) {
  await page.locator('[data-viz="list-keys"]').scrollIntoViewIfNeeded()
  await expect(page.locator(`${LK}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

/** Runs `probe` (a function source taking the root) on every rAF for `ms`, after `act`. */
export async function sampleAfter(
  page: Page,
  root: string,
  probe: string,
  act: () => Promise<unknown>,
  ms: number,
): Promise<{ t: number; v: any }[]> {
  await page.evaluate(
    ({ root, probe }) => {
      const w = window as any
      const fn = new Function('root', `return (${probe})(root)`) as (r: Element) => unknown
      w.__r1 = { out: [], t0: 0, on: true }
      const loop = () => {
        if (!w.__r1.on) return
        const el = document.querySelector(root)
        if (el && w.__r1.t0) w.__r1.out.push({ t: Math.round(performance.now() - w.__r1.t0), v: fn(el) })
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    },
    { root, probe },
  )
  await page.evaluate(() => {
    ;(window as any).__r1.t0 = performance.now()
  })
  await act()
  await page.waitForTimeout(ms)
  return page.evaluate(() => {
    const w = window as any
    w.__r1.on = false
    return w.__r1.out
  })
}

/** Real-time screenshots via CDP as fast as possible, for `ms` after `act`. */
export async function burstShots(page: Page, clipSel: string, act: () => Promise<unknown>, ms: number, every = 0) {
  const cdp = await page.context().newCDPSession(page)
  const b = (await page.locator(clipSel).boundingBox())!
  const clip = { x: b.x, y: b.y + (await page.evaluate(() => window.scrollY)), width: b.width, height: b.height, scale: 1 }
  const shots: { label: string; png: Buffer }[] = []
  const cap = async () =>
    Buffer.from(
      (await cdp.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })).data,
      'base64',
    )
  shots.push({ label: 'before', png: await cap() })
  const t0 = Date.now()
  await act()
  while (Date.now() - t0 < ms) {
    const t = Date.now() - t0
    const png = await cap()
    shots.push({ label: `+${t} ms`, png })
    if (every) await page.waitForTimeout(every)
  }
  await cdp.detach()
  return shots
}

export async function strip(
  ctx: BrowserContext,
  name: string,
  frames: { label: string; png: Buffer }[],
  title: string,
  cols = 6,
) {
  fs.mkdirSync(SHOTS, { recursive: true })
  const p = await ctx.newPage()
  const imgs = frames
    .map(
      (f) =>
        `<figure><img src="data:image/png;base64,${f.png.toString('base64')}"><figcaption>${f.label}</figcaption></figure>`,
    )
    .join('')
  await p.setContent(
    `<html><body style="margin:0;background:#111;color:#ddd;font:13px system-ui"><h3 style="margin:8px">${title}</h3><div style="display:grid;grid-template-columns:repeat(${cols},max-content);gap:6px;padding:0 8px 8px">${imgs}</div><style>figure{margin:0}img{display:block;max-width:none}figcaption{padding:4px 0}</style></body></html>`,
  )
  await p.setViewportSize({ width: 200, height: 200 })
  await p.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true })
  await p.close()
}

export async function walkEL(page: Page, step: number, answer = '1') {
  const f = page.locator(EL)
  await f.getByRole('slider').focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(350)
  for (let g = 0; g < 30; g++) {
    const s = Number(await f.getAttribute('data-viz-step'))
    const mode = await f.getAttribute('data-viz-mode')
    if (s >= step && mode !== 'ask') break
    await page.keyboard.press(mode === 'ask' ? answer : 'ArrowRight')
    await page.waitForTimeout(420)
  }
  await page.waitForTimeout(350)
}

export async function lastStep(page: Page) {
  return Number(await page.locator(EL).getByRole('slider').getAttribute('aria-valuemax'))
}

export async function activeInfo(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    if (!a || a === document.body) return 'body'
    const viz = a.closest('[data-viz]')?.getAttribute('data-viz') ?? 'outside'
    const r = a.getBoundingClientRect()
    const cs = getComputedStyle(a)
    const ring = cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px' ? `outline ${cs.outlineWidth} ${cs.outlineColor} +${cs.outlineOffset}` : cs.boxShadow !== 'none' ? `shadow ${cs.boxShadow.slice(0, 60)}` : 'NO RING'
    return {
      viz,
      el: `${a.tagName.toLowerCase()}[${a.getAttribute('role') ?? ''}] ${a.getAttribute('aria-label') ?? a.getAttribute('data-viz-focus') ?? (a.textContent ?? '').trim().slice(0, 24)}`,
      visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight,
      ring,
      fv: a.matches(':focus-visible'),
    }
  })
}

export const liveText = (page: Page, root: string) =>
  page.locator(root).evaluate((el) => (el.querySelector('[role="status"]')?.textContent ?? '').trim())
