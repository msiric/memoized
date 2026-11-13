/**
 * Turns a recorder capture (recorder.ts) into per-element motion tracks and
 * defect flags for spec §4: which elements animated, from where to where, how
 * long, with what overshoot, and whether anything jumped, flickered, resized
 * or rendered twice.
 */

export type Sample = {
  x: number
  y: number
  w: number
  h: number
  op: number
  eff: number
  tx: number
  ty: number
  sc: number
  d?: string | null
  dash?: string
  pl?: string | null
  cx?: string | null
  cy?: string | null
  /** The raised opaque layer the element paints in (0: none), see recorder.ts. */
  ly?: number
  /** Text leaves (R2 GB2): the words, cut (1) or whole (0), and the line count. */
  s?: string
  ov?: number
  ln?: number
}
export type Frame = { t: number; rows: [number, Sample][]; gone: number[] }
export type Anim = {
  t: number
  id: number
  label: string
  kind: string
  name: string
  duration: number | string
  delay: number
  easing: string
  frames: number
  from: Record<string, unknown>
  to: Record<string, unknown>
}
export type Capture = {
  frames: Frame[]
  labels: Record<string, string>
  anims: Anim[]
  /** Element id -> parent id (0 for the root). */
  parents?: Record<string, number>
  /** Element id -> nearest clipping ancestor id (0 when none inside the frame). */
  clips?: Record<string, number>
  /** Ids of text leaves (no child elements, non-empty text). */
  texts?: number[]
}

export type Track = {
  id: number
  label: string
  /** Property -> sampled values over the window (forward-filled while present). */
  series: Record<string, { t: number; v: number | string }[]>
  mountedAt?: number
  removedAt?: number
  presentBefore: boolean
  presentAfter: boolean
}

export type PropMotion = {
  prop: string
  start: number | string
  end: number | string
  /** ms from the command to the first changed frame. */
  delay: number
  /** ms from the first changed frame to the last changed frame. */
  duration: number
  intermediates: number
  overshootPx?: number
  /** Largest single-frame step as a share of the whole travel (1 = all in one frame). */
  maxStepShare?: number
  monotonic: boolean
}

export type ElementMotion = {
  id: number
  label: string
  mounted: boolean
  removed: boolean
  props: PropMotion[]
}

const OWN = ['op', 'tx', 'ty', 'sc', 'w', 'h', 'd', 'dash', 'cx', 'cy'] as const
const BOX = ['x', 'y'] as const

/** Builds full per-element tracks starting from the last frame before `from` (ms since record start). */
export function tracks(cap: Capture, from = 0): Map<number, Track> {
  const state = new Map<number, Sample>()
  const out = new Map<number, Track>()
  const ensure = (id: number) => {
    let tr = out.get(id)
    if (!tr) {
      tr = { id, label: cap.labels[id] ?? String(id), series: {}, presentBefore: false, presentAfter: false }
      out.set(id, tr)
    }
    return tr
  }
  for (const f of cap.frames) {
    for (const [id, s] of f.rows) state.set(id, { ...(state.get(id) ?? {}), ...s } as Sample)
    for (const id of f.gone) {
      state.delete(id)
      if (f.t >= from) {
        const tr = out.get(id)
        if (tr && tr.removedAt === undefined) tr.removedAt = f.t - from
      }
    }
    // Frames before the command only build up the state.
    if (f.t < from) continue
    for (const [id, s] of state) {
      const tr = ensure(id)
      for (const p of [...OWN, ...BOX, 'eff'] as const) {
        const v = (s as Record<string, unknown>)[p]
        if (v === undefined) continue
        const arr = (tr.series[p] ??= [])
        arr.push({ t: f.t - from, v: v as number | string })
      }
    }
  }
  return out
}

/** State of every element at the last frame strictly before `at`. */
export function snapshot(cap: Capture, at: number): Map<number, Sample> {
  const state = new Map<number, Sample>()
  for (const f of cap.frames) {
    if (f.t >= at) break
    for (const [id, s] of f.rows) state.set(id, { ...(state.get(id) ?? {}), ...s } as Sample)
    for (const id of f.gone) state.delete(id)
  }
  return state
}

function propMotion(prop: string, base: number | string | undefined, seq: { t: number; v: number | string }[]): PropMotion | null {
  if (!seq.length) return null
  const start = base ?? seq[0].v
  const values = seq.map((s) => s.v)
  const end = values[values.length - 1]
  const changedIdx = values.findIndex((v) => v !== start)
  if (changedIdx === -1) return null
  let lastChange = changedIdx
  for (let i = changedIdx; i < values.length; i++) if (values[i] !== values[i - 1]) lastChange = i
  const distinct = new Set(values.slice(changedIdx, lastChange + 1))
  distinct.delete(end)
  distinct.delete(start)
  // Sub-pixel float noise (a fractional box measured under a transform reads
  // 62.62 for 62.63) is not an intermediate value; a real tween moves more.
  const NOISE = 0.05
  if (typeof start === 'number' && typeof end === 'number')
    for (const v of [...distinct])
      if (typeof v === 'number' && (Math.abs(v - start) <= NOISE || Math.abs(v - end) <= NOISE)) distinct.delete(v)
  const pm: PropMotion = {
    prop,
    start,
    end,
    delay: Math.round(seq[changedIdx].t),
    duration: Math.round(seq[lastChange].t - (changedIdx > 0 ? seq[changedIdx - 1].t : seq[changedIdx].t)),
    intermediates: distinct.size,
    monotonic: true,
  }
  if (typeof start === 'number' && typeof end === 'number') {
    const nums = [start, ...values.slice(changedIdx, lastChange + 1)] as number[]
    const dir = Math.sign(end - start)
    let over = 0
    let maxStep = 0
    for (let i = 1; i < nums.length; i++) {
      const step = nums[i] - nums[i - 1]
      if (dir && Math.sign(step) === -dir && Math.abs(step) > 0.01) pm.monotonic = false
      maxStep = Math.max(maxStep, Math.abs(step))
      if (dir > 0) over = Math.max(over, nums[i] - end)
      if (dir < 0) over = Math.max(over, end - nums[i])
    }
    // Non-monotonic return to the same value (a dip): record the extreme.
    if (!dir) {
      const ext = nums.reduce((m, v) => (Math.abs(v - start) > Math.abs(m - start) ? v : m), start)
      pm.end = `${end} (via ${ext})`
      pm.monotonic = false
    }
    pm.overshootPx = Math.round(over * 100) / 100
    const travel = Math.abs(end - start)
    pm.maxStepShare = travel ? Math.round((maxStep / travel) * 100) / 100 : undefined
  }
  return pm
}

/** Summarizes what moved after a command at `at` (ms since record start). */
export function motionsAfter(cap: Capture, at: number): ElementMotion[] {
  const before = snapshot(cap, at)
  const tr = tracks(cap, at)
  const out: ElementMotion[] = []
  for (const [id, t] of tr) {
    const b = before.get(id)
    const props: PropMotion[] = []
    for (const p of [...OWN, ...BOX, 'eff']) {
      const seq = t.series[p]
      if (!seq) continue
      const pm = propMotion(p, b ? ((b as Record<string, unknown>)[p] as number | string) : undefined, seq)
      if (pm) props.push(pm)
    }
    const mounted = !b
    const removed = t.removedAt !== undefined
    if (props.length || mounted || removed) out.push({ id, label: t.label, mounted, removed, props })
  }
  for (const [id] of before) {
    if (!tr.has(id)) out.push({ id, label: cap.labels[id] ?? String(id), mounted: false, removed: true, props: [] })
  }
  return out
}

export const GLYPH = /data-glyph|flip-id|out=|chip|viz-part=viz-caption|link=|state-chip|lines|aria-current|line=/

/** Spec §4 token targets (ms). */
export const TOKENS = {
  feedback: 100,
  highlight: 120,
  enter: 200,
  exit: 160,
  move: 250,
  path: 220,
  draw: 220,
  caption: 120,
  max: 300,
  hardMax: 400,
  /** D21: the one designed reveal, end to end. */
  reveal: 800,
} as const

export type Flag = { kind: string; detail: string }

/** An element of a visual's designed reveal (`data-viz-reveal`, D21). */
export const REVEAL = /\bviz-reveal=(\S+)/
const STAGE_REGION = /\bin=(stack|host|micro|tasks|console)\b/
const GLYPH_KEY = /\b(?:glyph|flip-id|chip)=(\S+)|\bout=(\d+)/

/** The stage glyph an element belongs to (`then`, `out-2`), or null for chrome. */
export function glyphKey(label: string): string | null {
  // The reveal (D21) is the one explicit exception to the budget; it is
  // asserted on its own (reveal.spec.ts).
  if (REVEAL.test(label)) return null
  if (!STAGE_REGION.test(label)) return null
  const m = label.match(GLYPH_KEY)
  if (!m) return null
  return m[1] ?? `out-${m[2]}`
}

/**
 * The vacate exit (R1M-13, H0 S-1): a glyph leaving the place a moving glyph
 * arrives at fades in place (opacity only) in at most `vacate` (100 ms) plus
 * two frames of sampling. It is outside the two-glyph budget. Full motion
 * only: under reduced motion every exit is an opacity fade, so none is exempt.
 */
const VACATE_MS = 130
export function vacates(e: ElementMotion): boolean {
  const own = e.props.filter((p) => p.intermediates > 0 && !['x', 'y', 'eff'].includes(p.prop))
  return e.removed && own.length > 0 && own.every((p) => p.prop === 'op' && p.duration <= VACATE_MS)
}

/** Distinct stage glyphs that tweened opacity or translate (spec §4 rule 1 counts these). */
export function animatedGlyphs(ms: ElementMotion[], reduced = false): string[] {
  const keys = new Set<string>()
  for (const e of ms) {
    const props = e.props.filter((p) => p.intermediates > 0 && ['op', 'tx', 'ty'].includes(p.prop))
    if (!props.length) continue
    if (!reduced && vacates(e)) continue
    const k = glyphKey(e.label)
    if (k) keys.add(k)
  }
  return [...keys].sort()
}

/**
 * Flags per spec §4 over a set of element motions:
 * - `size-tween`: a tweened size (w/h with intermediate values);
 * - `too-long`: a tween above 300 ms; a reveal part or anything inside one
 *   (D21) is held only to 800 ms here, reveal.spec.ts asserts the rest;
 * - `overshoot`: translate past its end;
 * - `scale`: any scale tween;
 * - `jump` (G2): a discontinuity inside a tween: one frame covers more than
 *   half of the whole travel of tx, ty or a stroke dash, in a tween with at
 *   least three intermediate values (a short tween sampled at 60 fps
 *   legitimately covers a third of its travel per frame);
 * - `opacity-dip`: an element that ends visible dips on the way;
 * - `glyph-count` (G2): more than `maxGlyphs` distinct stage glyphs tween
 *   (spec §4 rule 1; reveal parts and vacate exits are exempt);
 * - under reduced motion: any movement, or an opacity fade over 150 ms.
 */
export function flagsFor(ms: ElementMotion[], opts: { reduced?: boolean; maxGlyphs?: number } = {}): Flag[] {
  const flags: Flag[] = []
  for (const e of ms) {
    // An element of the designed reveal, or inside one (the rider's svg and
    // tick): the reveal is the one sequence outside these rules (D21), held
    // to 800 ms here and asserted beat by beat in reveal.spec.ts.
    if (/\bwithin-reveal=/.test(e.label) || REVEAL.test(e.label)) {
      for (const p of e.props)
        if (p.intermediates > 0 && ['op', 'tx', 'ty', 'd', 'dash', 'sc'].includes(p.prop) && p.duration > TOKENS.reveal)
          flags.push({ kind: 'too-long', detail: `${e.label}: ${p.prop} ${p.duration}ms` })
      continue
    }
    for (const p of e.props) {
      const tweened = p.intermediates > 0
      if ((p.prop === 'w' || p.prop === 'h') && tweened)
        flags.push({ kind: 'size-tween', detail: `${e.label}: ${p.prop} ${p.start}->${p.end} over ${p.duration}ms` })
      if (['op', 'tx', 'ty', 'd', 'dash', 'sc'].includes(p.prop) && tweened) {
        if (p.duration > TOKENS.max)
          flags.push({ kind: 'too-long', detail: `${e.label}: ${p.prop} ${p.duration}ms` })
        if ((p.prop === 'tx' || p.prop === 'ty') && (p.overshootPx ?? 0) > 0.5)
          flags.push({ kind: 'overshoot', detail: `${e.label}: ${p.prop} overshoot ${p.overshootPx}px` })
        if (['tx', 'ty', 'd', 'dash'].includes(p.prop) && p.intermediates >= 3 && (p.maxStepShare ?? 0) > 0.5)
          flags.push({ kind: 'jump', detail: `${e.label}: ${p.prop} ${p.start}->${p.end}, one frame covers ${Math.round((p.maxStepShare ?? 0) * 100)}% of it` })
        if (p.prop === 'sc') flags.push({ kind: 'scale', detail: `${e.label}: scale ${p.start}->${p.end}` })
        if (opts.reduced && p.prop !== 'op')
          flags.push({ kind: 'reduced-motion-move', detail: `${e.label}: ${p.prop} ${p.start}->${p.end} ${p.duration}ms` })
        // Reduced enter and exit are 120 ms; frame sampling adds up to two frames.
        if (opts.reduced && p.prop === 'op' && p.duration > 150)
          flags.push({ kind: 'reduced-motion-long', detail: `${e.label}: opacity ${p.duration}ms` })
      }
      if (p.prop === 'eff' && !p.monotonic && !e.removed)
        flags.push({ kind: 'opacity-dip', detail: `${e.label}: eff ${p.start}->${p.end}` })
    }
  }
  const glyphs = animatedGlyphs(ms, opts.reduced)
  const max = opts.maxGlyphs ?? 2
  if (glyphs.length > max) flags.push({ kind: 'glyph-count', detail: `${glyphs.length} stage glyphs tween: ${glyphs.join(', ')}` })
  return flags
}

// ---------------------------------------------------------------------------
// G1: overlap and legibility during motion.
// ---------------------------------------------------------------------------

export type Overlap = { t: number; moving: string; over: string; area: number; covers?: boolean }

type Box = { l: number; t: number; r: number; b: number }
const boxOf = (s: Sample): Box => ({ l: s.x, t: s.y, r: s.x + s.w, b: s.y + s.h })
const clipTo = (a: Box, c: Box): Box | null => {
  const r = { l: Math.max(a.l, c.l), t: Math.max(a.t, c.t), r: Math.min(a.r, c.r), b: Math.min(a.b, c.b) }
  return r.r > r.l && r.b > r.t ? r : null
}

/**
 * Text that a moving or fading element prints over or covers (G1, R1M-01,
 * R1M-03, R1M-08; R2 GB1). For each frame from `from` (ms since record
 * start): every element whose position, transform or opacity changed in that
 * frame, with an effective opacity above 0.1, that is a text leaf or a glyph
 * without text (the list-keys rider, a chip, a stage glyph, the scrubber
 * tooltip), against every other visible text leaf. Two boxes that intersect
 * by more than `minArea` px² are an overlap, unless one is the other's
 * ancestor. When the moving element paints in a raised opaque layer (a
 * lifted glyph on its backing, D6, or the scrubber tooltip, D12) and the
 * text does not, it hides that text: a `covers` entry, allowed only for a
 * lifted stage glyph passing over a lane's own text (`COVER_OK`). Text that
 * a moving element passes under (the text is in the raised layer) is not
 * overprinted. Boxes are cut to their nearest clipping ancestor first, so a
 * code row scrolled out of its window or a truncated label's hidden tail
 * never counts. One entry per pair, at its first frame.
 */
/** A glyph without text that moves or fades (R2 GB1): its box is tested against text too. */
const MOVING_GLYPH = /viz-reveal=rider|\bchip=|\bglyph=|flip-id=|scrubber-tooltip/
/**
 * The only covering allowed (R2 GB1): a lifted stage glyph on its opaque
 * backing (D6), or its label, passing over a lane's own text on its way to
 * another lane. Anything else that covers text (the scrubber tooltip over
 * the dock, the list-keys rider over a row) is a finding.
 */
const LANE = /\bin=(stack|host|micro|tasks|console)\b/
const COVER_OK: [RegExp, RegExp][] = [[LANE, LANE]]

export function overlapsDuring(cap: Capture, from = 0, minArea = 4): Overlap[] {
  const parents = cap.parents ?? {}
  const clips = cap.clips ?? {}
  const texts = new Set(cap.texts ?? [])
  const state = new Map<number, Sample>()
  const ancestors = (id: number) => {
    const out = new Set<number>()
    for (let p = parents[id]; p; p = parents[p]) out.add(p)
    return out
  }
  const visibleBox = (id: number): Box | null => {
    const s = state.get(id)
    if (!s || s.eff <= 0.1 || s.w * s.h <= 0) return null
    let b: Box | null = boxOf(s)
    for (let c = clips[id]; c && b; c = clips[c]) {
      const cs = state.get(c)
      if (!cs) break
      b = clipTo(b, boxOf(cs))
    }
    return b
  }
  const MOVE = ['x', 'y', 'tx', 'ty', 'op', 'eff'] as const
  const seen = new Set<string>()
  const out: Overlap[] = []
  for (const f of cap.frames) {
    const changed: number[] = []
    for (const [id, s] of f.rows) {
      const prev = state.get(id)
      if (prev && MOVE.some((k) => prev[k] !== s[k])) changed.push(id)
      state.set(id, { ...(prev ?? {}), ...s } as Sample)
    }
    for (const id of f.gone) state.delete(id)
    if (f.t < from) continue
    const visible = [...texts].map((id) => [id, visibleBox(id)] as const).filter((x): x is readonly [number, Box] => !!x[1])
    for (const a of changed) {
      if (!texts.has(a) && !MOVING_GLYPH.test(cap.labels[a] ?? '')) continue
      const ab = visibleBox(a)
      if (!ab) continue
      const up = ancestors(a)
      const la = state.get(a)?.ly ?? 0
      for (const [b, bb] of visible) {
        if (b === a || up.has(b) || ancestors(b).has(a)) continue
        const lb = state.get(b)?.ly ?? 0
        // The text sits in a raised opaque layer the moving element is not in: it passes under it.
        if (la !== lb && la === 0) continue
        // The moving element's raised layer hides the text under it.
        const covers = la !== lb
        const i = clipTo(ab, bb)
        if (!i) continue
        const area = (i.r - i.l) * (i.b - i.t)
        if (area <= minArea) continue
        const moving = cap.labels[a] ?? String(a)
        const over = cap.labels[b] ?? String(b)
        if (covers && COVER_OK.some(([m, o]) => m.test(moving) && o.test(over))) continue
        const key = [a, b].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ t: Math.round(f.t - from), moving, over, area: Math.round(area), covers })
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// R2 GB2: text integrity during motion.
// ---------------------------------------------------------------------------

export type Integrity = { t: number; label: string; what: string }

/**
 * A text leaf that is cut (ellipsis or line clamp) or takes a different
 * number of lines while it moves, enters or leaves, compared with its own
 * rest: the state it was first seen in (before the action, or as it entered)
 * and the state it ends in. A leaf whose words change starts a new rest (a
 * counter, a label that swaps). Only while visible (effective opacity above
 * 0.1), from `from`. One entry per leaf and kind.
 */
export function integrityDuring(cap: Capture, from = 0): Integrity[] {
  const texts = new Set(cap.texts ?? [])
  const state = new Map<number, Sample>()
  const rest = new Map<number, Sample>()
  const last = new Map<number, Sample>()
  // The end state of every leaf still on screen at the end.
  for (const f of cap.frames) {
    for (const [id, s] of f.rows) if (texts.has(id)) last.set(id, { ...(last.get(id) ?? {}), ...s } as Sample)
    for (const id of f.gone) last.delete(id)
  }
  const out: Integrity[] = []
  const seen = new Set<string>()
  for (const f of cap.frames) {
    for (const [id, s] of f.rows) {
      if (!texts.has(id)) continue
      const cur = { ...(state.get(id) ?? {}), ...s } as Sample
      state.set(id, cur)
      if (cur.s === undefined) continue
      const r = rest.get(id)
      if (!r || r.s !== cur.s) {
        rest.set(id, cur)
        continue
      }
      if (f.t < from || cur.eff <= 0.1) continue
      const end = last.get(id)
      const push = (what: string) => {
        const key = `${id}|${what}`
        if (seen.has(key)) return
        seen.add(key)
        out.push({ t: Math.round(f.t - from), label: cap.labels[id] ?? String(id), what })
      }
      if (cur.ov && (!r.ov || (end && end.s === cur.s && !end.ov))) push('is cut (ellipsis or clamp) while it moves')
      if (cur.ln !== undefined && r.ln !== undefined && cur.ln !== r.ln && (!end || end.s !== cur.s || end.ln !== cur.ln))
        push(`rewraps from ${r.ln} to ${cur.ln} lines while it moves`)
    }
    for (const id of f.gone) state.delete(id)
  }
  return out
}
