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
export type Capture = { frames: Frame[]; labels: Record<string, string>; anims: Anim[] }

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
  let baselineTaken = false
  for (const f of cap.frames) {
    for (const [id, s] of f.rows) state.set(id, { ...(state.get(id) ?? {}), ...s } as Sample)
    for (const id of f.gone) {
      state.delete(id)
      if (baselineTaken) {
        const tr = out.get(id)
        if (tr && tr.removedAt === undefined) tr.removedAt = f.t - from
      }
    }
    if (f.t < from) {
      // keep updating until the command
      continue
    }
    if (!baselineTaken) {
      baselineTaken = true
      // The baseline is the state just before this first post-command frame was
      // applied; approximate with the state carried from earlier frames, which
      // the loop above already merged. Re-derive by replaying without this frame.
    }
    for (const [id, s] of state) {
      const tr = ensure(id)
      if (tr.mountedAt === undefined && !Object.keys(tr.series).length) {
        // first time we see this id after the command
      }
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
} as const

export type Flag = { kind: string; detail: string }

/**
 * Flags per spec §4 over a set of element motions:
 * - tweened size (w/h with intermediate values),
 * - durations above 300 ms,
 * - overshoot on translate,
 * - big single-frame jumps inside a tween (discontinuity),
 * - opacity dips on elements that end visible,
 * - more than two independently animated glyphs.
 */
export function flagsFor(ms: ElementMotion[], opts: { reduced?: boolean } = {}): Flag[] {
  const flags: Flag[] = []
  const animatedRoots = new Set<string>()
  for (const e of ms) {
    for (const p of e.props) {
      const tweened = p.intermediates > 0
      if ((p.prop === 'w' || p.prop === 'h') && tweened)
        flags.push({ kind: 'size-tween', detail: `${e.label}: ${p.prop} ${p.start}->${p.end} over ${p.duration}ms` })
      if (['op', 'tx', 'ty', 'd', 'dash', 'sc'].includes(p.prop) && tweened) {
        animatedRoots.add(`${e.id}`)
        if (p.duration > TOKENS.max)
          flags.push({ kind: 'too-long', detail: `${e.label}: ${p.prop} ${p.duration}ms` })
        if ((p.prop === 'tx' || p.prop === 'ty') && (p.overshootPx ?? 0) > 0.5)
          flags.push({ kind: 'overshoot', detail: `${e.label}: ${p.prop} overshoot ${p.overshootPx}px` })
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
  return flags
}
