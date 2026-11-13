import fs from 'node:fs'
import path from 'node:path'
import type { Browser, BrowserContext, Page } from '@playwright/test'
import { layoutDiagram } from '../../src/components/visualizations/engines/env-records/layout'
import type { EnvDiagram } from '../../src/components/visualizations/engines/env-records/model'
import { detect, frameBox, settle, settleStable, type DetectOptions, type EdgeSpec, type Finding } from './detectors'

/**
 * Matrix, recording and failure screenshots for the stress specs.
 *
 * Output (STRESS_OUT, default test-results/stress):
 *   stress-results/<config>__<group>.json   every finding with its state
 *   shots-correctness/<...>.png              one outlined screenshot per distinct failure set
 */

export const OUT = process.env.STRESS_OUT ?? path.join(process.cwd(), 'test-results', 'stress')
const SHOTS = path.join(OUT, 'shots-correctness')
const RESULTS = path.join(OUT, 'stress-results')

export type Config = {
  name: string
  width: number
  height: number
  dsf?: number
  /** CSS `zoom` on <html>. */
  cssZoom?: number
  /** Root font size (text-only zoom). */
  rootFont?: string
  /** Full motion (the reveals and step transitions play); default reduced. */
  motion?: 'full' | 'reduce'
  /** Recorded, never failed: a configuration outside the supported targets, with the ruling. */
  recordOnly?: string
  note?: string
}

export const WIDTHS = [320, 360, 375, 390, 414, 600, 768, 834, 1024, 1280, 1440, 1920] as const

export const CONFIGS: Config[] = [
  ...WIDTHS.map((w) => ({ name: `w${w}`, width: w, height: 900 })),
  { name: 'zoom200-dsf', width: 640, height: 450, dsf: 2, note: '1280x900 at 200% browser zoom: 640 CSS px, DPR 2' },
  { name: 'zoom200-css', width: 1280, height: 900, cssZoom: 2, note: '1280 with html { zoom: 2 }' },
  { name: 'text200-1280', width: 1280, height: 900, rootFont: '200%', note: 'text-only zoom: html { font-size: 200% }' },
  {
    name: 'text200-375',
    width: 375,
    height: 900,
    rootFont: '200%',
    note: 'text-only zoom at 375',
    // A 9.7rem frame: R9 supports 150 % on a phone and 200 % at 1280; F2 lead
    // ruling 3 (H3 round 1) puts 200 % on a 375 phone beyond the targets.
    recordOnly: 'beyond R9 (F2 ruling 3): findings recorded for the lead, not gated',
  },
  { name: 'text150-1280', width: 1280, height: 900, rootFont: '150%', note: "Chrome 'Very large' font size (24px default)" },
  { name: 'text150-375', width: 375, height: 900, rootFont: '150%', note: "Chrome 'Very large' font size at 375" },
  { name: 'motion-375', width: 375, height: 900, motion: 'full', note: 'full motion on a phone (the reveals play)' },
  { name: 'motion-1280', width: 1280, height: 900, motion: 'full', note: 'full motion at 1280' },
]

/** Browser zoom of a desktop window: CSS viewport = device / zoom, DPR = zoom (R1 extra configs). */
const browserZoom = (pct: number, base = 1280, h = 900): Config => ({
  name: `zoom${pct}-${base}`,
  width: Math.round(base / (pct / 100)),
  height: Math.round(h / (pct / 100)),
  dsf: pct / 100,
  note: `${base}x${h} at ${pct}% browser zoom`,
})

/** R1's extra configurations, kept for the full tier. */
export const EXTRA_CONFIGS: Config[] = [
  browserZoom(67),
  browserZoom(125),
  browserZoom(175),
  browserZoom(175, 1024, 768),
  { name: 'land-667x375', width: 667, height: 375, dsf: 2 },
  { name: 'tablet-820x1180', width: 820, height: 1180, dsf: 2 },
  { name: 'wide-2560', width: 2560, height: 1440 },
]

/**
 * Tiers (STRESS_TIER). `pr`, the default, is the fast gate: the narrowest
 * phone (320) and the common one (375), the wide-variant threshold (768),
 * the desktop column and the step-through breakout (1280, 1440), Chrome's
 * "Very large" text on a phone (text150-375, R9: supported, not exempt),
 * CSS zoom (R13: geometry measured under a scaled ancestor) and one full-
 * motion config (the reveals play; the rest run reduced). `full` is every
 * width, zoom, text size and R1 extra config, both motion modes.
 * STRESS_CONFIGS=a,b picks configs by name from the full list.
 */
export const PR_CONFIGS = ['w320', 'w375', 'w768', 'w1280', 'w1440', 'text150-375', 'zoom200-css', 'motion-1280']
export const ALL_CONFIGS: Config[] = [...CONFIGS, ...EXTRA_CONFIGS]
export const TIER = process.env.STRESS_TIER === 'full' ? 'full' : 'pr'
export const ONLY = process.env.STRESS_CONFIGS?.split(',')
export const activeConfigs = () =>
  ALL_CONFIGS.filter((c) => (ONLY ? ONLY.includes(c.name) : TIER === 'full' || PR_CONFIGS.includes(c.name)))

/** Strict by default: any finding fails its test. STRESS_STRICT=0 only records. */
export const STRICT = process.env.STRESS_STRICT !== '0'
/** Whether a config's findings fail its test. */
export const gated = (c: Config) => STRICT && !c.recordOnly

/**
 * OPEN DECISIONS (not exemption classes): real findings that need a design
 * ruling before they can be fixed. Each matches only its own rows; the rows
 * stay in the JSON (marked `pending`) and the test annotates them. Remove an
 * entry when the lead rules; the gate then fails until the visual is fixed.
 * - R11-dim: the closures trace dims the rest to 0.4, below 4.5:1 for text
 *   (also annotated by e2e/gates/contrast.spec.ts).
 * - R4-last-time: a choice carrying the "last time" tag keeps one label line
 *   in its 44 px row, so a label that needs two lines truncates.
 */
export const PENDING: { id: string; match: (r: Row) => boolean }[] = [
  {
    id: 'R11-dim',
    match: (r) => r.detector === 'contrast' && r.visual.startsWith('environment-records') && r.state.startsWith('hover'),
  },
  {
    id: 'R4-last-time',
    match: (r) => r.detector === 'truncation' && /\[data-viz-part=viz-checkpoint\] \[data-choice=/.test(r.sig),
  },
]
export const pendingOf = (r: Row) => PENDING.find((p) => p.match(r))?.id

/** The rows that fail a gated config; pending rows are marked and annotated instead. */
export function failing(rows: Row[], annotate?: (id: string, n: number) => void): Row[] {
  const counts = new Map<string, number>()
  const out: Row[] = []
  for (const r of rows) {
    const id = pendingOf(r)
    if (id) {
      r.data = { ...r.data, pending: id }
      counts.set(id, (counts.get(id) ?? 0) + 1)
    } else out.push(r)
  }
  if (annotate) for (const [id, n] of counts) annotate(id, n)
  return out
}

export async function openContext(browser: Browser, c: Config): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    deviceScaleFactor: c.dsf ?? 1,
    reducedMotion: c.motion === 'full' ? 'no-preference' : 'reduce',
    colorScheme: 'dark',
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

export async function goto(page: Page, c: Config, url: string) {
  await page.goto(url, { waitUntil: 'load' })
  if (c.cssZoom) await page.addStyleTag({ content: `html { zoom: ${c.cssZoom} !important; }` })
  if (c.rootFont) await page.addStyleTag({ content: `html { font-size: ${c.rootFont} !important; }` })
  await page.evaluate(() => document.fonts.ready)
}

/** Marks an element with a unique attribute and returns its selector. */
export async function markScope(page: Page, selector: string, nth: number, id: string) {
  const ok = await page.evaluate(
    ([sel, n, id]) => {
      const el = document.querySelectorAll(sel)[n as number]
      if (!el) return false
      el.setAttribute('data-stress-scope', id as string)
      return true
    },
    [selector, nth, id] as const,
  )
  return ok ? `[data-stress-scope="${id}"]` : null
}

export type Row = Finding & {
  config: string
  visual: string
  state: string
  shot?: string
}

/** Collects findings for one config and one group of visuals; writes JSON and screenshots. */
export class Recorder {
  rows: Row[] = []
  private shots = new Map<string, string>()
  private boxes = new Map<string, { state: string; box: NonNullable<Awaited<ReturnType<typeof frameBox>>> }>()
  constructor(
    readonly config: Config,
    readonly group: string,
  ) {
    fs.mkdirSync(SHOTS, { recursive: true })
    fs.mkdirSync(RESULTS, { recursive: true })
  }

  /** Runs every detector on `scope`, plus the zero-CLS comparison against the first state of `stabilityKey`. */
  async check(page: Page, scope: string, visual: string, state: string, opts: DetectOptions = {}, stabilityKey = visual) {
    if (this.config.motion === 'full') {
      if (!(await settleStable(page, scope)))
        this.note(visual, state, 'unsettled', 'the frame was still changing after 4 s of full motion')
    } else await settle(page)
    const found = await detect(page, scope, opts)
    const box = await frameBox(page, `${scope} section, ${scope} figure`)
    if (box) {
      const first = this.boxes.get(stabilityKey)
      if (!first) this.boxes.set(stabilityKey, { state, box })
      else {
        const d = (['x', 'y', 'w', 'h', 'afterY'] as const).filter((k) => first.box[k] !== box[k])
        if (d.length)
          found.push({
            detector: 'layout-shift',
            sig: `${stabilityKey}:${d.join(',')}`,
            msg: `frame moved vs "${first.state}": ${d.map((k) => `${k} ${first.box[k]} -> ${box[k]}`).join(', ')}`,
            rects: [],
            data: { from: first.box, to: box },
          })
      }
    }
    if (found.length) await this.shoot(page, scope, visual, state, found)
    for (const f of found) this.rows.push({ ...f, config: this.config.name, visual, state, shot: (f as Row).shot })
    return found
  }

  /** Records a page-scroll change caused by an interaction. */
  scrollJump(visual: string, state: string, before: number, after: number) {
    if (Math.abs(before - after) > 0.5)
      this.rows.push({
        detector: 'scroll-jump',
        sig: `${visual}:${state}`,
        msg: `page scrollY ${before} -> ${after} on interaction`,
        rects: [],
        config: this.config.name,
        visual,
        state,
        data: { before, after },
      })
  }

  note(visual: string, state: string, detector: string, msg: string, data?: Record<string, unknown>) {
    this.rows.push({ detector, sig: `${visual}:${state}`, msg, rects: [], config: this.config.name, visual, state, data })
  }

  private async shoot(page: Page, scope: string, visual: string, state: string, found: Finding[]) {
    const key = `${visual}|${found
      .map((f) => `${f.detector}:${f.sig}`)
      .sort()
      .join('|')}`
    let file = this.shots.get(key)
    if (!file) {
      const safe = (s: string) => s.replace(/[^a-z0-9-]+/gi, '_').slice(0, 60)
      file = `${this.config.name}__${safe(visual)}__${safe(state)}__${safe([...new Set(found.map((f) => f.detector))].join('+'))}.png`
      this.shots.set(key, file)
      const rects = found.flatMap((f) => f.rects)
      const clip = await page.evaluate(
        ({ sel, rects }) => {
          const el = document.querySelector(sel)
          if (!el) return null
          const layer = document.createElement('div')
          layer.id = '__stress_overlay'
          layer.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none'
          for (const [x, y, w, h] of rects) {
            const d = document.createElement('div')
            d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${Math.max(w, 2)}px;height:${Math.max(h, 2)}px;outline:2px solid #ff2d55;background:rgba(255,45,85,0.12)`
            layer.appendChild(d)
          }
          document.body.appendChild(layer)
          const r = el.getBoundingClientRect()
          const xs = [r.left + scrollX, ...rects.map((q) => q[0])]
          const ys = [r.top + scrollY, ...rects.map((q) => q[1])]
          const x2 = [r.right + scrollX, ...rects.map((q) => q[0] + q[2])]
          const y2 = [r.bottom + scrollY, ...rects.map((q) => q[1] + q[3])]
          const x = Math.max(0, Math.min(...xs) - 8)
          const y = Math.max(0, Math.min(...ys) - 8)
          return {
            x,
            y,
            width: Math.min(document.documentElement.scrollWidth - x, Math.max(...x2) + 8 - x),
            height: Math.min(Math.max(...y2) + 8 - y, 4000),
          }
        },
        { sel: scope, rects },
      )
      try {
        if (clip && clip.width > 0 && clip.height > 0)
          await page.screenshot({ path: path.join(SHOTS, file), clip, fullPage: true, animations: 'disabled' })
      } catch {
        /* screenshot is best effort */
      }
      await page.evaluate(() => document.getElementById('__stress_overlay')?.remove())
    }
    for (const f of found) (f as Row).shot = file
  }

  write() {
    fs.writeFileSync(path.join(RESULTS, `${this.config.name}__${this.group}.json`), JSON.stringify(this.rows, null, 1))
  }
}

/**
 * A pointer click through the DOM (no Playwright auto-scroll), reporting the
 * page scroll before and after. It carries `detail: 1` like a real mouse or
 * touch click, so components take their pointer path (H0 N1: `el.click()` has
 * detail 0, which they treat as a keyboard activation). The keyboard path is
 * checked separately (`keyActivate`).
 */
export async function domClick(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null
    const before = window.scrollY
    if (!el) return null
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, detail: 1, view: window }))
    return new Promise<{ before: number; after: number }>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r({ before, after: window.scrollY }))),
    )
  }, selector)
}

/** env-records detector inputs: DOM-order box ids per svg and each edge's source and target. */
export function envDetectOptions(diagrams: EnvDiagram[]): DetectOptions {
  const boxIds: Record<string, string[]> = {}
  const edges: Record<string, EdgeSpec> = {}
  for (const d of diagrams) {
    for (const variant of ['narrow', 'wide'] as const) {
      let scene
      try {
        scene = layoutDiagram(d, variant)
      } catch {
        continue
      }
      for (const { section, scenes } of scene.sections)
        for (const s of scenes) boxIds[`${variant}:${section.id}:${s.width}`] = s.boxes.map((b) => b.id)
    }
    for (const s of d.sections) {
      const spec: EdgeSpec = {}
      for (const n of s.nodes) {
        if (n.kind === 'function') spec[`env:${n.id}`] = { from: n.id, to: n.env, kind: 'env' }
        if (n.kind === 'record') {
          if (n.outer && n.drawOuter !== false && s.nodes.some((x) => x.id === n.outer))
            spec[`outer:${n.id}`] = { from: n.id, to: n.outer, kind: 'outer' }
          for (const b of n.bindings)
            if ('ref' in b.value) spec[`ref:${n.id}.${b.name}`] = { from: n.id, to: b.value.ref, kind: 'ref' }
        }
      }
      edges[s.id] = spec
    }
  }
  return { boxIds, edges }
}

export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3100'
