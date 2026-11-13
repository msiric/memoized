import type { Page } from '@playwright/test'

/**
 * VIZ-H H0-B rendering-correctness detectors. Reusable: each runs inside the
 * page on one visual's frame (a CSS selector scope) and returns findings with
 * numeric evidence; none of them assert, so a harness can collect every
 * finding across a matrix and gate on the total.
 *
 * Detectors (ids used in findings):
 *  - text-clip       text cut off by an overflow:hidden/clip ancestor (horizontally,
 *                    or a partially visible line vertically; fully hidden lines in a
 *                    windowed pane are intentional and ignored)
 *  - text-spill      text drawn outside its own block box (overflow: visible)
 *  - truncation      text-overflow: ellipsis or a -webkit-line-clamp actually cutting text (counted separately)
 *  - text-overlap    two visible runs of HTML text overlap (after clipping), e.g. a
 *                    footer line drawn over the printed text alternative
 *  - region-overflow a visible element or text outside its [data-viz-region] box,
 *                    or outside the frame. An element marked `data-viz-overhang="top"`
 *                    (or right, bottom, left) may pass its region on that side only:
 *                    the component declares the overhang (the stacked Skip target),
 *                    the harness does not guess it from a selector.
 *  - svg-text-outside   SVG text outside its <svg> viewport
 *  - svg-text-box       SVG text outside the box (rect) it labels
 *  - svg-text-overlap   two SVG texts overlap
 *  - svg-text-on-glyph  SVG text overlaps a box it does not belong to
 *  - edge-through-text  an edge path crosses a text label
 *  - glyph-overlap      two labeled glyphs (chips, rows, cards, boxes, buttons) overlap
 *  - edge-detached      an arrow's start/end is not on its source/target box
 *  - edge-through-box   an arrow passes through a box that is neither its source nor target
 *  - edge-untestable    edges without source/target attributes (testability gap)
 *  - target-size        an interactive target under 44 x 44 CSS px (24 for a focus stop
 *                       that triggers nothing, WCAG 2.5.8)
 *  - contrast           text below 4.5:1 (3:1 for large text) against its composited background.
 *                    The one documented exemption: text inside an `aria-disabled` or
 *                    disabled control (WCAG 1.4.3 exempts inactive components).
 *  - page-overflow      the document scrolls horizontally
 *
 * Layout stability (frame box per step / preset, page scroll on interaction)
 * needs several states, so it lives in `frameBox` + the spec.
 */

export type Finding = {
  detector: string
  /** Stable description of the element (data attributes, tag path). */
  sig: string
  msg: string
  /** Page-coordinate rects to outline in the failure screenshot. */
  rects: [number, number, number, number][]
  data?: Record<string, unknown>
}

export type EdgeSpec = Record<string, { from: string; to: string; kind: string }>
export type DetectOptions = {
  /** env-records: per `${variant}:${section}:${width}` the box ids in DOM order. */
  boxIds?: Record<string, string[]>
  /** env-records: per section id, each edge id's source and target box id. */
  edges?: Record<string, EdgeSpec>
  /** list-keys: expected after-row index -> before-row index (null = mounted). */
  reused?: (number | null)[]
  /** Skip detectors by id. */
  skip?: string[]
}

export async function detect(page: Page, scope: string, opts: DetectOptions = {}): Promise<Finding[]> {
  return page.evaluate(runDetectors, { scope, opts })
}

/** The frame's page box (x, page y, w, h) and the next sibling's page y, for zero-CLS checks. */
export async function frameBox(page: Page, scope: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const mount = el.closest('[data-viz]') ?? el
    const after = mount.nextElementSibling?.getBoundingClientRect()
    const round = (n: number) => Math.round(n * 2) / 2
    return {
      x: round(r.x),
      y: round(r.y + window.scrollY),
      w: round(r.width),
      h: round(r.height),
      afterY: after ? round(after.y + window.scrollY) : null,
      scrollY: window.scrollY,
    }
  }, scope)
}

/** Waits until CSS/WAAPI animations finish and two frames have painted. */
export async function settle(page: Page, ms = 60) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  if (ms) await page.waitForTimeout(ms)
}

/**
 * Full motion: waits until the frame under `scope` stops changing (every
 * element's box and effective opacity equal over two samples 80 ms apart),
 * after Web Animations finish. framer-motion drives some values from
 * requestAnimationFrame, which `getAnimations()` does not list.
 */
export async function settleStable(page: Page, scope: string, timeout = 4000) {
  await settle(page, 0)
  const sig = () =>
    page.evaluate((sel) => {
      const root = document.querySelector(sel)
      if (!root) return ''
      return [...root.querySelectorAll('*')]
        .map((e) => {
          const r = e.getBoundingClientRect()
          return `${Math.round(r.x * 2)},${Math.round(r.y * 2)},${Math.round(r.width * 2)},${Math.round(r.height * 2)},${getComputedStyle(e).opacity}`
        })
        .join(';')
    }, scope)
  const end = Date.now() + timeout
  let last = await sig()
  while (Date.now() < end) {
    await page.waitForTimeout(80)
    const now = await sig()
    if (now === last) return true
    last = now
  }
  return false
}

// ---------------------------------------------------------------------------
// In-page code. Everything below runs in the browser and must be self-contained.
// ---------------------------------------------------------------------------

function runDetectors({ scope, opts }: { scope: string; opts: DetectOptions }): Finding[] {
  const root = document.querySelector(scope) as HTMLElement | null
  const out: Finding[] = []
  if (!root) return [{ detector: 'missing', sig: scope, msg: 'scope not found', rects: [] }]
  const skip = new Set(opts.skip ?? [])
  const sx = window.scrollX
  const sy = window.scrollY
  type R = { l: number; t: number; r: number; b: number }
  const R = (d: DOMRect | R): R =>
    'left' in d ? { l: d.left, t: d.top, r: d.right, b: d.bottom } : d
  const page = (r: R): [number, number, number, number] => [
    Math.round(r.l + sx),
    Math.round(r.t + sy),
    Math.round(r.r - r.l),
    Math.round(r.b - r.t),
  ]
  const n1 = (n: number) => Math.round(n * 10) / 10
  const union = (rs: R[]): R => ({
    l: Math.min(...rs.map((r) => r.l)),
    t: Math.min(...rs.map((r) => r.t)),
    r: Math.max(...rs.map((r) => r.r)),
    b: Math.max(...rs.map((r) => r.b)),
  })
  const inter = (a: R, b: R) => {
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l)
    const h = Math.min(a.b, b.b) - Math.max(a.t, b.t)
    return w > 0 && h > 0 ? { w, h } : null
  }
  const push = (f: Finding) => {
    if (!skip.has(f.detector)) out.push(f)
  }

  const ATTRS = [
    'data-viz-region',
    'data-viz-part',
    'data-chip',
    'data-glyph',
    'data-edge',
    'data-link',
    'data-row',
    'data-choice',
    'data-line',
    'data-out',
    'data-viz-section',
    'data-viz-width',
    'data-viz-variant',
    'aria-label',
  ]
  const sig = (el: Element): string => {
    const parts: string[] = []
    let e: Element | null = el
    let depth = 0
    while (e && e !== root.parentElement && depth < 12) {
      const a = ATTRS.find(
        (k) => e!.hasAttribute(k) && (k !== 'aria-label' || e!.matches('button,[role=radio],[role=slider],summary,select,input')),
      )
      if (a) parts.unshift(`[${a}=${(e.getAttribute(a) ?? '').slice(0, 30)}]`)
      else if (depth === 0) parts.unshift(e.tagName.toLowerCase())
      e = e.parentElement
      depth++
    }
    return parts.slice(-4).join(' ')
  }

  const styleOf = (el: Element) => getComputedStyle(el)
  const opacityChain = (el: Element | null): number => {
    let o = 1
    for (let e = el; e; e = e.parentElement) o *= Number(styleOf(e).opacity || 1)
    return o
  }
  const visible = (el: Element): boolean => {
    if (!(el as HTMLElement).getClientRects().length) return false
    const s = styleOf(el)
    if (s.visibility !== 'visible') return false
    if (opacityChain(el) < 0.05) return false
    const r = el.getBoundingClientRect()
    if (r.width <= 1 && r.height <= 1) return false
    // sr-only: clipped to nothing.
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const cs = styleOf(e)
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return false
      if (e.getAttribute('aria-hidden') === 'true' && cs.position === 'absolute' && cs.visibility !== 'visible')
        return false
    }
    return true
  }

  // ---- text nodes (HTML) --------------------------------------------------
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: { node: Text; el: Element; rects: R[] }[] = []
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text
    if (!t.data.trim()) continue
    const el = t.parentElement
    if (!el || el.closest('svg') || el.closest('script,style,noscript,option')) continue
    // A closed <details> keeps its body laid out but unpainted (content-visibility).
    const det = el.closest('details')
    if (det && !det.open && !el.closest('summary')) continue
    if (!visible(el)) continue
    // Ink only: each run of non-space characters. A space that hangs past the
    // line end under white-space: pre-wrap draws nothing (it is not a spill).
    const rects: R[] = []
    for (const m of t.data.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(t, m.index!)
      range.setEnd(t, m.index! + m[0].length)
      for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(R(r))
    }
    if (rects.length) texts.push({ node: t, el, rects })
  }

  const blockOf = (el: Element): Element => {
    let e: Element | null = el
    while (e && e !== root) {
      const d = styleOf(e).display
      if (!d.startsWith('inline') || d === 'inline-block' || d === 'inline-flex' || d === 'inline-grid') return e
      e = e.parentElement
    }
    return root
  }

  const paddingBox = (el: Element): R => {
    const r = el.getBoundingClientRect()
    const s = styleOf(el)
    return {
      l: r.left + parseFloat(s.borderLeftWidth),
      t: r.top + parseFloat(s.borderTopWidth),
      r: r.right - parseFloat(s.borderRightWidth),
      b: r.bottom - parseFloat(s.borderBottomWidth),
    }
  }

  const reported = new Set<string>()
  for (const { node, el, rects } of texts) {
    const u = union(rects)
    const text = node.data.trim().slice(0, 60)
    // Truncation by ellipsis (own element), counted separately.
    let truncatedBy: Element | null = null
    for (let e: Element | null = el; e && root.contains(e); e = e.parentElement) {
      const s = styleOf(e)
      if (s.textOverflow === 'ellipsis' && s.overflowX !== 'visible') {
        if ((e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1) truncatedBy = e
        break
      }
      // A line clamp (R2 G3): `-webkit-line-clamp` on a `-webkit-box` cuts
      // whole lines, which shows as content taller than the box, not wider.
      const clamp = s.getPropertyValue('-webkit-line-clamp')
      if (clamp && clamp !== 'none' && /-webkit-box/.test(s.display)) {
        if ((e as HTMLElement).scrollHeight > (e as HTMLElement).clientHeight + 1) truncatedBy = e
        break
      }
      if (styleOf(e).display !== 'inline') break
    }
    if (truncatedBy && !reported.has(`trunc:${sig(truncatedBy)}`)) {
      reported.add(`trunc:${sig(truncatedBy)}`)
      const h = truncatedBy as HTMLElement
      push({
        detector: 'truncation',
        sig: sig(truncatedBy),
        msg:
          h.scrollHeight > h.clientHeight + 1 && h.scrollWidth <= h.clientWidth + 1
            ? `"${text}" clamped: scrollHeight ${h.scrollHeight} > clientHeight ${h.clientHeight}`
            : `"${text}" truncated: scrollWidth ${h.scrollWidth} > clientWidth ${h.clientWidth}`,
        rects: [page(R(h.getBoundingClientRect()))],
        data: { scrollWidth: h.scrollWidth, clientWidth: h.clientWidth, text: node.data.slice(0, 120) },
      })
    }
    // Clipping by overflow ancestors (the truncating element excluded). A line
    // wholly outside a nearer clipping box is already hidden (a code window's
    // rows above or below it), so farther ancestors do not see it.
    const hidden = new Set<(typeof rects)[number]>()
    for (let e: Element | null = el; e; e = e.parentElement) {
      if (e === truncatedBy) continue
      const s = styleOf(e)
      const clipX = s.overflowX === 'hidden' || s.overflowX === 'clip'
      const clipY = s.overflowY === 'hidden' || s.overflowY === 'clip'
      const scrollX = s.overflowX === 'auto' || s.overflowX === 'scroll'
      if (!clipX && !clipY && !scrollX) continue
      if (s.clip === 'rect(0px, 0px, 0px, 0px)') break
      const box = paddingBox(e)
      const key = `clip:${sig(el)}:${sig(e)}`
      if (clipX && (u.r > box.r + 1 || u.l < box.l - 1) && u.l < box.r && u.r > box.l && !reported.has(key)) {
        reported.add(key)
        push({
          detector: 'text-clip',
          sig: sig(el),
          msg: `"${text}" clipped horizontally by ${sig(e)}: text ${n1(u.l)}..${n1(u.r)} vs box ${n1(box.l)}..${n1(box.r)}`,
          rects: [page(u), page(box)],
          data: { overBy: n1(Math.max(u.r - box.r, box.l - u.l)), by: sig(e) },
        })
      }
      if (clipY) {
        for (const line of rects) {
          if (hidden.has(line)) continue
          const partial = line.t < box.t - 1 !== line.b > box.b + 1 && (line.t < box.t - 1 || line.b > box.b + 1)
          const inside = line.b > box.t && line.t < box.b
          if (!inside) {
            hidden.add(line)
            continue
          }
          if (partial && inside && !reported.has(key + 'y')) {
            reported.add(key + 'y')
            push({
              detector: 'text-clip',
              sig: sig(el),
              msg: `"${text}" line partly clipped vertically by ${sig(e)}: line ${n1(line.t)}..${n1(line.b)} vs box ${n1(box.t)}..${n1(box.b)}`,
              rects: [page(line), page(box)],
              data: { by: sig(e) },
            })
          }
        }
      }
      if (scrollX && (e as HTMLElement).scrollWidth > (e as HTMLElement).clientWidth + 1 && !reported.has(key + 's')) {
        reported.add(key + 's')
        push({
          detector: 'text-clip',
          sig: sig(e),
          msg: `scroll container ${sig(e)} scrolls horizontally (${(e as HTMLElement).scrollWidth} > ${(e as HTMLElement).clientWidth})`,
          rects: [page(box)],
          data: { scroll: true },
        })
      }
    }
    // Spill outside its own block box.
    const block = blockOf(el)
    const bb = R(block.getBoundingClientRect())
    const bs = styleOf(block)
    if (bs.overflowX === 'visible' && (u.r > bb.r + 1 || u.l < bb.l - 1)) {
      const key = `spill:${sig(el)}`
      if (!reported.has(key)) {
        reported.add(key)
        push({
          detector: 'text-spill',
          sig: sig(el),
          msg: `"${text}" spills out of ${sig(block)} by ${n1(Math.max(u.r - bb.r, bb.l - u.l))}px horizontally`,
          rects: [page(u), page(bb)],
          data: { overBy: n1(Math.max(u.r - bb.r, bb.l - u.l)) },
        })
      }
    }
    if (bs.overflowY === 'visible' && (u.b > bb.b + 1 || u.t < bb.t - 1) && (block as HTMLElement).style.height !== '') {
      const key = `spilly:${sig(el)}`
      if (!reported.has(key)) {
        reported.add(key)
        push({
          detector: 'text-spill',
          sig: sig(el),
          msg: `"${text}" spills out of fixed-height ${sig(block)} by ${n1(Math.max(u.b - bb.b, bb.t - u.t))}px vertically`,
          rects: [page(u), page(bb)],
        })
      }
    }
  }

  // ---- text over text: two visible runs of ink that overlap -------------------
  // Each run is cut to its clipping ancestors (a code window's hidden rows, a
  // truncated label's tail), so only ink a reader sees is compared. An element
  // declared as an overlay (`data-viz-layer="overlay"`: the scrubber's tooltip,
  // opaque, over the bar on purpose) is not compared.
  const clipOf = (el: Element): R | null => {
    let box: R | null = null
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const cs = styleOf(e)
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
      const b = paddingBox(e)
      box = box ? { l: Math.max(box.l, b.l), t: Math.max(box.t, b.t), r: Math.min(box.r, b.r), b: Math.min(box.b, b.b) } : b
    }
    return box
  }
  const ink = texts
    .filter(({ el }) => !el.closest('[data-viz-layer="overlay"]'))
    .map(({ node, el, rects }) => {
      const c = clipOf(el)
      const cut = rects
        .map((r) => (c ? { l: Math.max(r.l, c.l), t: Math.max(r.t, c.t), r: Math.min(r.r, c.r), b: Math.min(r.b, c.b) } : r))
        .filter((r) => r.r - r.l > 0.5 && r.b - r.t > 0.5)
      return { node, el, rects: cut }
    })
  for (let i = 0; i < ink.length; i++)
    for (let j = i + 1; j < ink.length; j++) {
      const a = ink[i]
      const b = ink[j]
      if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue
      let hit: { w: number; h: number } | null = null
      let ra: R | null = null
      let rb: R | null = null
      for (const x of a.rects) {
        for (const y of b.rects) {
          const o = inter(x, y)
          if (o && o.w * o.h > 4) {
            hit = o
            ra = x
            rb = y
            break
          }
        }
        if (hit) break
      }
      if (!hit) continue
      const key = `overlap:${sig(a.el)}:${sig(b.el)}`
      if (reported.has(key)) continue
      reported.add(key)
      push({
        detector: 'text-overlap',
        sig: `${sig(a.el)} x ${sig(b.el)}`,
        msg: `"${a.node.data.trim().slice(0, 30)}" overlaps "${b.node.data.trim().slice(0, 30)}" by ${n1(hit.w)}x${n1(hit.h)}px`,
        rects: [page(ra!), page(rb!)],
      })
    }

  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const parse = (c: string): [number, number, number, number] => {
    const m = c.match(/^rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\)$/)
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return [+m[1], +m[2], +m[3], a]
    }
    cv.clearRect(0, 0, 1, 1)
    cv.fillStyle = '#000'
    cv.fillStyle = c
    cv.fillRect(0, 0, 1, 1)
    const d = cv.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  // ---- region overflow: every visible element stays in its region and frame
  const frame = root.matches('section,figure') ? root : (root.querySelector('section,figure') ?? root)
  const frameR = R(frame.getBoundingClientRect())
  const all = [...frame.querySelectorAll('*')].filter((e) => !(e.closest('svg') && e.tagName !== 'svg'))
  for (const e of all) {
    if (!visible(e)) continue
    if (e.closest('details') && !(e.closest('details') as HTMLDetailsElement).open && e.tagName !== 'SUMMARY')
      continue
    const r = R(e.getBoundingClientRect())
    const region = e.parentElement?.closest('[data-viz-region]')
    // Elements inside an overflow-clipping ancestor (region included) are handled by text-clip.
    let clipped = false
    for (let a = e.parentElement; a && a !== frame.parentElement; a = a.parentElement) {
      const s = styleOf(a)
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') clipped = true
    }
    if (clipped) continue
    // Only elements that paint something: own text, a background, a border, or replaced content.
    const es = styleOf(e)
    const paints =
      [...e.childNodes].some((c) => c.nodeType === 3 && (c.textContent ?? '').trim()) ||
      parse(es.backgroundColor)[3] > 0 ||
      parseFloat(es.borderTopWidth) + parseFloat(es.borderLeftWidth) > 0 ||
      /^(svg|img|button|input|select)$/i.test(e.tagName)
    if (!paints) continue
    // A declared overhang (data-viz-overhang="top" ...) may pass its region on that side.
    const overhang = new Set((e.closest('[data-viz-overhang]')?.getAttribute('data-viz-overhang') ?? '').split(/\s+/))
    for (const [box, name] of [
      [region, 'region'],
      [frame, 'frame'],
    ] as const) {
      if (!box) continue
      const b = name === 'frame' ? frameR : R(box.getBoundingClientRect())
      const side = (k: string, v: number) => (name === 'region' && overhang.has(k) ? 0 : v)
      const over = Math.max(side('right', r.r - b.r), side('left', b.l - r.l), side('bottom', r.b - b.b), side('top', b.t - r.t))
      if (over > 1.5) {
        const key = `region:${sig(e)}:${name}`
        if (reported.has(key)) continue
        reported.add(key)
        push({
          detector: 'region-overflow',
          sig: sig(e),
          msg: `${sig(e)} extends ${n1(over)}px outside its ${name === 'region' ? sig(box) : 'frame'}`,
          rects: [page(r), page(b)],
          data: { overBy: n1(over), container: name === 'region' ? sig(box) : 'frame' },
        })
        break
      }
    }
  }

  // ---- SVG ------------------------------------------------------------------
  // A figure's boxes are its top-level groups. Decorative wrappers
  // (`g[aria-hidden]`, VIZ-H D21: only the function objects are exposed) are
  // transparent: their child groups count as top level.
  // A box is the glyph a group draws first. A function's transparent touch
  // band (`.vz-hit`, R11) comes before it and is not a glyph: it reaches
  // past the box by design (a 45 px target), so measuring labels, overlap
  // and edge ends against it would pass a label that overruns the drawn box
  // and flag text that only meets the invisible band.
  const BOX = ':is(rect:first-child:not(.vz-hit), rect.vz-hit:first-child + rect)'
  const TOP_RECT = `:scope > g:not([aria-hidden]) > ${BOX}, :scope > g[aria-hidden] > g > ${BOX}`
  const isWrapper = (el: Element | null, svg: Element) =>
    !!el && el.parentElement === svg && el.matches('g[aria-hidden]')
  const svgs = [...frame.querySelectorAll('svg')].filter((s) => visible(s) && s.getBoundingClientRect().width > 24)
  for (const svg of svgs) {
    const vp = R(svg.getBoundingClientRect())
    const tx = [...svg.querySelectorAll('text')].filter((t) => visible(t))
    const boxes = [...svg.querySelectorAll(TOP_RECT)].filter(
      (r) => !r.closest('[data-edge]') && visible(r),
    ) as SVGRectElement[]
    const tR = tx.map((t) => R(t.getBoundingClientRect()))
    tx.forEach((t, i) => {
      const r = tR[i]
      const label = (t.textContent ?? '').slice(0, 40)
      const over = Math.max(r.r - vp.r, vp.l - r.l, r.b - vp.b, vp.t - r.t)
      if (over > 1)
        push({
          detector: 'svg-text-outside',
          sig: sig(t),
          msg: `"${label}" is ${n1(over)}px outside its svg viewport`,
          rects: [page(r), page(vp)],
          data: { overBy: n1(over) },
        })
      // The box a label belongs to: the rect that opens its top-level group.
      let top: Element | null = t
      while (top && (top.parentElement as Element | null) !== svg && !isWrapper(top.parentElement, svg))
        top = top.parentElement
      const own = (top?.tagName === 'g' ? top.querySelector(`:scope > ${BOX}`) : null) as SVGRectElement | null
      if (own && boxes.includes(own)) {
        const b = R(own.getBoundingClientRect())
        const o = Math.max(r.r - b.r, b.l - r.l)
        if (o > 0.5)
          push({
            detector: 'svg-text-box',
            sig: `${sig(t)} "${label}"`,
            msg: `"${label}" overruns its box by ${n1(o)}px (text ${n1(r.r - r.l)}px wide, box ${n1(b.r - b.l)}px)`,
            rects: [page(r), page(b)],
            data: { overBy: n1(o), textW: n1(r.r - r.l), boxW: n1(b.r - b.l) },
          })
      }
      for (const b of boxes) {
        if (b === own) continue
        const ir = inter(r, R(b.getBoundingClientRect()))
        if (ir && ir.w > 1 && ir.h > 1)
          push({
            detector: 'svg-text-on-glyph',
            sig: `${sig(t)} "${label}"`,
            msg: `"${label}" overlaps another box by ${n1(ir.w)}x${n1(ir.h)}px`,
            rects: [page(r), page(R(b.getBoundingClientRect()))],
          })
      }
      for (let j = i + 1; j < tx.length; j++) {
        const ir = inter(r, tR[j])
        if (ir && ir.w > 1 && ir.h > 2)
          push({
            detector: 'svg-text-overlap',
            sig: `"${label}" x "${(tx[j].textContent ?? '').slice(0, 30)}"`,
            msg: `two labels overlap by ${n1(ir.w)}x${n1(ir.h)}px`,
            rects: [page(r), page(tR[j])],
          })
      }
    })
    // Edges through text.
    const edgePaths = [...svg.querySelectorAll('[data-edge] > path:first-child, [data-link] > path')] as SVGPathElement[]
    for (const p of edgePaths) {
      const len = p.getTotalLength()
      const m = p.getScreenCTM()
      if (!m || !len) continue
      const pts: DOMPoint[] = []
      for (let s = 0; s <= len; s += 2) pts.push(p.getPointAtLength(s).matrixTransform(m))
      tx.forEach((t, i) => {
        if (p.closest('g')?.contains(t)) return
        const r = tR[i]
        const hit = pts.some((q) => q.x > r.l + 1 && q.x < r.r - 1 && q.y > r.t + 1 && q.y < r.b - 1)
        if (hit)
          push({
            detector: 'edge-through-text',
            sig: `${sig(p)} x "${(t.textContent ?? '').slice(0, 30)}"`,
            msg: `edge ${sig(p)} crosses the label "${(t.textContent ?? '').slice(0, 30)}"`,
            rects: [page(r)],
          })
      })
    }
  }

  // ---- glyph overlap ------------------------------------------------------
  const glyphSel =
    '[data-chip], li[data-row], [data-viz-part="state-chip"], button, [role="radio"], [role="slider"], summary, select'
  const glyphs = [...frame.querySelectorAll(glyphSel)].filter((g) => visible(g))
  for (const svg of svgs)
    glyphs.push(
      ...([...svg.querySelectorAll(TOP_RECT)].filter(
        (r) => !r.closest('[data-edge]') && visible(r),
      ) as Element[]),
    )
  const gR = glyphs.map((g) => R(g.getBoundingClientRect()))
  for (let i = 0; i < glyphs.length; i++)
    for (let j = i + 1; j < glyphs.length; j++) {
      if (glyphs[i].contains(glyphs[j]) || glyphs[j].contains(glyphs[i])) continue
      const ir = inter(gR[i], gR[j])
      if (ir && ir.w > 1 && ir.h > 1)
        push({
          detector: 'glyph-overlap',
          sig: `${sig(glyphs[i])} x ${sig(glyphs[j])}`,
          msg: `${sig(glyphs[i])} overlaps ${sig(glyphs[j])} by ${n1(ir.w)}x${n1(ir.h)}px`,
          rects: [page(gR[i]), page(gR[j])],
          data: { w: n1(ir.w), h: n1(ir.h) },
        })
    }

  // ---- edges ---------------------------------------------------------------
  const distToRect = (p: { x: number; y: number }, r: R) => {
    const dx = Math.max(r.l - p.x, 0, p.x - r.r)
    const dy = Math.max(r.t - p.y, 0, p.y - r.b)
    return Math.hypot(dx, dy)
  }
  const inside = (p: { x: number; y: number }, r: R, pad = 0) =>
    p.x > r.l + pad && p.x < r.r - pad && p.y > r.t + pad && p.y < r.b - pad
  for (const svg of svgs) {
    const edges = [...svg.querySelectorAll('[data-edge]')]
    if (!edges.length) continue
    const section = svg.closest('[data-viz-section]')?.getAttribute('data-viz-section') ?? ''
    const variant = svg.closest('[data-viz-variant]')?.getAttribute('data-viz-variant') ?? ''
    const width = svg.getAttribute('data-viz-width') ?? ''
    const ids = opts.boxIds?.[`${variant}:${section}:${width}`]
    const spec = opts.edges?.[section]
    // Boxes name themselves (`data-node`) and arrows their ends (`data-from`,
    // `data-to`) since WS3; the layout model is only the fallback.
    const named = [...svg.querySelectorAll(':scope > g[data-node], :scope > g[aria-hidden] > g[data-node]')]
    let boxR: Map<string, R>
    if (named.length) {
      boxR = new Map(
        named.map((g) => [g.getAttribute('data-node')!, R((g.querySelector(`:scope > ${BOX}`) as SVGRectElement).getBoundingClientRect())]),
      )
    } else {
      const boxEls = [
        ...svg.querySelectorAll(
          `:scope > g:not([data-edge]):not([aria-hidden]) > ${BOX}, :scope > g[aria-hidden] > g:not([data-edge]) > ${BOX}`,
        ),
      ] as SVGRectElement[]
      if (!ids || !spec || ids.length !== boxEls.length) {
        push({
          detector: 'edge-untestable',
          sig: `${variant}:${section}:${width}`,
          msg: `boxes carry no ids (${boxEls.length} boxes, ${ids?.length ?? 'no'} expected ids): edge endpoints can only be checked against the layout model`,
          rects: [],
        })
        continue
      }
      boxR = new Map(ids.map((id, i) => [id, R(boxEls[i].getBoundingClientRect())]))
    }
    for (const g of edges) {
      const id = g.getAttribute('data-edge')!
      const kind = id.slice(0, id.indexOf(':')) as 'env' | 'outer' | 'ref'
      const fromAttr = g.getAttribute('data-from')
      const toAttr = g.getAttribute('data-to')
      const want = fromAttr && toAttr ? { from: fromAttr, to: toAttr, kind } : spec?.[id]
      const [line, head] = [...g.querySelectorAll('path')] as SVGPathElement[]
      const m = line.getScreenCTM()
      if (!want || !m) continue
      const len = line.getTotalLength()
      const a = line.getPointAtLength(0).matrixTransform(m)
      const z = line.getPointAtLength(len).matrixTransform(m)
      const hb = R(head.getBoundingClientRect())
      const src = boxR.get(want.from)
      const dst = boxR.get(want.to)
      if (!src || !dst) continue
      const dot = g.querySelector('circle')
      const startOk = want.kind === 'ref' ? Boolean(dot) && inside(a, src) : distToRect(a, src) <= 2
      // The head's tip must touch the target's border.
      const tipD = Math.min(
        ...[
          { x: (hb.l + hb.r) / 2, y: hb.t },
          { x: (hb.l + hb.r) / 2, y: hb.b },
          { x: hb.l, y: (hb.t + hb.b) / 2 },
          { x: hb.r, y: (hb.t + hb.b) / 2 },
        ].map((p) => distToRect(p, dst)),
      )
      const endOk = distToRect(z, dst) <= 8 && tipD <= 2
      if (!startOk || !endOk)
        push({
          detector: 'edge-detached',
          sig: `${section}:${id}`,
          msg: `edge ${id} (${want.from} -> ${want.to}): start ${startOk ? 'ok' : `${n1(distToRect(a, src))}px off source`}, end ${endOk ? 'ok' : `path end ${n1(distToRect(z, dst))}px, head tip ${n1(tipD)}px from target`}`,
          rects: [page(src), page(dst), page(hb)],
          data: { startD: n1(distToRect(a, src)), endD: n1(distToRect(z, dst)), tipD: n1(tipD) },
        })
      const pts: DOMPoint[] = []
      for (let s = 0; s <= len; s += 2) pts.push(line.getPointAtLength(s).matrixTransform(m))
      for (const [bid, br] of boxR) {
        if (bid === want.from || bid === want.to) continue
        const hits = pts.filter((p) => inside(p, br, 2)).length
        if (hits)
          push({
            detector: 'edge-through-box',
            sig: `${section}:${id} x ${bid}`,
            msg: `edge ${id} passes through box ${bid} (${hits * 2}px of path inside)`,
            rects: [page(br)],
          })
      }
    }
  }
  // list-keys match lines: endpoints on the right cards.
  const lines = frame.querySelector('[data-viz-part="lines"]') as SVGSVGElement | null
  if (lines && visible(lines)) {
    const before = [...frame.querySelectorAll('[data-viz-part="before"] li[data-row]')].map((e) =>
      R(e.getBoundingClientRect()),
    )
    const after = [...frame.querySelectorAll('[data-viz-part="after"] li[data-row]')].map((e) =>
      R(e.getBoundingClientRect()),
    )
    // H3 R6: a line meets its card at the checkbox's height (the checkbox
    // sits on the edge that faces the lines), side by side or stacked (R9).
    const checkY = (side: string, i: number, r: R) => {
      const box = frame.querySelector(`[data-viz-part="${side}"] li[data-row]:nth-of-type(${i + 1}) [data-lk-check]`)
      if (!box) return (r.t + r.b) / 2
      const b = box.getBoundingClientRect()
      return b.top + b.height / 2
    }
    const nearest = (rs: R[], y: number, side: string) => {
      let best = -1
      let d = Infinity
      rs.forEach((r, i) => {
        const dy = Math.abs(checkY(side, i, r) - y)
        if (dy < d) {
          d = dy
          best = i
        }
      })
      return { i: best, d }
    }
    const reusedPaths = [...lines.querySelectorAll('[data-link="reused"] > path')] as SVGPathElement[]
    const got: Record<number, number> = {}
    for (const p of reusedPaths) {
      const m = p.getScreenCTM()
      if (!m) continue
      const a = p.getPointAtLength(0).matrixTransform(m)
      const z = p.getPointAtLength(p.getTotalLength()).matrixTransform(m)
      const s = nearest(before, a.y, 'before')
      const t = nearest(after, z.y, 'after')
      if (s.i < 0 || t.i < 0) continue
      got[t.i] = s.i
      const sx2 = Math.abs(a.x - before[s.i].r)
      // Side by side the line enters the After card's left edge; stacked, its right edge.
      const tx2 = Math.min(Math.abs(z.x - after[t.i].l), Math.abs(z.x - after[t.i].r))
      if (s.d > 2 || t.d > 2 || sx2 > 2 || tx2 > 2)
        push({
          detector: 'edge-detached',
          sig: `list-keys reused ${s.i}->${t.i}`,
          msg: `match line ${s.i}->${t.i}: start ${n1(sx2)}px from before-card edge (dy ${n1(s.d)} from its checkbox), end ${n1(tx2)}px from after-card edge (dy ${n1(t.d)})`,
          rects: [page(before[s.i]), page(after[t.i])],
          data: { sx: n1(sx2), sy: n1(s.d), tx: n1(tx2), ty: n1(t.d) },
        })
      // State chip rides at the midpoint of its line.
    }
    if (opts.reused) {
      opts.reused.forEach((from, i) => {
        if (from === null || from === undefined) return
        if (got[i] !== from)
          push({
            detector: 'edge-detached',
            sig: `list-keys expected ${from}->${i}`,
            msg: `expected a match line from before row ${from} to after row ${i}, found ${got[i] ?? 'none'}`,
            rects: [page(after[i] ?? frameR)],
          })
      })
    }
    // Each state chip rides its own line (data-from / data-to on its holder),
    // and two chips never overlap (M09).
    const chipRects: R[] = []
    for (const chip of frame.querySelectorAll('[data-viz-part="state-chip"]')) {
      const r = R(chip.getBoundingClientRect())
      chipRects.push(r)
      const c = { x: (r.l + r.r) / 2, y: (r.t + r.b) / 2 }
      const holder = chip.parentElement
      const from = holder?.getAttribute('data-from')
      const to = holder?.getAttribute('data-to')
      const own = from && to ? (lines.querySelector(`[data-link][data-from="${from}"][data-to="${to}"] > path`) as SVGPathElement | null) : null
      const candidates = own ? [own] : reusedPaths
      const onLine = candidates.some((p) => {
        const m = p.getScreenCTM()!
        const len = p.getTotalLength()
        for (let s = 0; s <= len; s += 2) {
          const q = p.getPointAtLength(s).matrixTransform(m)
          if (Math.hypot(q.x - c.x, q.y - c.y) < 3) return true
        }
        return false
      })
      if (!onLine)
        push({
          detector: 'edge-detached',
          sig: 'list-keys state-chip',
          msg: `state chip centre (${n1(c.x)}, ${n1(c.y)}) is not on ${own ? `its line ${from} -> ${to}` : 'any match line'}`,
          rects: [page(r)],
        })
    }
    for (let i = 0; i < chipRects.length; i++)
      for (let j = i + 1; j < chipRects.length; j++) {
        const a = chipRects[i]
        const b = chipRects[j]
        if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b)
          push({
            detector: 'glyph-overlap',
            sig: 'list-keys state-chips',
            msg: 'two state chips overlap',
            rects: [page(a), page(b)],
          })
      }
  }

  // ---- interactive targets ------------------------------------------------
  const targets = [
    ...frame.querySelectorAll(
      'button, a[href], input, select, summary, [role="radio"], [role="slider"], [role="button"], [tabindex="0"]',
    ),
  ].filter((e) => visible(e))
  const seenT = new Set<Element>()
  for (const t of targets) {
    if (seenT.has(t)) continue
    seenT.add(t)
    // An input inside a <label> is hit through the whole label.
    const hit = t.matches('input') && t.closest('label') ? t.closest('label')! : t
    const r = hit.getBoundingClientRect()
    // A focus stop that triggers nothing (a closures function object: hover
    // or focus only brings its path forward, D21) is held to WCAG 2.5.8's
    // 24 px, not the 44 px of a control (A5).
    const min = t.matches('svg [tabindex="0"]:not([role="button"])') ? 23.5 : 43.5
    if (r.width < min || r.height < min)
      push({
        detector: 'target-size',
        sig: sig(t),
        msg: `${sig(t)} is ${n1(r.width)}x${n1(r.height)} CSS px`,
        rects: [page(R(r))],
        data: { w: n1(r.width), h: n1(r.height), disabled: t.getAttribute('aria-disabled') === 'true' },
      })
  }

  // ---- contrast -------------------------------------------------------------
  const over = (top: [number, number, number, number], under: [number, number, number]): [number, number, number] => [
    top[0] * top[3] + under[0] * (1 - top[3]),
    top[1] * top[3] + under[1] * (1 - top[3]),
    top[2] * top[3] + under[2] * (1 - top[3]),
  ]
  const lum = ([r, g, b]: [number, number, number]) => {
    const f = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a: [number, number, number], b: [number, number, number]) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const htmlBg = (el: Element): { bg: [number, number, number]; unknown: boolean } => {
    const chain: Element[] = []
    for (let e: Element | null = el; e; e = e.parentElement) chain.push(e)
    let bg: [number, number, number] = [255, 255, 255]
    let unknown = false
    for (const e of chain.reverse()) {
      const s = styleOf(e)
      if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url')) unknown = true
      const c = parse(s.backgroundColor)
      if (c[3] > 0) bg = over([c[0], c[1], c[2], c[3] * Number(s.opacity || 1)], bg)
    }
    return { bg, unknown }
  }
  const checkContrast = (el: Element, fgStr: string, bg: [number, number, number], why: string, size: number, weight: number, text: string, note?: string) => {
    const fg = parse(fgStr)
    const alpha = fg[3] * opacityChain(el)
    const eff = over([fg[0], fg[1], fg[2], alpha], bg)
    const r = ratio(eff, bg)
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const need = large ? 3 : 4.5
    // The documented exemption: an inactive control (WCAG 1.4.3).
    const inactive = Boolean(el.closest('[aria-disabled="true"],[disabled]'))
    if (r < need - 0.005 && !inactive) {
      const key = `contrast:${sig(el)}:${text}`
      if (reported.has(key)) return
      reported.add(key)
      push({
        detector: 'contrast',
        sig: sig(el),
        msg: `"${text}" ${n1(r)}:1 < ${need}:1 (${why}; fg ${eff.map(Math.round).join(',')} on bg ${bg.map(Math.round).join(',')}${inactive ? '; inactive control' : ''}${note ? '; ' + note : ''})`,
        rects: [page(R(el.getBoundingClientRect()))],
        data: { ratio: n1(r), need, size, inactive, fg: eff.map(Math.round), bg: bg.map(Math.round) },
      })
    }
  }
  const seenC = new Set<Element>()
  for (const { el } of texts) {
    if (seenC.has(el)) continue
    seenC.add(el)
    const s = styleOf(el)
    const { bg, unknown } = htmlBg(el)
    checkContrast(el, s.color, bg, 'html', parseFloat(s.fontSize), Number(s.fontWeight), (el.textContent ?? '').trim().slice(0, 40), unknown ? 'gradient background ignored' : undefined)
  }
  for (const svg of svgs) {
    const base = htmlBg(svg).bg
    const shapes = [...svg.querySelectorAll('rect, circle, path')].filter((x) => visible(x))
    for (const t of svg.querySelectorAll('text')) {
      if (!visible(t)) continue
      const s = styleOf(t)
      if (s.fill === 'none') continue
      const tr = R(t.getBoundingClientRect())
      const c = { x: (tr.l + tr.r) / 2, y: (tr.t + tr.b) / 2 }
      let bg = base
      let note: string | undefined
      for (const sh of shapes) {
        if (sh.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) {
          if (sh.tagName !== 'rect' && sh.tagName !== 'circle') continue
          const rr = R(sh.getBoundingClientRect())
          if (!inside(c, rr)) continue
          const ss = styleOf(sh)
          if (ss.fill === 'none') continue
          if (ss.fill.startsWith('url')) {
            note = 'hatch pattern under text'
            continue
          }
          const f = parse(ss.fill)
          if (f[3] > 0) bg = over([f[0], f[1], f[2], f[3] * Number(ss.fillOpacity || 1) * Number(ss.opacity || 1)], bg)
        }
      }
      const fo = Number(s.fillOpacity || 1)
      const fill = parse(s.fill)
      checkContrast(t, `rgba(${fill[0]},${fill[1]},${fill[2]},${fill[3] * fo})`, bg, 'svg', parseFloat(s.fontSize), Number(s.fontWeight), (t.textContent ?? '').slice(0, 40), note)
    }
  }

  // ---- page overflow ----------------------------------------------------------
  const de = document.documentElement
  if (de.scrollWidth > de.clientWidth + 1) {
    // Culprits: the deepest elements whose box (transforms included) passes the viewport's right edge.
    const cw = de.clientWidth
    const wide = [...document.body.querySelectorAll('*')].filter((x) => x.getBoundingClientRect().right + sx > cw + 1)
    const deepest = wide.filter((x) => !wide.some((y) => y !== x && x.contains(y))).slice(0, 3)
    push({
      detector: 'page-overflow',
      sig: `document <- ${deepest.map((x) => sig(x)).join(' ; ')}`,
      msg: `document scrollWidth ${de.scrollWidth} > clientWidth ${cw}; culprits: ${deepest
        .map((x) => `${sig(x)} right=${n1(x.getBoundingClientRect().right + sx)}`)
        .join(' ; ')}`,
      rects: deepest.map((x) => page(R(x.getBoundingClientRect()))),
      data: { scrollWidth: de.scrollWidth, clientWidth: cw },
    })
  }
  return out
}
