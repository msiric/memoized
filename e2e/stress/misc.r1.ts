import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { LIST_OUTCOMES } from '../../src/components/visualizations/engines/list-keys/outcomes'
import { detect, settle } from './detectors'
import { BASE, SHOTS, RESULTS, ctxFor, openViz, pacedClick, shot, writeResult } from './r1-common'

/**
 * R1-B probes for scenarios the H0 harness does not reach: the select
 * fallback, soft-wrapped code with the current line, the scrubber tooltip at
 * both ends, checkpoints answered (not skipped) at 320, resize across the
 * vz-wide boundary in every state (and mid-reveal), print, and hydration.
 */

const EL = '[data-viz="event-loop"] section[data-viz-frame]'
const LK = '[data-viz="list-keys"] section[data-viz-frame]'
const brief = (fs: Awaited<ReturnType<typeof detect>>) =>
  fs
    .filter((f) => !(f.detector === 'contrast' && (f.data as { inactive?: boolean } | undefined)?.inactive))
    .map((f) => `${f.detector}: ${f.msg.slice(0, 160)}`)

async function diff(a: Buffer, b: Buffer, out: string) {
  const A = await sharp(a).raw().toBuffer({ resolveWithObject: true })
  const B = await sharp(b).raw().toBuffer({ resolveWithObject: true })
  if (A.info.width !== B.info.width || A.info.height !== B.info.height)
    return { sizeA: [A.info.width, A.info.height], sizeB: [B.info.width, B.info.height], changed: -1 }
  const { width, height, channels } = A.info
  const mask = Buffer.alloc(width * height * 3)
  let changed = 0
  let x0 = width, y0 = height, x1 = 0, y1 = 0
  for (let i = 0, p = 0; i < A.data.length; i += channels, p++) {
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]))
    const x = p % width
    const y = Math.floor(p / width)
    if (d > 24) {
      changed++
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
      mask[p * 3] = 255
    } else {
      const g = Math.round((A.data[i] + A.data[i + 1] + A.data[i + 2]) / 9)
      mask[p * 3] = g; mask[p * 3 + 1] = g; mask[p * 3 + 2] = g
    }
  }
  if (changed) await sharp(mask, { raw: { width, height, channels: 3 } }).png().toFile(path.join(SHOTS, out))
  return { changed, bbox: changed ? [x0, y0, x1, y1] : null, size: [width, height], diff: changed ? out : null }
}

async function elState(page: Page, f = EL) {
  return page.evaluate((f) => {
    const fr = document.querySelector(f)!
    const next = fr.querySelector('[data-viz-part="viz-next"]')!
    return {
      step: Number(fr.getAttribute('data-viz-step')),
      mode: fr.getAttribute('data-viz-mode'),
      preset: fr.getAttribute('data-viz-preset'),
      last: Number(fr.querySelector('[role="slider"]')!.getAttribute('aria-valuemax')),
      end: next.getAttribute('data-viz-end') !== null,
    }
  }, f)
}

/** Paced Next until `until` holds; at an ask, picks `pick` (index) or skips (null). */
async function elWalk(page: Page, until: (s: { step: number; mode: string | null; last: number; end: boolean }) => boolean, pick: number | null = null, f = EL) {
  for (let g = 0; g < 40; g++) {
    const s = await elState(page, f)
    if (until(s)) return s
    if (s.mode === 'ask') {
      if (pick === null) await pacedClick(page, `${f} [data-viz-part="viz-skip"]`)
      else
        await page.evaluate(
          ([f, k]) => {
            const bs = [...document.querySelectorAll(`${f} [data-viz-region="dock"] [role="radio"]`)].filter((b) => !b.closest('[data-viz-part="dock-ghosts"]')) as HTMLElement[]
            bs[k as number]?.click()
          },
          [f, pick] as const,
        )
      await page.waitForTimeout(420)
      continue
    }
    await pacedClick(page, `${f} [data-viz-part="viz-next"]`)
  }
  return elState(page, f)
}

// ---------------------------------------------------------------------------
test('select fallback sweep', async ({ browser }) => {
  const res: unknown[] = []
  for (const url of [`${BASE}/dev/visualizations`, `${BASE}/dev/visualizations/stress?f=el-long-text`]) {
    for (const root of ['100%', '150%']) {
      const { ctx, page } = await ctxFor(browser, { w: 1280, h: 900 })
      await page.goto(url, { waitUntil: 'load' })
      if (root !== '100%') await page.addStyleTag({ content: `html{font-size:${root} !important}` })
      await page.evaluate(() => document.fonts.ready)
      // Make every engine live.
      for (const m of await page.locator('[data-viz]').all()) {
        await m.scrollIntoViewIfNeeded()
        await m.hover({ position: { x: 2, y: 2 } }).catch(() => {})
      }
      await page.waitForTimeout(1500)
      for (let w = 300; w <= 860; w += 8) {
        await page.setViewportSize({ width: w, height: 900 })
        await page.waitForTimeout(60)
        const r = await page.evaluate(() => {
          const out: string[] = []
          document.querySelectorAll('[data-vz-seg]').forEach((seg) => {
            const name = (seg.querySelector('[role=radiogroup]') as HTMLElement)?.getAttribute('aria-label')
            const rg = seg.querySelector('[role=radiogroup]') as HTMLElement
            const sel = seg.querySelector('select') as HTMLSelectElement
            const c = seg.getBoundingClientRect()
            const frame = seg.closest('section[data-viz-frame]')!.getBoundingClientRect()
            const rgShown = getComputedStyle(rg).display !== 'none'
            const selShown = getComputedStyle(sel.parentElement!).display !== 'none'
            if (rgShown === selShown) out.push(`${name}: both or neither shown (rg ${rgShown}, select ${selShown}) at container ${c.width.toFixed(1)}`)
            if (rgShown) {
              const r = rg.getBoundingClientRect()
              if (r.right > c.right + 0.5) out.push(`${name}: radios overflow their container by ${(r.right - c.right).toFixed(1)}px (container ${c.width.toFixed(1)})`)
              if (r.right > frame.right - 15) out.push(`${name}: radios past the frame padding by ${(r.right - (frame.right - 16)).toFixed(1)}px`)
              rg.querySelectorAll('[role=radio]').forEach((b) => {
                const t = b.querySelector('span:last-child') ?? b
                if ((t as HTMLElement).scrollWidth > (t as HTMLElement).clientWidth + 1) out.push(`${name}: radio "${b.textContent}" truncated`)
              })
            }
            if (selShown) {
              const s = sel.getBoundingClientRect()
              if (s.right > c.right + 0.5) out.push(`${name}: select overflows by ${(s.right - c.right).toFixed(1)}`)
              const cs = getComputedStyle(sel)
              const cv = document.createElement('canvas').getContext('2d')!
              cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
              const label = sel.options[sel.selectedIndex].text
              const room = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
              const need = cv.measureText(label).width
              if (need > room + 0.5) out.push(`${name}: select shows "${label}" in ${room.toFixed(0)}px, needs ${need.toFixed(0)} (cut)`)
              if (s.height < 43.5) out.push(`${name}: select ${s.height}px tall`)
            }
          })
          return out
        })
        if (r.length) res.push({ url, root, w, r })
      }
      await ctx.close()
    }
  }
  writeResult('select-fallback', res)
})

// ---------------------------------------------------------------------------
test('soft-wrapped code and the current line', async ({ browser }) => {
  const res: unknown[] = []
  for (const cfg of [
    { w: 320, h: 800, root: '100%' },
    { w: 375, h: 800, root: '150%' },
    { w: 600, h: 900, root: '100%' },
    { w: 768, h: 1000, root: '200%' },
  ]) {
    const { ctx, page } = await ctxFor(browser, { w: cfg.w, h: cfg.h }, { reduce: true })
    for (const fx of ['el-code-40', 'el-code-90']) {
      await page.goto(`${BASE}/dev/visualizations/stress?f=${fx}`, { waitUntil: 'load' })
      if (cfg.root !== '100%') await page.addStyleTag({ content: `html{font-size:${cfg.root} !important}` })
      const f = `[data-viz="stress-${fx}"] section[data-viz-frame]`
      await page.locator(`[data-viz="stress-${fx}"]`).scrollIntoViewIfNeeded()
      await page.locator(`[data-viz="stress-${fx}"]`).hover({ position: { x: 2, y: 2 } })
      await page.waitForSelector(`${f}[data-viz-interactive="true"]`)
      await page.mouse.move(0, 0)
      for (let g = 0; g < 25; g++) {
        await settle(page, 80)
        const r = await page.evaluate((f) => {
          const fr = document.querySelector(f)!
          const win = fr.querySelector('[data-viz-part="code-window"]')!.getBoundingClientRect()
          const out: string[] = []
          const cur = [...fr.querySelectorAll('[data-viz-part="code-window"] li[aria-current="true"]')] as HTMLElement[]
          for (const li of cur) {
            const lr = li.getBoundingClientRect()
            const code = li.querySelector('code')!
            const range = document.createRange()
            range.selectNodeContents(code)
            const rows = [...range.getClientRects()].filter((q) => q.width > 0)
            const ys = [...new Set(rows.map((q) => Math.round(q.top)))]
            const bar = li.querySelector('span')!.getBoundingClientRect()
            for (const q of rows) {
              if (q.top < lr.top - 1 || q.bottom > lr.bottom + 1) out.push(`line ${li.dataset.line}: a wrapped row (${q.top.toFixed(0)}..${q.bottom.toFixed(0)}) is outside the highlight (${lr.top.toFixed(0)}..${lr.bottom.toFixed(0)})`)
              if (q.right > lr.right + 1) out.push(`line ${li.dataset.line}: text runs past the highlight by ${(q.right - lr.right).toFixed(1)}px`)
            }
            if (bar.top > lr.top + 1 || bar.bottom < lr.bottom - 1) out.push(`line ${li.dataset.line}: marker bar does not span the line`)
            if (lr.top < win.top - 1 || lr.bottom > win.bottom + 1) out.push(`line ${li.dataset.line}: current line (${lr.top.toFixed(0)}..${lr.bottom.toFixed(0)}) not fully inside the window (${win.top.toFixed(0)}..${win.bottom.toFixed(0)}), ${ys.length} visual rows`)
          }
          // Peeking rows: any text row partly inside the window.
          for (const li of fr.querySelectorAll('[data-viz-part="code-window"] li')) {
            const range = document.createRange()
            range.selectNodeContents(li.querySelector('code')!)
            for (const q of range.getClientRects()) {
              if (q.width === 0) continue
              const inter = Math.min(q.bottom, win.bottom) - Math.max(q.top, win.top)
              if (inter > 1 && inter < q.height - 1) out.push(`line ${(li as HTMLElement).dataset.line}: a row is partly visible (${inter.toFixed(1)} of ${q.height.toFixed(1)}px)`)
            }
          }
          return { step: fr.getAttribute('data-viz-step'), mode: fr.getAttribute('data-viz-mode'), cur: cur.map((l) => l.dataset.line), out }
        }, f)
        if (r.out.length) {
          const file = await shot(page, `${f} [data-viz-region="code"]`, `softwrap__${fx}__${cfg.w}-${cfg.root.replace('%', '')}__step${r.step}.png`, 6)
          res.push({ cfg, fx, ...r, file })
        }
        const mode = r.mode
        const next = mode === 'ask' ? `${f} [data-viz-part="viz-skip"]` : `${f} [data-viz-part="viz-next"]`
        const done = await page.evaluate((f) => {
          const n = document.querySelector(`${f} [data-viz-part="viz-next"]`)!
          return n.getAttribute('aria-disabled') === 'true' && document.querySelector(f)!.getAttribute('data-viz-mode') !== 'ask'
            ? true
            : n.getAttribute('data-viz-end') !== null
        }, f)
        if (done) break
        await pacedClick(page, next, 120)
      }
    }
    await ctx.close()
  }
  writeResult('softwrap', res)
})

// ---------------------------------------------------------------------------
test('scrubber tooltip at both ends', async ({ browser }) => {
  const res: unknown[] = []
  for (const s of [
    { w: 320, h: 700 },
    { w: 375, h: 667 },
    { w: 667, h: 375 },
    { w: 768, h: 1000 },
    { w: 1280, h: 900 },
    { w: 2560, h: 1440 },
  ]) {
    for (const src of ['gallery', 'el-long-text']) {
      const { ctx, page } = await ctxFor(browser, s)
      let f = EL
      if (src === 'gallery') await openViz(page, 'event-loop')
      else {
        f = await openViz(page, 'stress-el-long-text', `${BASE}/dev/visualizations/stress?f=el-long-text`)
      }
      const slider = `${f} [role="slider"]`
      await page.locator(slider).scrollIntoViewIfNeeded()
      const rail = await page.locator(`${f} [data-viz-part="scrubber-rail"]`).boundingBox()
      const measure = async (label: string) => {
        await page.waitForTimeout(120)
        const r = await page.evaluate(
          ([f, label]) => {
            const tip = document.querySelector(`${f} [data-viz-part="scrubber-tip"]`) as HTMLElement | null
            if (!tip) return { label, tip: null }
            const t = tip.getBoundingClientRect()
            const fr = document.querySelector(f as string)!.getBoundingClientRect()
            const sl = document.querySelector(`${f} [role="slider"]`)!.getBoundingClientRect()
            return {
              label,
              text: tip.textContent,
              tip: [Math.round(t.left), Math.round(t.right)],
              slider: [Math.round(sl.left), Math.round(sl.right)],
              frame: [Math.round(fr.left), Math.round(fr.right)],
              outsideSlider: t.left < sl.left - 0.5 || t.right > sl.right + 0.5,
              outsideFrame: t.left < fr.left - 0.5 || t.right > fr.right + 0.5,
              outsideViewport: t.left < 0 || t.right > innerWidth,
              pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            }
          },
          [f, label] as const,
        )
        return r
      }
      // Hover both ends of the rail (the step at each end).
      await page.mouse.move(rail!.x + 1, rail!.y + rail!.height / 2)
      const a = await measure('hover left end')
      if ((a as { outsideFrame?: boolean }).outsideFrame || (a as { outsideViewport?: boolean }).outsideViewport) await shot(page, `${f} [data-viz-region="bar"]`, `tooltip__${src}__${s.w}x${s.h}__left.png`, 40)
      await page.mouse.move(rail!.x + rail!.width - 1, rail!.y + rail!.height / 2)
      const b = await measure('hover right end')
      if ((b as { outsideFrame?: boolean }).outsideFrame || (b as { outsideViewport?: boolean }).outsideViewport) await shot(page, `${f} [data-viz-region="bar"]`, `tooltip__${src}__${s.w}x${s.h}__right.png`, 40)
      // Every step by hovering: the widest label.
      const max = Number(await page.getAttribute(slider, 'aria-valuemax'))
      const per: unknown[] = []
      for (let k = 0; k <= max; k++) {
        await page.mouse.move(rail!.x + (rail!.width * k) / max, rail!.y + rail!.height / 2)
        const m = await measure(`hover step ${k}`)
        if ((m as { outsideFrame?: boolean }).outsideFrame || (m as { outsideViewport?: boolean }).outsideViewport || (m as { outsideSlider?: boolean }).outsideSlider) {
          per.push(m)
          await shot(page, `${f} [data-viz-region="bar"]`, `tooltip__${src}__${s.w}x${s.h}__step${k}.png`, 60)
        }
      }
      // Keyboard: Home and End.
      await page.mouse.move(0, 0)
      await page.focus(slider)
      await page.keyboard.press('End')
      const c = await measure('key End')
      await page.keyboard.press('Home')
      const d = await measure('key Home')
      res.push({ size: `${s.w}x${s.h}`, src, ends: [a, b, c, d], badSteps: per })
      await ctx.close()
    }
  }
  writeResult('tooltip', res)
})

// ---------------------------------------------------------------------------
test('checkpoints answered at 320 and 667x375', async ({ browser }) => {
  const res: unknown[] = []
  for (const s of [
    { w: 320, h: 568 },
    { w: 320, h: 800 },
    { w: 667, h: 375 },
  ]) {
    for (const preset of [0, 1]) {
      for (const pick of [0, 1]) {
        const { ctx, page } = await ctxFor(browser, s, { reduce: true })
        await openViz(page, 'event-loop')
        if (preset === 1) {
          await page.evaluate((f) => {
            const fr = document.querySelector(f)!
            const r = [...fr.querySelectorAll('header [role="radio"]')] as HTMLElement[]
            const sel = fr.querySelector('header select') as HTMLSelectElement
            if (r[1] && r[1].offsetParent) r[1].click()
            else {
              Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(sel, '1')
              sel.dispatchEvent(new Event('change', { bubbles: true }))
            }
          }, EL)
          await page.waitForTimeout(400)
        }
        const before = await page.evaluate((f) => {
          const n = document.querySelector(`${f} [data-viz-part="viz-next"]`)!.getBoundingClientRect()
          return [Math.round(n.left), Math.round(n.top + scrollY)]
        }, EL)
        const ask = await elWalk(page, (x) => x.mode === 'ask')
        const atAsk = await page.evaluate((f) => {
          const n = document.querySelector(`${f} [data-viz-part="viz-next"]`)!.getBoundingClientRect()
          const ch = [...document.querySelectorAll(`${f} [data-viz-region="dock"] [role="radio"]`)].filter((b) => !b.closest('[data-viz-part="dock-ghosts"]')).map((b) => b.getBoundingClientRect())
          return { next: [Math.round(n.left), Math.round(n.top + scrollY)], choicesInViewport: ch.every((c) => c.top >= 0 && c.bottom <= innerHeight), nextInViewport: n.top >= 0 && n.bottom <= innerHeight }
        }, EL)
        const fAsk = brief(await detect(page, '[data-viz="event-loop"]'))
        await page.evaluate(
          ([f, k]) => {
            const bs = [...document.querySelectorAll(`${f} [data-viz-region="dock"] [role="radio"]`)].filter((b) => !b.closest('[data-viz-part="dock-ghosts"]')) as HTMLElement[]
            bs[k as number].click()
          },
          [EL, pick] as const,
        )
        await settle(page, 300)
        const fRev = brief(await detect(page, '[data-viz="event-loop"]'))
        const fb = await page.evaluate((f) => document.querySelector(`${f} [data-viz-part="viz-feedback"]`)?.textContent, EL)
        const file = await shot(page, EL, `checkpoint__${s.w}x${s.h}__preset${preset}__pick${pick}.png`)
        // On to the end, then the recap.
        await elWalk(page, (x) => x.end)
        await settle(page, 600)
        const fEnd = brief(await detect(page, '[data-viz="event-loop"]'))
        const endFile = await shot(page, EL, `checkpoint__${s.w}x${s.h}__preset${preset}__pick${pick}__end.png`)
        res.push({ size: `${s.w}x${s.h}`, preset, pick, askStep: ask.step, nextBefore: before, atAsk, fAsk, fRev, feedback: fb, file, fEnd, endFile })
        await ctx.close()
      }
    }
  }
  // List keys at 320: each choice of the initial ask.
  for (const pick of [0, 1, 2, 3]) {
    const { ctx, page } = await ctxFor(browser, { w: 320, h: 568 }, { reduce: true })
    await openViz(page, 'list-keys')
    await page.evaluate(([f, k]) => (document.querySelector(`${f} [data-viz-focus="choice-${k}"]`) as HTMLElement).click(), [LK, pick] as const)
    await settle(page, 300)
    const found = brief(await detect(page, '[data-viz="list-keys"]', { reused: LIST_OUTCOMES['index/insert-top'].reused as (number | null)[] }))
    const file = await shot(page, LK, `checkpoint-lk__320__pick${pick}.png`)
    res.push({ lk: true, pick, found, file })
    await ctx.close()
  }
  writeResult('checkpoints', res)
})

// ---------------------------------------------------------------------------
type St = { name: string; viz: 'event-loop' | 'list-keys' | 'environment-records'; go: (p: Page) => Promise<void> }
const STATES: St[] = [
  { name: 'el-start', viz: 'event-loop', go: async () => {} },
  { name: 'el-step3', viz: 'event-loop', go: async (p) => void (await elWalk(p, (x) => x.step >= 3)) },
  { name: 'el-ask', viz: 'event-loop', go: async (p) => void (await elWalk(p, (x) => x.mode === 'ask')) },
  {
    name: 'el-feedback',
    viz: 'event-loop',
    go: async (p) => {
      await elWalk(p, (x) => x.mode === 'ask')
      await p.evaluate((f) => (([...document.querySelectorAll(`${f} [data-viz-region="dock"] [role="radio"]`)].filter((b) => !b.closest('[data-viz-part="dock-ghosts"]'))[0]) as HTMLElement).click(), EL)
      await p.waitForTimeout(500)
    },
  },
  { name: 'el-end', viz: 'event-loop', go: async (p) => void (await elWalk(p, (x) => x.end, 1)) },
  { name: 'lk-ask', viz: 'list-keys', go: async () => {} },
  { name: 'lk-reveal', viz: 'list-keys', go: async (p) => void (await pacedClick(p, `${LK} [data-viz-focus="choice-0"]`, 1200)) },
  {
    name: 'lk-pick',
    viz: 'list-keys',
    go: async (p) => void (await pacedClick(p, `${LK} [data-viz-part="viz-back"]`, 500)),
  },
  { name: 'er-static', viz: 'environment-records', go: async () => {} },
]

test('resize across the vz-wide boundary in each state', async ({ browser }) => {
  const res: unknown[] = []
  // Frame content 37.875rem = 606px: the boundary sits near a 768 px viewport.
  const paths: [number, number][] = [
    [1280, 700],
    [700, 1280],
    [760, 776],
    [776, 760],
    [375, 1280],
  ]
  for (const st of STATES) {
    for (const [from, to] of paths) {
      for (const motion of from === 1280 || from === 760 ? [false, true] : [false]) {
        const { ctx, page } = await ctxFor(browser, { w: from, h: 900 }, { reduce: !motion })
        const url = st.viz === 'environment-records' ? `${BASE}/dev/visualizations?static=1` : `${BASE}/dev/visualizations`
        let scope = `[data-viz="${st.viz}"]`
        if (st.viz === 'environment-records') {
          await page.goto(url, { waitUntil: 'load' })
          scope = '[data-viz="environment-records"]:nth-of-type(1)'
        } else await openViz(page, st.viz)
        await st.go(page)
        await settle(page, 400)
        await page.setViewportSize({ width: to, height: 900 })
        await settle(page, 600)
        const opts = st.name === 'lk-reveal' ? { reused: LIST_OUTCOMES['index/insert-top'].reused as (number | null)[] } : {}
        const after = brief(await detect(page, `[data-viz="${st.viz}"]`, opts))
        const sel = `[data-viz="${st.viz}"]`
        await page.mouse.move(0, 0)
        await page.locator(sel).first().scrollIntoViewIfNeeded()
        await settle(page, 200)
        const resized = await page.locator(sel).first().screenshot()
        // The same state loaded fresh at the target width.
        const fresh = await ctxFor(browser, { w: to, h: 900 }, { reduce: !motion })
        if (st.viz === 'environment-records') await fresh.page.goto(url, { waitUntil: 'load' })
        else await openViz(fresh.page, st.viz)
        await st.go(fresh.page)
        await settle(fresh.page, 600)
        await fresh.page.mouse.move(0, 0)
        await fresh.page.locator(sel).first().scrollIntoViewIfNeeded()
        await settle(fresh.page, 200)
        const clean = await fresh.page.locator(sel).first().screenshot()
        const tag = `resize__${st.name}__${from}to${to}__${motion ? 'motion' : 'reduce'}`
        const d = await diff(resized, clean, `${tag}__diff.png`)
        if ((d.changed ?? 0) !== 0) {
          fs.writeFileSync(path.join(SHOTS, `${tag}__resized.png`), resized)
          fs.writeFileSync(path.join(SHOTS, `${tag}__fresh.png`), clean)
        }
        res.push({ state: st.name, from, to, motion, after, diff: d })
        await fresh.ctx.close()
        await ctx.close()
      }
    }
  }
  writeResult('resize', res)
})

test('resize mid-reveal', async ({ browser }) => {
  const res: unknown[] = []
  for (const [from, to] of [
    [1280, 700],
    [700, 1280],
  ]) {
    // List keys: resize while the rider is on its line.
    {
      const { ctx, page } = await ctxFor(browser, { w: from, h: 900 })
      await openViz(page, 'list-keys')
      await page.evaluate((f) => (document.querySelector(`${f} [data-viz-focus="choice-0"]`) as HTMLElement).click(), LK)
      await page.waitForTimeout(150)
      await page.setViewportSize({ width: to, height: 900 })
      await settle(page, 1200)
      const found = brief(await detect(page, '[data-viz="list-keys"]', { reused: LIST_OUTCOMES['index/insert-top'].reused as (number | null)[] }))
      const st = await page.evaluate((f) => ({
        riders: document.querySelectorAll(`${f} [data-viz-reveal="rider"]`).length,
        ticks: [...document.querySelectorAll(`${f} [data-row^="after"] [data-check] svg`)].map((s) => s.closest('[data-row]')!.getAttribute('data-row')),
      }), LK)
      const file = await shot(page, LK, `midresize-lk__${from}to${to}.png`)
      res.push({ viz: 'list-keys', from, to, found, st, file })
      await ctx.close()
    }
    // Event loop: resize during the console playback.
    {
      const { ctx, page } = await ctxFor(browser, { w: from, h: 900 })
      await openViz(page, 'event-loop')
      await elWalk(page, (x) => x.step === x.last - 1, 1)
      await page.evaluate((f) => (document.querySelector(`${f} [data-viz-part="viz-next"]`) as HTMLElement).click(), EL)
      await page.waitForTimeout(120)
      await page.setViewportSize({ width: to, height: 900 })
      await settle(page, 1500)
      const found = brief(await detect(page, '[data-viz="event-loop"]'))
      const st = await page.evaluate((f) => ({
        lit: [...document.querySelectorAll(`${f} [data-viz-reveal="out"]`)].filter((e) => (e as HTMLElement).offsetParent).map((e) => getComputedStyle(e).opacity),
        caption: getComputedStyle(document.querySelector(`${f} [data-viz-part="viz-caption"]`)!).opacity,
      }), EL)
      const file = await shot(page, EL, `midresize-el__${from}to${to}.png`)
      res.push({ viz: 'event-loop', from, to, found, st, file })
      await ctx.close()
    }
  }
  writeResult('midresize', res)
})

// ---------------------------------------------------------------------------
test('print', async ({ browser }) => {
  const res: Record<string, unknown> = {}
  for (const s of [
    { w: 1280, h: 900 },
    { w: 375, h: 800 },
  ]) {
    const { ctx, page } = await ctxFor(browser, s, { reduce: true })
    await openViz(page, 'event-loop')
    await elWalk(page, (x) => x.step >= 4)
    await openViz(page, 'list-keys').catch(() => {})
    await page.evaluate((f) => (document.querySelector(`${f} [data-viz-focus="choice-0"]`) as HTMLElement)?.click(), LK)
    await settle(page, 400)
    await page.emulateMedia({ media: 'print' })
    await settle(page, 200)
    // Legibility on paper: backgrounds are not printed by default, so text is on white.
    const audit = await page.evaluate(() => {
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => {
          v /= 255
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const cr = (a: number[], b: number[]) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
        return (x + 0.05) / (y + 0.05)
      }
      const out: Record<string, unknown> = {}
      document.querySelectorAll('[data-viz]').forEach((m, i) => {
        const id = `${m.getAttribute('data-viz')}#${i}`
        const bad: string[] = []
        const hidden: string[] = []
        let texts = 0
        const w = document.createTreeWalker(m, NodeFilter.SHOW_TEXT)
        let n: Node | null
        while ((n = w.nextNode())) {
          const t = (n.textContent ?? '').trim()
          if (!t) continue
          const el = n.parentElement!
          if (el.closest('.sr-only,[aria-hidden="true"] .sr-only,details:not([open]) > :not(summary)')) continue
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) {
            if (el.closest('header, button, [role="radio"]')) hidden.push(t.slice(0, 30))
            continue
          }
          const cs = getComputedStyle(el)
          if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
          texts++
          const isSvg = el instanceof SVGElement
          const c = parse(isSvg ? cs.fill : cs.color)
          if (c[3] === 0) continue
          const ratio = cr(c.slice(0, 3), [255, 255, 255])
          if (ratio < 4.5) bad.push(`"${t.slice(0, 30)}" ${isSvg ? 'fill' : 'color'} rgb(${c.slice(0, 3).join(',')}) ${ratio.toFixed(1)}:1 on white`)
        }
        out[id] = { texts, illegibleOnWhite: [...new Set(bad)].slice(0, 25), illegibleCount: bad.length, hiddenControlsText: [...new Set(hidden)].slice(0, 12) }
      })
      return out
    })
    res[`${s.w}`] = audit
    for (const v of ['event-loop', 'list-keys']) await shot(page, `[data-viz="${v}"]`, `print-emulated__${v}__${s.w}.png`, 8)
    if (s.w === 1280) {
      await page.goto(`${BASE}/dev/visualizations?static=1`, { waitUntil: 'load' })
      await page.emulateMedia({ media: 'print' })
      await shot(page, '[data-viz="environment-records"]', `print-emulated__environment-records__${s.w}.png`, 8)
      res.static = await page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll('[data-viz="environment-records"] svg.vz-s text').forEach((t) => {
          if ((t as SVGGraphicsElement).getBoundingClientRect().width === 0) return
          out.push(getComputedStyle(t).fill)
        })
        return [...new Set(out)]
      })
    }
    await ctx.close()
  }
  // Real PDFs (default print: no backgrounds), rasterized for the evidence.
  {
    const { ctx, page } = await ctxFor(browser, { w: 1280, h: 900 }, { reduce: true })
    for (const [name, url] of [
      ['gallery', `${BASE}/dev/visualizations`],
      ['static', `${BASE}/dev/visualizations?static=1`],
    ]) {
      await page.goto(url, { waitUntil: 'load' })
      for (const m of await page.locator('[data-viz]').all()) {
        await m.scrollIntoViewIfNeeded()
        await m.hover({ position: { x: 2, y: 2 } }).catch(() => {})
      }
      await page.waitForTimeout(1200)
      const pdf = path.join(RESULTS, `print-${name}.pdf`)
      await page.pdf({ path: pdf, format: 'A4', printBackground: false })
      try {
        execFileSync('pdftoppm', ['-r', '70', '-png', pdf, path.join(SHOTS, `print-pdf__${name}`)])
      } catch (e) {
        res[`pdf-${name}`] = String(e)
      }
    }
    await ctx.close()
  }
  writeResult('print', res)
})

// ---------------------------------------------------------------------------
test('hydration: server frame equals hydrated frame', async ({ browser }) => {
  const res: unknown[] = []
  for (const s of [
    { w: 375, h: 800 },
    { w: 820, h: 1180 },
    { w: 1280, h: 900 },
  ]) {
    for (const [viz, url] of [
      ['event-loop', `${BASE}/dev/visualizations`],
      ['list-keys', `${BASE}/dev/visualizations`],
      ['environment-records', `${BASE}/dev/visualizations?static=1`],
    ] as const) {
      // Pre-hydration: the server HTML with its inline scripts (the theme), but
      // no framework chunks, so React never hydrates and no engine loads.
      const pre = await ctxFor(browser, s, { reduce: true })
      await pre.page.route(/\/_next\/static\/.*\.js/, (r) => r.abort())
      await pre.page.goto(url, { waitUntil: 'load' })
      await pre.page.evaluate(() => document.fonts.ready)
      const loc = pre.page.locator(`[data-viz="${viz}"]`).first()
      await loc.scrollIntoViewIfNeeded()
      const boxPre = await loc.boundingBox()
      const a = await loc.screenshot()
      const post = await ctxFor(browser, s, { reduce: true })
      await post.page.goto(url, { waitUntil: 'load' })
      await post.page.evaluate(() => document.fonts.ready)
      const loc2 = post.page.locator(`[data-viz="${viz}"]`).first()
      await loc2.scrollIntoViewIfNeeded()
      if (viz !== 'environment-records')
        await post.page.waitForSelector(`[data-viz="${viz}"] section[data-viz-frame][data-viz-interactive="true"]`, { timeout: 30_000 })
      await post.page.waitForTimeout(800)
      await post.page.mouse.move(0, 0)
      const boxPost = await loc2.boundingBox()
      const b = await loc2.screenshot()
      const tag = `hydration__${viz}__${s.w}x${s.h}`
      const d = await diff(a, b, `${tag}__diff.png`)
      if ((d.changed ?? 0) !== 0) {
        fs.writeFileSync(path.join(SHOTS, `${tag}__ssr.png`), a)
        fs.writeFileSync(path.join(SHOTS, `${tag}__hydrated.png`), b)
      }
      // Which attributes differ on the visible controls.
      const ctl = async (p: Page) =>
        p.evaluate((viz) => {
          const fr = document.querySelector(`[data-viz="${viz}"]`)!
          return [...fr.querySelectorAll('button,[role=slider],select,input')]
            .filter((e) => (e as HTMLElement).offsetParent)
            .map((e) => `${e.getAttribute('aria-label') ?? e.textContent?.trim().slice(0, 20)}|dis=${(e as HTMLButtonElement).disabled}|aria-dis=${e.getAttribute('aria-disabled')}|op=${getComputedStyle(e).opacity}|color=${getComputedStyle(e).color}|bg=${getComputedStyle(e).backgroundColor}`)
        }, viz)
      const c1 = await ctl(pre.page)
      const c2 = await ctl(post.page)
      res.push({ viz, size: `${s.w}x${s.h}`, boxPre, boxPost, diff: d, controlsChanged: c1.filter((x) => !c2.includes(x)).map((x, i) => [x, c2.find((y) => y.split('|')[0] === x.split('|')[0])]) })
      await pre.ctx.close()
      await post.ctx.close()
    }
  }
  writeResult('hydration', res)
})

// ---------------------------------------------------------------------------
test('drain preset reveal and text-zoom svg', async ({ browser }) => {
  const res: Record<string, unknown> = {}
  for (const s of [
    { w: 320, h: 700 },
    { w: 1280, h: 900 },
  ]) {
    const { ctx, page } = await ctxFor(browser, s)
    await openViz(page, 'event-loop', `${BASE}/dev/visualizations?preset=microtask-queued-during-drain`)
    await elWalk(page, (x) => x.step === x.last - 1, 0)
    const log = await page.evaluate(async (f) => {
      const fr = document.querySelector(f)!
      const out: unknown[] = []
      const t0 = performance.now()
      ;(fr.querySelector('[data-viz-part="viz-next"]') as HTMLElement).click()
      while (performance.now() - t0 < 1200) {
        await new Promise((r) => requestAnimationFrame(r))
        out.push({
          t: Math.round(performance.now() - t0),
          outs: [...fr.querySelectorAll('[data-viz-reveal="out"]')]
            .filter((e) => (e as HTMLElement).offsetParent)
            .map((e) => `${e.closest('li')!.getAttribute('data-out')}:${Number(getComputedStyle(e).opacity).toFixed(2)}`)
            .join(' '),
          earlier: fr.querySelector('[data-viz-part="console-earlier"]:not(.hidden)')?.textContent ?? null,
        })
      }
      return out
    }, EL)
    const firstLit: Record<string, number> = {}
    for (const e of log as { t: number; outs: string }[])
      for (const o of e.outs.split(' ')) {
        const [k, v] = o.split(':')
        if (Number(v) >= 0.99 && !(k in firstLit)) firstLit[k] = e.t
      }
    res[`drain-${s.w}`] = { firstLit, earlier: (log as { earlier: string | null }[]).at(-1)?.earlier, last: (log as unknown[]).at(-1) }
    await shot(page, EL, `reveal-el-drain__${s.w}__end.png`)
    await ctx.close()
  }
  {
    const { ctx, page } = await ctxFor(browser, { w: 1280, h: 900 })
    await page.goto(`${BASE}/dev/visualizations?static=1`, { waitUntil: 'load' })
    await page.addStyleTag({ content: 'html{font-size:200% !important}' })
    await page.waitForTimeout(300)
    res.textZoomSvg = await page.evaluate(() => {
      const p = getComputedStyle(document.querySelector('p')!).fontSize
      const t = [...document.querySelectorAll('[data-viz="environment-records"] svg.vz-s text')].find((x) => (x as SVGGraphicsElement).getBoundingClientRect().width > 0)!
      const svg = t.closest('svg')!
      return { prose: p, svgTextCss: getComputedStyle(t).fontSize, svgTextRenderedPx: (t as SVGGraphicsElement).getBoundingClientRect().height.toFixed(1), svgWidth: svg.getBoundingClientRect().width, svgAttrWidth: svg.getAttribute('width') }
    })
    await shot(page, '[data-viz="environment-records"]', 'textzoom200__environment-records__1280.png', 8)
    await ctx.close()
  }
  writeResult('drain-textzoom', res)
})
