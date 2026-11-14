import type { Page } from '@playwright/test'

/**
 * The computed-style contrast crawl (VIZ-H G, R1 L05): every text and
 * non-text pair that actually renders inside a visualization frame, measured
 * from computed styles with real alpha compositing, so a stripped fill or a
 * new state that the token table never listed cannot slip through.
 *
 * Text (WCAG 1.4.3): every visible text node, HTML and SVG, against the
 * composited background under it: 4.5:1, 3:1 for large text.
 *
 * Non-text (WCAG 1.4.11), 3:1 against what is under it. A pair is
 * non-text UI when it identifies a component or carries state:
 * - focus indicators (an outline drawn on a focused or forced-focus element);
 * - state marks: chips (`data-chip`), checkboxes (`data-lk-check`), the
 *   scrubber's thumb, ticks, progress and diamonds, the code pane's current
 *   line bar, the list-keys state chip;
 * - connectors and glyph outlines in SVG figures (`data-edge`, `data-link`,
 *   `data-node` outlines, arrowheads, end dots) and icons inside controls.
 * Decorative edges that identify nothing (the frame ring, panel and divider
 * hairlines) are not UI pairs under 1.4.11 and are not collected.
 *
 * The only exemption: anything inside `[aria-disabled="true"]` or
 * `[disabled]` (WCAG 1.4.3 and 1.4.11 exclude inactive components). Exempt
 * pairs are still returned, flagged, so the report lists them.
 *
 * Every text color is also checked against the token palette (`palette`,
 * resolved from tokens-v3's text pairs): an off-token color fails even when
 * its contrast passes. Code tokens (github-dark and their print twins) are
 * the platform's syntax colors and are passed in as allowed.
 */

export type Pair = {
  kind: 'text' | 'non-text' | 'palette'
  what: string
  text: string
  fg: string
  bg: string
  ratio: number
  need: number
  exempt: boolean
  /** The element's effective opacity (a dimmed element reads below 1). */
  alpha: number
  rect: [number, number, number, number]
}

export type AuditInput = {
  scope: string
  palette: string[]
  codeColors: string[]
  /** Collect focus rings (false under print: paper has no focus). */
  focus?: boolean
}

export async function auditContrast(page: Page, input: AuditInput): Promise<Pair[]> {
  return page.evaluate(crawl, input)
}

function crawl({ scope, palette, codeColors, focus = true }: AuditInput): Pair[] {
  type RGBA = [number, number, number, number]
  type RGB = [number, number, number]
  const out: Pair[] = []
  const MARKS = [
    '[data-chip]',
    '[data-lk-check] input',
    '[data-check]',
    '[data-viz-part="scrubber-thumb"]',
    '[data-viz-part="scrubber-rail"] > *',
    '[data-viz-part="state-chip"]',
    '[data-viz-region="code"] li[aria-current] > span:first-child',
    '[data-viz-region="code"] li[data-traced] > span:first-child',
  ].join(',')
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
  const parse = (c: string): RGBA => {
    const m = c.match(/^rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\)$/)
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
      return [+m[1], +m[2], +m[3], a]
    }
    if (!c || c === 'none' || c === 'transparent') return [0, 0, 0, 0]
    // color-mix(), oklab() and friends: let the canvas resolve them.
    cv.clearRect(0, 0, 1, 1)
    cv.fillStyle = 'rgba(0,0,0,0)'
    cv.fillStyle = c
    cv.fillRect(0, 0, 1, 1)
    const d = cv.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  const over = (top: RGBA, under: RGB): RGB => [
    top[0] * top[3] + under[0] * (1 - top[3]),
    top[1] * top[3] + under[1] * (1 - top[3]),
    top[2] * top[3] + under[2] * (1 - top[3]),
  ]
  const lum = ([r, g, b]: RGB) => {
    const f = (v: number) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a: RGB, b: RGB) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }
  const hex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  const cs = (el: Element) => getComputedStyle(el)
  const opacityChain = (el: Element | null) => {
    let o = 1
    for (let e = el; e; e = e.parentElement) o *= Number(cs(e).opacity || 1)
    return o
  }
  const visible = (el: Element) => {
    if (!(el as HTMLElement).getClientRects?.().length && !(el instanceof SVGElement)) return false
    const s = cs(el)
    if (s.visibility !== 'visible' || s.display === 'none') return false
    if (opacityChain(el) < 0.05) return false
    const r = el.getBoundingClientRect()
    if (r.width < 1 && r.height < 1) return false
    for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) {
      const t = cs(e)
      if (t.display === 'none') return false
      if (t.clip === 'rect(0px, 0px, 0px, 0px)' || t.clipPath === 'inset(50%)') return false
      if (e.tagName === 'DETAILS' && !(e as HTMLDetailsElement).open && el !== e && !el.closest('summary')) return false
      if (/^(defs|pattern|mask|clipPath|marker)$/i.test(e.tagName)) return false
    }
    return true
  }
  /** The opaque color under an element: its ancestors' backgrounds composited bottom up. */
  const backdrop = (el: Element): RGB => {
    const chain: Element[] = []
    for (let e: Element | null = el; e; e = e.parentElement) chain.push(e)
    let bg: RGB = [255, 255, 255]
    for (const e of chain.reverse()) {
      const s = cs(e)
      const c = parse(s.backgroundColor)
      if (c[3] > 0) bg = over([c[0], c[1], c[2], c[3] * Number(s.opacity || 1)], bg)
    }
    return bg
  }
  /** The product of `brightness()` filters on the element and its ancestors (a pressed control). */
  const brightness = (el: Element) => {
    let k = 1
    for (let e: Element | null = el; e; e = e.parentElement)
      for (const m of cs(e).filter.matchAll(/brightness\(([\d.]+)\)/g)) k *= Number(m[1])
    return k
  }
  const dim = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k]
  /**
   * The opaque color painted under an element's centre, from the hit-test
   * stack (so an overlay sibling, such as the checked box under its tick,
   * counts), composited bottom up. Everything above the element is ignored.
   */
  const backdropAt = (el: Element): RGB => {
    let r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) {
      el.scrollIntoView({ block: 'center', inline: 'center' })
      r = el.getBoundingClientRect()
    }
    const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    const at = stack.findIndex((x) => x === el || x.contains(el))
    // A ground holds the whole mark (the checked box under its tick). A thin
    // mark it crosses (the track under a tick, the progress under a diamond)
    // does not, and the rail's lines are never a ground (the thumb is, for
    // the diamond it carries).
    const holds = (x: Element) => {
      const q = x.getBoundingClientRect()
      return q.left <= r.left + 0.5 && q.top <= r.top + 0.5 && q.right >= r.right - 0.5 && q.bottom >= r.bottom - 0.5
    }
    const below = stack
      .slice(at < 0 ? 0 : at)
      .filter((x) => x !== el && !el.contains(x) && !x.closest('[data-viz-part="scrubber-rail"] > :not([data-viz-part="scrubber-thumb"])') && holds(x))
    let bg: RGB = [255, 255, 255]
    for (const x of below.reverse()) {
      const s = cs(x)
      const paint = x instanceof SVGElement ? (/^(rect|circle|ellipse)$/.test(x.tagName) && !s.fill.startsWith('url') ? s.fill : 'none') : s.backgroundColor
      const c = parse(paint)
      if (c[3] > 0) bg = over([c[0], c[1], c[2], c[3] * (x instanceof SVGElement ? Number(s.fillOpacity || 1) : 1) * opacityChain(x)], bg)
    }
    return bg
  }
  const exemptOf = (el: Element) => Boolean(el.closest('[aria-disabled="true"],[disabled]'))
  const page = (r: DOMRect): [number, number, number, number] => [
    Math.round(r.left + scrollX),
    Math.round(r.top + scrollY),
    Math.round(r.width),
    Math.round(r.height),
  ]
  const label = (el: Element) => {
    const attrs = ['data-viz-part', 'data-chip', 'data-edge', 'data-link', 'data-node', 'data-checkpoint', 'data-specimen', 'aria-label']
    const parts: string[] = []
    for (let e: Element | null = el; e && parts.length < 3; e = e.parentElement) {
      const a = attrs.find((k) => e!.hasAttribute(k))
      if (a) parts.unshift(`[${a}=${(e.getAttribute(a) ?? '').slice(0, 24)}]`)
      if (e.hasAttribute('data-viz') || e.hasAttribute('data-viz-frame')) {
        parts.unshift(`${e.getAttribute('data-viz') ?? e.getAttribute('data-viz-frame')}`)
        break
      }
    }
    return `${parts.join(' ')} ${el.tagName.toLowerCase()}`.trim()
  }
  const seen = new Set<string>()
  const push = (p: Pair) => {
    const key = `${p.kind}|${p.what}|${p.text}|${p.fg}|${p.bg}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(p)
  }
  const near = (a: RGB, list: string[]) =>
    list.some((h) => {
      const b = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) <= 3
    })

  // Hit-testing must see every painted layer, including pointer-events: none ones.
  const pe = document.createElement('style')
  pe.textContent = '* { pointer-events: auto !important; }'
  document.head.appendChild(pe)
  const roots = [...document.querySelectorAll(scope)]
  for (const root of roots) {
    // ---- text, HTML ----
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const done = new Set<Element>()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || done.has(el) || !(n.textContent ?? '').trim()) continue
      if (el.closest('svg,script,style,noscript,option')) continue
      done.add(el)
      if (!visible(el)) continue
      const s = cs(el)
      const fgc = parse(s.color)
      const k = brightness(el)
      const bg = dim(backdrop(el), k)
      const fg = dim(over([fgc[0], fgc[1], fgc[2], fgc[3] * opacityChain(el)], backdrop(el)), k)
      const size = parseFloat(s.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
      const text = (el.textContent ?? '').trim().slice(0, 40)
      push({ kind: 'text', what: label(el), text, fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: large ? 3 : 4.5, exempt: exemptOf(el), alpha: opacityChain(el), rect: page(el.getBoundingClientRect()) })
      const own: RGB = [fgc[0], fgc[1], fgc[2]]
      const isCode = Boolean(el.closest('[data-viz-region="code"] code'))
      if (!near(own, palette) && !(isCode && near(own, codeColors)))
        push({ kind: 'palette', what: label(el), text, fg: hex(own), bg: hex(bg), ratio: 0, need: 0, exempt: false, alpha: 1, rect: page(el.getBoundingClientRect()) })
    }

    // ---- SVG: text, connectors, outlines, marks ----
    for (const svg of root.querySelectorAll('svg')) {
      if (!visible(svg)) continue
      const base = backdrop(svg)
      const shapes = [...svg.querySelectorAll('rect, circle, path, line, polyline, polygon, ellipse')].filter((x) => visible(x))
      const under = (el: Element): RGB => {
        const r = el.getBoundingClientRect()
        const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        let bg = base
        for (const sh of shapes) {
          if (sh === el || sh.contains(el) || el.contains(sh)) continue
          if (!(sh.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
          const rr = sh.getBoundingClientRect()
          if (c.x < rr.left || c.x > rr.right || c.y < rr.top || c.y > rr.bottom) continue
          if (sh.tagName !== 'rect' && sh.tagName !== 'circle') continue
          const ss = cs(sh)
          if (ss.fill === 'none' || ss.fill.startsWith('url')) continue
          const f = parse(ss.fill)
          if (f[3] > 0) bg = over([f[0], f[1], f[2], f[3] * Number(ss.fillOpacity || 1) * opacityChain(sh)], bg)
        }
        return bg
      }
      for (const t of svg.querySelectorAll('text')) {
        if (!visible(t)) continue
        const s = cs(t)
        if (s.fill === 'none') continue
        const f = parse(s.fill)
        const bg = under(t)
        const fg = over([f[0], f[1], f[2], f[3] * Number(s.fillOpacity || 1) * opacityChain(t)], bg)
        const size = parseFloat(s.fontSize)
        push({ kind: 'text', what: label(t), text: (t.textContent ?? '').slice(0, 40), fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: size >= 24 ? 3 : 4.5, exempt: exemptOf(t), alpha: opacityChain(t), rect: page(t.getBoundingClientRect()) })
      }
      const ui = (el: Element) =>
        Boolean(
          el.closest('[data-edge],[data-link],[data-node],[data-diamond],[data-check],[data-lk-check]') ||
            el.closest('button,[role="radio"],[role="slider"],summary,label,select') ||
            el.matches('.vz-ah, .vz-fb, .vz-e'),
        )
      for (const sh of shapes) {
        if (!ui(sh) || sh.closest('text')) continue
        const s = cs(sh)
        // A record's header divider (`vz-hl`) and a touch band (`vz-hit`) are not marks.
        if (sh.matches('.vz-hl, .vz-hit')) continue
        const stroke = parse(s.stroke)
        const sw = parseFloat(s.strokeWidth)
        const bg = backdropAt(sh)
        const r = sh.getBoundingClientRect()
        if (stroke[3] > 0 && sw > 0) {
          const fg = over([stroke[0], stroke[1], stroke[2], stroke[3] * Number(s.strokeOpacity || 1) * opacityChain(sh)], bg)
          push({ kind: 'non-text', what: `${label(sh)} stroke`, text: '', fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: 3, exempt: exemptOf(sh), alpha: opacityChain(sh), rect: page(r) })
        } else {
          const fill = parse(s.fill)
          // A filled mark (arrowhead, end dot, check, diamond): small solid shapes only; large fills are surfaces.
          if (fill[3] > 0 && r.width <= 24 && r.height <= 24) {
            const fg = over([fill[0], fill[1], fill[2], fill[3] * Number(s.fillOpacity || 1) * opacityChain(sh)], bg)
            push({ kind: 'non-text', what: `${label(sh)} fill`, text: '', fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: 3, exempt: exemptOf(sh), alpha: opacityChain(sh), rect: page(r) })
          }
        }
      }
    }

    // ---- HTML state marks and focus indicators ----
    for (const el of root.querySelectorAll(MARKS)) {
      if (!visible(el)) continue
      const s = cs(el)
      const bg = backdropAt(el)
      const border = parse(s.borderTopColor)
      const fill = parse(s.backgroundColor)
      const r = el.getBoundingClientRect()
      // The mark's identifying paint: its edge when it has one, else its fill.
      const paint = parseFloat(s.borderTopWidth) > 0 && border[3] > 0 ? border : fill
      if (paint[3] === 0) continue
      const own = backdrop(el)
      // A filled mark is judged against what is under it; an outlined one against its own ground too.
      const under = paint === border ? own : bg
      const fg = over([paint[0], paint[1], paint[2], paint[3] * opacityChain(el)], under)
      if (paint === border && fill[3] > 0.5) {
        // An edge on a fill that already contrasts (a filled chip) needs only the fill.
        const ff = over([fill[0], fill[1], fill[2], fill[3]], bg)
        if (ratio(ff, bg) >= 3) continue
      }
      push({ kind: 'non-text', what: `${label(el)} ${paint === border ? 'edge' : 'fill'}`, text: '', fg: hex(fg), bg: hex(under), ratio: ratio(fg, under), need: 3, exempt: exemptOf(el), alpha: opacityChain(el), rect: page(r) })
    }
    for (const el of focus ? root.querySelectorAll('*') : []) {
      const s = cs(el)
      if (s.outlineStyle === 'none' || parseFloat(s.outlineWidth) <= 0) continue
      const o = parse(s.outlineColor)
      if (o[3] === 0 || !visible(el)) continue
      const bg = backdrop(el.parentElement ?? el)
      const fg = over(o, bg)
      push({ kind: 'non-text', what: `${label(el)} focus ring`, text: '', fg: hex(fg), bg: hex(bg), ratio: ratio(fg, bg), need: 3, exempt: exemptOf(el), alpha: opacityChain(el), rect: page(el.getBoundingClientRect()) })
    }
  }
  pe.remove()
  return out
}
