import { test, type Page } from '@playwright/test'
import { varVsLetLoop, factoryCallsVsAliases } from '../../src/components/visualizations/engines/env-records/presets/closures'
import { pathSelectors } from '../../src/components/visualizations/engines/env-records/paths'
import { isFunction } from '../../src/components/visualizations/engines/env-records/model'
import { BASE, ctxFor, shot, writeResult, type Size } from './r1-common'

/**
 * R1-B: the closures hover / focus path (D21). For every function object in
 * every visible figure copy, at several widths: hover it, focus it, and
 * combine (focus one, hover another). Each painted element's effective
 * opacity (its own times its ancestors') decides whether it reads as
 * "brought forward" (> 0.9) or dimmed. The set brought forward must equal
 * the function's own path (paths.ts) and nothing else; every selector of the
 * path must match something.
 */

const SIZES: Size[] = [
  { w: 320, h: 800 },
  { w: 375, h: 667 },
  { w: 768, h: 1024 },
  { w: 1280, h: 900 },
  { w: 2560, h: 1440 },
]
const FIGS = [varVsLetLoop.data, factoryCallsVsAliases.data]

async function lit(page: Page, svgSel: string) {
  return page.evaluate((svgSel) => {
    const svg = document.querySelector(svgSel)!
    const eff = (el: Element) => {
      let o = 1
      for (let e: Element | null = el; e && e !== svg.parentElement; e = e.parentElement)
        o *= Number(getComputedStyle(e).opacity)
      return o
    }
    const tag = (el: Element) => {
      const n = el.closest('[data-node],[data-edge],[data-o]')
      return n
        ? n.hasAttribute('data-node')
          ? `node:${n.getAttribute('data-node')}`
          : n.hasAttribute('data-edge')
            ? `edge:${n.getAttribute('data-edge')}`
            : `o:${n.getAttribute('data-o')}`
        : `other:${el.tagName}:${(el.textContent ?? '').trim().slice(0, 16)}`
    }
    const leaves = [...svg.querySelectorAll('path,rect,text,circle,polygon,line')].filter((e) => {
      const b = e.getBoundingClientRect()
      return b.width + b.height > 0 && getComputedStyle(e).display !== 'none'
    })
    const bright = new Set<string>()
    const dim = new Set<string>()
    for (const l of leaves) (eff(l) > 0.9 ? bright : dim).add(tag(l))
    // A tag counts as brought forward only if none of its painted parts is dimmed.
    return { bright: [...bright].filter((t) => !dim.has(t)).sort(), mixed: [...bright].filter((t) => dim.has(t)).sort(), dim: [...dim].sort() }
  }, svgSel)
}

const norm = (sel: string) => {
  const m = sel.match(/^\[data-(node|edge|o)="?([^"\]]+)"?\]$/)
  return m ? `${m[1]}:${m[2]}` : sel
}

for (const size of SIZES) {
  test(`closures hover/focus @ ${size.w}x${size.h}`, async ({ browser }) => {
    const { ctx, page } = await ctxFor(browser, size)
    const out: unknown[] = []
    try {
      await page.goto(`${BASE}/dev/visualizations?static=1`, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      // Mark every visible figure svg.
      const svgs = await page.evaluate(() => {
        const res: { sel: string; section: string; fig: number }[] = []
        document.querySelectorAll('[data-viz="environment-records"]').forEach((m, fi) => {
          m.querySelectorAll('svg.vz-s').forEach((s, si) => {
            const b = s.getBoundingClientRect()
            if (b.width === 0 || b.height === 0) return
            const id = `r1svg-${fi}-${si}`
            s.setAttribute('data-r1', id)
            res.push({ sel: `svg[data-r1="${id}"]`, section: s.closest('[data-viz-section]')!.getAttribute('data-viz-section')!, fig: fi })
          })
        })
        return res
      })
      for (const sv of svgs) {
        const data = FIGS[sv.fig]
        const section = data.sections.find((s) => s.id === sv.section)!
        const fns = section.nodes.filter(isFunction)
        const idle = await lit(page, sv.sel)
        for (const fn of fns) {
          const expected = pathSelectors(section, fn).map(norm)
          const g = `${sv.sel} [data-node="${fn.id}"]`
          // Hover.
          await page.locator(g).first().scrollIntoViewIfNeeded()
          await page.locator(g).first().hover()
          await page.waitForTimeout(250)
          const hov = await lit(page, sv.sel)
          const s1 = await shot(page, sv.sel, `closures__${size.w}__${sv.section}__hover-${fn.id}.png`, 8)
          const missing = expected.filter((e) => !hov.bright.includes(e))
          const extra = hov.bright.filter((b) => !expected.includes(b))
          const unmatched = await page.evaluate(
            ([svg, sels]) => (sels as string[]).filter((s) => !document.querySelector(svg as string)!.querySelector(s)),
            [sv.sel, pathSelectors(section, fn)] as const,
          )
          // Emphasis: does the function's own outline change on hover?
          const stroke = await page.evaluate((g) => {
            const r = document.querySelector(g)!.querySelector('rect')
            return r ? getComputedStyle(r).stroke + ' w=' + getComputedStyle(r).strokeWidth : null
          }, g)
          await page.mouse.move(1, 1)
          await page.waitForTimeout(200)
          const strokeIdle = await page.evaluate((g) => {
            const r = document.querySelector(g)!.querySelector('rect')
            return r ? getComputedStyle(r).stroke + ' w=' + getComputedStyle(r).strokeWidth : null
          }, g)
          // Focus (keyboard), mouse away.
          await page.focus(g)
          await page.waitForTimeout(200)
          const foc = await lit(page, sv.sel)
          const focusMissing = expected.filter((e) => !foc.bright.includes(e))
          const focusExtra = foc.bright.filter((b) => !expected.includes(b))
          // Focus this one, hover another: whose path shows?
          let combo: unknown = null
          const other = fns.find((x) => x.id !== fn.id)
          if (other) {
            await page.locator(`${sv.sel} [data-node="${other.id}"]`).first().hover()
            await page.waitForTimeout(250)
            const both = await lit(page, sv.sel)
            const otherExp = pathSelectors(section, other).map(norm)
            combo = {
              focused: fn.id,
              hovered: other.id,
              brightNotInHoveredPath: both.bright.filter((b) => !otherExp.includes(b)),
            }
            await shot(page, sv.sel, `closures__${size.w}__${sv.section}__focus-${fn.id}-hover-${other.id}.png`, 8)
          }
          // Mouse click then move away: does the path stay?
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
          await page.locator(g).first().click()
          await page.mouse.move(1, 1)
          await page.waitForTimeout(250)
          const afterClick = await lit(page, sv.sel)
          await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
          out.push({
            size: `${size.w}x${size.h}`,
            section: sv.section,
            fn: fn.id,
            expected,
            hover: { missing, extra, mixed: hov.mixed, shot: s1 },
            unmatchedSelectors: unmatched,
            stroke: { idle: strokeIdle, hover: stroke },
            focus: { missing: focusMissing, extra: focusExtra },
            combo,
            stickyAfterClick: afterClick.dim.length > 0,
            idleDim: idle.dim.length,
          })
        }
      }
    } finally {
      writeResult(`closures__${size.w}x${size.h}`, out)
      await ctx.close()
    }
  })
}
