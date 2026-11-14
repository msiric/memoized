import { test } from '@playwright/test'
import { ctxFor, openViz, pacedClick, shot, sizeName, writeResult, type Size } from './r1-common'

/**
 * R1-B: the D21 reveal moments mid-flight, at full motion, at every width.
 *
 * - list keys: the rider is paused at fixed times (Web Animations), and at
 *   each it is measured against its match line, the row text it must never
 *   cross, its source checkbox and the destination.
 * - event loop: a per-frame recorder logs the console playback (tint opacity
 *   per output, in x order), the caption and recap slot, and the primary.
 */

export const SIZES: Size[] = [
  { w: 320, h: 640 },
  { w: 360, h: 740 },
  { w: 375, h: 667 },
  { w: 414, h: 896 },
  { w: 600, h: 900 },
  { w: 667, h: 375, name: 'land-667x375' },
  { w: 768, h: 1024 },
  { w: 820, h: 1180, name: 'tablet-820x1180' },
  { w: 1024, h: 768 },
  { w: 1280, h: 900 },
  { w: 1920, h: 1080 },
  { w: 2560, h: 1440 },
]
const ONLY = process.env.R1_SIZES?.split(',')
const sizes = SIZES.filter((s) => !ONLY || ONLY.includes(sizeName(s)))

const T = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 420, 480, 540]

type RideSample = {
  t: number
  rider: string
  cx: number
  cy: number
  /** distance from the rider centre to its match line (px), and the line's x-range */
  dLine: number
  onLineSpan: boolean
  /** overlap with row text (px^2) and which text */
  textHit: { text: string; area: number }[]
  srcChecked: boolean
  ticksVisible: number
  inFrame: boolean
  opacity: number
}

async function rideProbe(page: import('@playwright/test').Page, f: string, scenario: string, size: Size) {
  // Starts the reveal, pauses every ride, then samples.
  const samples: RideSample[] = await page.evaluate(
    async ({ f, T }) => {
      const frame = document.querySelector(f)!
      const choice = frame.querySelector('[data-viz-focus="choice-0"]') as HTMLElement
      choice.click()
      let anims: Animation[] = []
      for (let i = 0; i < 30 && !anims.length; i++) {
        anims = document.getAnimations().filter((a) => a.id === 'viz-ride')
        if (!anims.length) await new Promise((r) => requestAnimationFrame(r))
      }
      anims.forEach((a) => a.pause())
      const out: RideSample[] = []
      const riders = [...frame.querySelectorAll('[data-viz-reveal="rider"]')] as HTMLElement[]
      const fr = frame.getBoundingClientRect()
      const lineOf = (from: string) =>
        frame.querySelector(`[data-link="reused"][data-from="${from}"] path`) as SVGPathElement | null
      const linePts = (p: SVGPathElement | null) => {
        if (!p) return []
        const m = p.getScreenCTM()!
        const L = p.getTotalLength()
        const pts: { x: number; y: number }[] = []
        for (let i = 0; i <= 200; i++) {
          const q = p.getPointAtLength((L * i) / 200)
          pts.push({ x: m.a * q.x + m.c * q.y + m.e, y: m.b * q.x + m.d * q.y + m.f })
        }
        return pts
      }
      const textRects: { text: string; r: DOMRect }[] = []
      for (const row of frame.querySelectorAll('[data-row]')) {
        const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = w.nextNode())) {
          const s = (n.textContent ?? '').trim()
          if (!s) continue
          const el = n.parentElement!
          if (el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') continue
          const range = document.createRange()
          range.selectNodeContents(n)
          for (const r of range.getClientRects()) if (r.width > 0) textRects.push({ text: s.slice(0, 24), r })
        }
      }
      for (const t of T) {
        for (const a of anims) a.currentTime = t
        riders.forEach((rd) => {
          const r = rd.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const pts = linePts(lineOf(rd.dataset.from!))
          let d = Infinity
          for (const p of pts) d = Math.min(d, Math.hypot(p.x - cx, p.y - cy))
          const xs = pts.map((p) => p.x)
          const onLineSpan = pts.length > 0 && cx >= Math.min(...xs) && cx <= Math.max(...xs)
          const hits = textRects
            .map(({ text, r: q }) => {
              const w = Math.min(r.right, q.right) - Math.max(r.left, q.left)
              const h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top)
              return { text, area: w > 0 && h > 0 ? Math.round(w * h) : 0 }
            })
            .filter((h) => h.area > 0)
          const src = frame.querySelector(`[data-row="${rd.dataset.from}"] input[type="checkbox"]`) as HTMLInputElement
          const ticks = [...frame.querySelectorAll('[data-row] svg')].filter((s) => {
            const st = getComputedStyle(s)
            const b = s.getBoundingClientRect()
            return st.display !== 'none' && st.visibility !== 'hidden' && b.width > 0
          }).length
          const op = Number(getComputedStyle(rd).opacity)
          out.push({
            t,
            rider: `${rd.dataset.from}->${rd.dataset.to}`,
            cx: Math.round(cx * 10) / 10,
            cy: Math.round(cy * 10) / 10,
            dLine: Math.round(d * 10) / 10,
            onLineSpan,
            textHit: hits,
            srcChecked: !!src?.checked,
            ticksVisible: ticks,
            inFrame: r.left >= fr.left - 1 && r.right <= fr.right + 1 && r.top >= fr.top - 1 && r.bottom <= fr.bottom + 1,
            opacity: op,
          })
        })
      }
      ;(window as unknown as { __rides: Animation[] }).__rides = anims
      return out
    },
    { f, T },
  )
  // Evidence: the paused frames at 0, 100, 200 and 300 ms.
  const shots: string[] = []
  for (const t of [0, 100, 200, 300]) {
    await page.evaluate((t) => (window as unknown as { __rides: Animation[] }).__rides.forEach((a) => (a.currentTime = t)), t)
    const s = await shot(page, `${f} [data-viz-region="columns"]`, `reveal-lk__${scenario}__${sizeName(size)}__t${t}.png`, 16)
    if (s) shots.push(s)
  }
  await page.evaluate(() => (window as unknown as { __rides: Animation[] }).__rides.forEach((a) => a.finish()))
  await page.waitForTimeout(700)
  const end = await page.evaluate((f) => {
    const frame = document.querySelector(f)!
    return {
      riders: frame.querySelectorAll('[data-viz-reveal="rider"]').length,
      ticks: [...frame.querySelectorAll('[data-row^="after"] [data-check] svg')].map(
        (s) => s.closest('[data-row]')!.getAttribute('data-row'),
      ),
      mode: frame.getAttribute('data-viz-mode'),
    }
  }, f)
  return { samples, shots, end }
}

for (const size of sizes) {
  test(`reveal list-keys @ ${sizeName(size)}`, async ({ browser }) => {
    const { ctx, page } = await ctxFor(browser, size)
    const res: Record<string, unknown> = { size: sizeName(size) }
    try {
      const f = await openViz(page, 'list-keys')
      // Scenario 1: initial index / insert-top, one check (Buy milk).
      res.indexInsert = await rideProbe(page, f, 'index-insert-top', size)
      // Scenario 2: id keys, both checked, reverse (two riders on crossing lines).
      await pacedClick(page, `${f} [data-viz-part="viz-again"]`, 500)
      await page.evaluate((f) => {
        const fr = document.querySelector(f)!
        const radios = [...fr.querySelectorAll('[role="radiogroup"][aria-label="Key strategy"] [role="radio"]')] as HTMLElement[]
        radios.find((r) => r.textContent?.trim() === 'id')?.click()
      }, f)
      await page.waitForTimeout(400)
      await page.evaluate((f) => {
        const dog = document.querySelector(`${f} [data-viz-focus="check-dog"]`) as HTMLInputElement | null
        if (dog && !dog.checked) dog.click()
      }, f)
      await page.waitForTimeout(400)
      await pacedClick(page, `${f} [data-viz-focus="action-reverse"]`, 600)
      res.idReverse = await rideProbe(page, f, 'id-reverse-2checks', size)
    } finally {
      writeResult(`reveal-lk__${sizeName(size)}`, res)
      await ctx.close()
    }
  })

  test(`reveal event-loop @ ${sizeName(size)}`, async ({ browser }) => {
    const { ctx, page } = await ctxFor(browser, size)
    const res: Record<string, unknown> = { size: sizeName(size) }
    try {
      const f = await openViz(page, 'event-loop')
      for (const variant of ['right', 'wrong', 'skip'] as const) {
        // Walk to the step before the last, answering the checkpoint as asked.
        for (let g = 0; g < 40; g++) {
          const st = await page.evaluate((f) => {
            const fr = document.querySelector(f)!
            const next = fr.querySelector('[data-viz-part="viz-next"]')!
            return {
              mode: fr.getAttribute('data-viz-mode'),
              step: Number(fr.getAttribute('data-viz-step')),
              end: next.getAttribute('data-viz-end') !== null,
              total: Number(fr.querySelector('[role="slider"]')?.getAttribute('aria-valuemax')),
            }
          }, f)
          if (st.mode === 'ask') {
            if (variant === 'skip') await pacedClick(page, `${f} [data-viz-part="viz-skip"]`)
            else {
              const idx = variant === 'right' ? 0 : 1
              res[`choice_${variant}`] = await page.evaluate(
                ([f, idx]) => {
                  const bs = [...document.querySelectorAll(`${f} [data-viz-region="dock"] [role="radio"]`)].filter(
                    (b) => !b.closest('[data-viz-part="dock-ghosts"]'),
                  ) as HTMLElement[]
                  bs[idx as number].click()
                  return bs[idx as number].textContent
                },
                [f, idx] as const,
              )
              await page.waitForTimeout(450)
            }
            continue
          }
          if (st.step === st.total - 1) break
          await pacedClick(page, `${f} [data-viz-part="viz-next"]`)
        }
        // Record the reveal frame by frame.
        await page.evaluate((f) => {
          const fr = document.querySelector(f)!
          const log: unknown[] = []
          ;(window as unknown as { __log: unknown[] }).__log = log
          const t0 = performance.now()
          const tick = () => {
            const t = Math.round(performance.now() - t0)
            const outs = [...fr.querySelectorAll('[data-viz-reveal="out"]')]
              .filter((e) => (e as HTMLElement).offsetParent !== null)
              .map((e) => {
                const li = e.closest('li')!
                const r = li.getBoundingClientRect()
                return { k: Number(li.getAttribute('data-out')), x: Math.round(r.left), y: Math.round(r.top), o: Number(getComputedStyle(e).opacity).toFixed(2) }
              })
            const cap = fr.querySelector('[data-viz-part="viz-caption"]') as HTMLElement | null
            const next = fr.querySelector('[data-viz-part="viz-next"]') as HTMLElement
            log.push({
              t,
              outs,
              cap: cap ? Number(getComputedStyle(cap).opacity).toFixed(2) : null,
              capText: cap?.textContent?.slice(0, 90) ?? null,
              recap: fr.querySelector('[data-viz-part="viz-recap"]')?.textContent ?? null,
              primary: next.getAttribute('aria-label'),
              step: fr.getAttribute('data-viz-step'),
            })
            if (t < 1400) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          ;(fr.querySelector('[data-viz-part="viz-next"]') as HTMLElement).click()
        }, f)
        const shots: string[] = []
        for (const at of [60, 250, 450]) {
          await page.waitForTimeout(at === 60 ? 40 : 160)
          const s = await shot(page, f, `reveal-el__${variant}__${sizeName(size)}__t~${at}.png`)
          if (s) shots.push(s)
        }
        await page.waitForTimeout(1200)
        const final = await shot(page, f, `reveal-el__${variant}__${sizeName(size)}__end.png`)
        const log = await page.evaluate(() => (window as unknown as { __log: unknown[] }).__log)
        res[variant] = { log, shots: [...shots, final] }
        // Replay, back to Start.
        await pacedClick(page, `${f} [data-viz-part="viz-next"]`, 600)
      }
    } finally {
      writeResult(`reveal-el__${sizeName(size)}`, res)
      await ctx.close()
    }
  })
}
