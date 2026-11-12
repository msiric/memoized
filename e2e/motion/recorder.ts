/**
 * In-page frame recorder for the VIZ-H motion audit (H0-C).
 *
 * Installed with `page.addInitScript(RECORDER)`. While recording it walks the
 * frame's subtree on every requestAnimationFrame and stores, per element and
 * only when a value changed since the previous frame:
 * - layout box relative to the frame (x, y, w, h, from getBoundingClientRect),
 * - own and effective opacity (product over ancestors), visibility,
 * - computed transform (translate part), SVG `d`, stroke dash values.
 * It also logs every Web Animation (CSS transitions, WAAPI FLIP moves,
 * framer-motion accelerated opacity) that starts on a target inside the frame,
 * with its timing, so durations and curves can be compared with spec §4.
 *
 * Elements get a stable numeric id per DOM node (a remount gets a new id), and
 * a readable label from their data attributes and text.
 */
export const RECORDER = String.raw`
(() => {
  if (window.__vizRec) return
  const ids = new WeakMap()
  let nextId = 1
  const idOf = (el) => {
    let v = ids.get(el)
    if (!v) { v = nextId++; ids.set(el, v) }
    return v
  }
  const ATTRS = ['data-glyph','data-flip-id','data-chip','data-out','data-viz-part','data-viz-region','data-link','data-row','data-choice','data-line','data-checkpoint','role','aria-label']
  const labelOf = (el) => {
    const parts = [el.tagName.toLowerCase()]
    for (const a of ATTRS) { const v = el.getAttribute && el.getAttribute(a); if (v !== null && v !== undefined) parts.push(a.replace('data-','') + '=' + String(v).slice(0, 30)) }
    const region = el.closest && el.closest('[data-viz-region]')
    if (region && region !== el) parts.push('in=' + region.getAttribute('data-viz-region'))
    const t = (el.childElementCount === 0 ? (el.textContent || '') : '').trim().slice(0, 24)
    if (t) parts.push('"' + t + '"')
    return parts.join(' ')
  }
  const translateOf = (tf) => {
    if (!tf || tf === 'none') return [0, 0, 1]
    const m = tf.match(/matrix\(([^)]+)\)/)
    if (m) { const v = m[1].split(',').map(Number); return [v[4], v[5], Math.hypot(v[0], v[1])] }
    const m3 = tf.match(/matrix3d\(([^)]+)\)/)
    if (m3) { const v = m3[1].split(',').map(Number); return [v[12], v[13], Math.hypot(v[0], v[1])] }
    return [0, 0, 1]
  }
  const r2 = (n) => Math.round(n * 100) / 100
  let state = null
  function sample() {
    if (!state) return
    const root = state.root
    const rr = root.getBoundingClientRect()
    const t = performance.now() - state.t0
    const seen = new Set()
    const rows = []
    const walk = (el, effOp, effVis) => {
      const cs = getComputedStyle(el)
      if (cs.display === 'none') return
      const op = parseFloat(cs.opacity)
      const eff = effOp * op
      const vis = effVis && cs.visibility !== 'hidden'
      const id = idOf(el)
      seen.add(id)
      const b = el.getBoundingClientRect()
      const [tx, ty, sc] = translateOf(cs.transform)
      const rec = {
        x: r2(b.left - rr.left), y: r2(b.top - rr.top), w: r2(b.width), h: r2(b.height),
        op: r2(op), eff: r2(vis ? eff : 0), tx: r2(tx), ty: r2(ty), sc: r2(sc),
      }
      if (el instanceof SVGPathElement) {
        rec.d = el.getAttribute('d')
        rec.dash = cs.strokeDasharray + '|' + cs.strokeDashoffset
        rec.pl = el.getAttribute('pathLength')
      }
      if (el.tagName === 'circle') { rec.cx = el.getAttribute('cx'); rec.cy = el.getAttribute('cy') }
      const prev = state.last.get(id)
      const key = JSON.stringify(rec)
      if (prev !== key) {
        state.last.set(id, key)
        if (!state.labels.has(id)) state.labels.set(id, labelOf(el))
        rows.push([id, rec])
      }
      for (const c of el.children) walk(c, eff, vis)
    }
    walk(root, 1, true)
    const gone = []
    for (const id of state.present) if (!seen.has(id)) gone.push(id)
    for (const id of gone) state.last.delete(id)
    state.present = seen
    // Animations that target something inside the frame.
    for (const a of document.getAnimations()) {
      const target = a.effect && a.effect.target
      if (!target || !root.contains(target)) continue
      if (state.anims.has(a)) continue
      const timing = a.effect.getComputedTiming()
      let kf = []
      try { kf = a.effect.getKeyframes() } catch (e) {}
      const first = kf[0] || {}
      const lastKf = kf[kf.length - 1] || {}
      const strip = (k) => { const o = {}; for (const p of Object.keys(k)) if (!['offset','computedOffset','easing','composite'].includes(p)) o[p] = k[p]; return o }
      state.anims.set(a, {
        t: r2(t), id: idOf(target), label: labelOf(target), kind: a.constructor.name, name: a.id || a.transitionProperty || a.animationName || '',
        duration: timing.duration, delay: timing.delay, easing: a.effect.getTiming().easing, frames: kf.length,
        from: strip(first), to: strip(lastKf),
      })
      if (!state.labels.has(idOf(target))) state.labels.set(idOf(target), labelOf(target))
    }
    state.frames.push({ t: r2(t), rows, gone })
    state.raf = requestAnimationFrame(sample)
  }
  window.__vizRec = {
    start(selector) {
      const root = document.querySelector(selector)
      if (!root) throw new Error('no root ' + selector)
      state = { root, t0: performance.now(), frames: [], last: new Map(), labels: new Map(), present: new Set(), anims: new Map(), raf: 0 }
      sample()
      return true
    },
    mark() { return state ? performance.now() - state.t0 : 0 },
    stop() {
      if (!state) return null
      cancelAnimationFrame(state.raf)
      const out = { frames: state.frames, labels: Object.fromEntries(state.labels), anims: [...state.anims.values()] }
      state = null
      return out
    },
  }
})()
`
