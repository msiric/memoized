import { test, type Page } from '@playwright/test'
import { RIDE } from '../../src/components/visualizations/engines/list-keys/reveal'
import { LK, LK_ACTION_ID, WIDTHS, hydrateListKeys, openGallery, save, strictCheck } from './helpers'

/**
 * Every list-keys ride (R2 GB5): 3 keys x 4 actions, with one and with two
 * checks (24 rides per width), sampled every frame from the answer. Ported
 * from the R2 ride probe. Asserted for each ride:
 *
 * - it starts where the check was: the rider's first frame is on the source
 *   box (1.5 px), and the source box is empty while its check rides;
 * - its path is monotonic in x and in y (0.75 px of slack), and it never
 *   crosses row text (an instance letter, an item, a key);
 * - it lands on its After box (1 px), and from lift-off to the end there is
 *   no frame with neither the rider nor the checked box (nothing blinks);
 * - two riders keep `RIDE.clearance` of their own widths apart.
 *
 * The PR tier runs 1024; the full tier every motion width.
 */

/** One frame of the explorable: riders, source and destination boxes, and row text boxes. */
const PROBE = (root: Element) => {
  const fr = root.getBoundingClientRect()
  type B = { l: number; t: number; r: number; b: number }
  const B = (r: DOMRect): B => ({ l: r.left - fr.left, t: r.top - fr.top, r: r.right - fr.left, b: r.bottom - fr.top })
  const area = (a: B, b: B) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t))
  const eff = (el: Element) => {
    let o = 1
    for (let n: Element | null = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0
      o *= parseFloat(cs.opacity)
    }
    return o
  }
  // Row text does not move during a ride: measured on the first frame of each sample run.
  const cache = window as unknown as { __rideTexts?: (B & { s: string })[] }
  if (!cache.__rideTexts) {
    const cols = root.querySelector('[data-viz-region="columns"]')!
    const found: (B & { s: string })[] = []
    const tw = document.createTreeWalker(cols, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const p = n.parentElement!
      if (!n.textContent!.trim() || p.closest('.sr-only') || p.closest('[data-viz-reveal="rider"]') || eff(p) < 0.1) continue
      const rg = document.createRange()
      rg.selectNodeContents(n)
      for (const r of rg.getClientRects()) if (r.width > 0) found.push({ s: n.textContent!.trim().slice(0, 12), ...B(r) })
    }
    cache.__rideTexts = found
  }
  const texts = cache.__rideTexts
  const riders = [...root.querySelectorAll('[data-viz-reveal="rider"]')].map((n) => {
    const r = B(n.getBoundingClientRect())
    return {
      from: n.getAttribute('data-from')!,
      to: n.getAttribute('data-to')!,
      cx: (r.l + r.r) / 2,
      cy: (r.t + r.b) / 2,
      w: n.getBoundingClientRect().width,
      hits: texts.filter((t) => area(r, t) > 1).map((t) => t.s),
    }
  })
  const box = (row: Element | null, sel: string) => {
    const c = row?.querySelector(sel)
    if (!c) return null
    const b = B(c.getBoundingClientRect())
    // A Before box's tick is the input's sibling; an After box draws it inside.
    const tick = c.tagName === 'INPUT' ? c.parentElement?.querySelector('svg') : c.querySelector('svg')
    return { cx: (b.l + b.r) / 2, cy: (b.t + b.b) / 2, tick: tick ? eff(tick) : 0 }
  }
  const rows = Object.fromEntries(
    [...root.querySelectorAll('[data-row]')].map((row) => [
      row.getAttribute('data-row')!,
      row.getAttribute('data-row')!.startsWith('before') ? box(row, 'input[type="checkbox"]') : box(row, '[data-check]'),
    ]),
  )
  return { riders, rows }
}

type Frame = { t: number; v: ReturnType<typeof PROBE> }

async function sample(page: Page, act: () => Promise<unknown>, ms: number): Promise<Frame[]> {
  await page.evaluate(
    ({ root, probe }) => {
      const w = window as unknown as { __rides: { out: unknown[]; t0: number; on: boolean } }
      const fn = new Function('root', `return (${probe})(root)`) as (r: Element) => unknown
      w.__rides = { out: [], t0: performance.now(), on: true }
      delete (window as unknown as { __rideTexts?: unknown }).__rideTexts
      const loop = () => {
        if (!w.__rides.on) return
        const el = document.querySelector(root)
        if (el) w.__rides.out.push({ t: Math.round(performance.now() - w.__rides.t0), v: fn(el) })
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    },
    { root: LK, probe: PROBE.toString() },
  )
  await act()
  await page.waitForTimeout(ms)
  return page.evaluate(() => {
    const w = window as unknown as { __rides: { out: Frame[]; on: boolean } }
    w.__rides.on = false
    return w.__rides.out
  })
}

export function rideProblems(frames: Frame[]): string[] {
  const out: string[] = []
  const withRiders = frames.filter((f) => f.v.riders.length)
  if (!withRiders.length) {
    // A lost check lands nowhere: no rider, and no After box shows a check.
    const end = frames[frames.length - 1]?.v.rows ?? {}
    const shown = Object.entries(end).filter(([row, b]) => row.startsWith('after') && (b?.tick ?? 0) > 0.5)
    return shown.length ? [`no rider moved, yet ${shown.map(([row]) => row).join(', ')} shows a check`] : []
  }
  const rides = [...new Set(withRiders.flatMap((f) => f.v.riders.map((r) => `${r.from}>${r.to}`)))]
  const lastRider = withRiders[withRiders.length - 1].t
  for (const ride of rides) {
    const [from, to] = ride.split('>')
    const path = withRiders.flatMap((f) => f.v.riders.filter((r) => r.to === to).map((r) => ({ t: f.t, ...r })))
    const first = path[0]
    const src = frames.find((f) => f.t >= first.t)?.v.rows[from]
    // It leaves from the box it was in (the source box at rest, before the answer).
    const rest = frames[0].v.rows[from]
    if (rest && Math.hypot(first.cx - rest.cx, first.cy - rest.cy) > 1.5)
      out.push(`${ride}: lifts off ${Math.hypot(first.cx - rest.cx, first.cy - rest.cy).toFixed(1)} px from its box`)
    for (const f of withRiders) {
      const s = f.v.rows[from]
      if (s && s.tick > 0.05 && f.v.riders.some((r) => r.from === from)) {
        out.push(`${ride}: the source box shows its tick at +${f.t} ms while the check rides`)
        break
      }
    }
    for (const axis of ['cx', 'cy'] as const) {
      const v = path.map((p) => p[axis])
      const dir = Math.sign(v[v.length - 1] - v[0])
      for (let i = 1; i < v.length; i++)
        if (dir && (v[i] - v[i - 1]) * dir < -0.75) {
          out.push(`${ride}: ${axis === 'cx' ? 'x' : 'y'} turns back at +${path[i].t} ms (${v[i - 1].toFixed(1)} -> ${v[i].toFixed(1)})`)
          break
        }
    }
    const hit = path.find((p) => p.hits.length)
    if (hit) out.push(`${ride}: crosses row text "${hit.hits.join('", "')}" at +${hit.t} ms`)
    // Lands on its box: the last rider frame against the box once it shows the check.
    const end = path[path.length - 1]
    const landed = frames.find((f) => f.t > end.t && (f.v.rows[to]?.tick ?? 0) > 0.5)?.v.rows[to]
    if (!landed) out.push(`${ride}: its After box never shows the check`)
    else if (Math.hypot(end.cx - landed.cx, end.cy - landed.cy) > 1)
      out.push(`${ride}: lands ${Math.hypot(end.cx - landed.cx, end.cy - landed.cy).toFixed(2)} px off its box`)
    // Nothing blinks: from lift-off on, the check is the rider or the checked box.
    for (const f of frames.filter((x) => x.t >= first.t)) {
      const riding = f.v.riders.some((r) => r.to === to)
      if (!riding && (f.v.rows[to]?.tick ?? 0) < 0.5 && f.t <= lastRider + 200) {
        out.push(`${ride}: no rider and no checked box at +${f.t} ms`)
        break
      }
    }
    if (!src) out.push(`${ride}: no source box`)
  }
  for (const f of withRiders)
    if (f.v.riders.length === 2) {
      const [a, b] = f.v.riders
      const gap = Math.hypot(a.cx - b.cx, a.cy - b.cy)
      if (gap < RIDE.clearance * Math.min(a.w, b.w) - 1) {
        out.push(`riders ${gap.toFixed(1)} px apart at +${f.t} ms (< ${RIDE.clearance} widths)`)
        break
      }
    }
  return out
}

const KEYS = ['Index', 'Id', 'Math.random()']
const ACTIONS = ['Insert at top', 'Delete first', 'Append', 'Reverse']

async function ask(page: Page, key: string, action: string, both: boolean) {
  const f = page.locator(LK)
  if ((await f.getAttribute('data-viz-mode')) === 'reveal') {
    await f.locator('[data-viz-part="viz-again"]').click()
    await page.waitForTimeout(300)
  }
  const boxes = f.locator('input[type="checkbox"]')
  if (!(await boxes.nth(0).isChecked())) await boxes.nth(0).click()
  if (both !== (await boxes.nth(1).isChecked())) await boxes.nth(1).click()
  await page.waitForTimeout(300)
  await f.evaluate((el, k) => {
    const radios = [...el.querySelectorAll('[role="radiogroup"][aria-label="Key strategy"] [role="radio"]')] as HTMLElement[]
    radios.find((r) => r.textContent?.trim().toLowerCase() === k.toLowerCase())?.click()
  }, key)
  await page.waitForTimeout(250)
  const id = LK_ACTION_ID[action]
  // Leave the action on another one first, so choosing it is a change.
  await f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), id === 'append' ? 'insert-top' : 'append')
  await page.waitForTimeout(200)
  await f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), id)
  await page.waitForTimeout(350)
}

for (const width of WIDTHS)
  test(`list-keys: every ride starts, travels and lands cleanly @${width}`, async ({ page }) => {
    test.setTimeout(600_000)
    await openGallery(page, { width })
    await hydrateListKeys(page)
    const f = page.locator(LK)
    const report: Record<string, unknown> = {}
    const problems: string[] = []
    for (const key of KEYS)
      for (const action of ACTIONS)
        for (const both of [false, true]) {
          await ask(page, key, action, both)
          await f.locator('[data-viz-region="columns"]').evaluate((el) => el.scrollIntoView({ block: 'center' }))
          await page.waitForTimeout(150)
          const frames = await sample(page, () => f.locator('[data-choice-index="0"]').click(), 1100)
          const p = rideProblems(frames)
          report[`${key}/${action}/${both}`] = { frames: frames.length, problems: p }
          problems.push(...p.map((x) => `${key} ${action}${both ? ' (two checks)' : ''}: ${x}`))
        }
    save(`list-keys-rides-${width}.json`, report)
    strictCheck(`list-keys rides @${width}`, problems)
  })
