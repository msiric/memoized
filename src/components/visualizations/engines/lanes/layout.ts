import type { PerVariant } from '../../shell/types'
import { wrapMono } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import type { DispatchPanel, LanesData, LanesPanel, Party, SequencePanel, SetsPanel, TimelinePanel } from './model'

/**
 * Lanes geometry: pure arithmetic on the data, so the server, the tests and
 * the footprint agree. Each panel is one svg drawn 1:1 at the default text
 * size (its heading inside, mono 12 on a 20 px line), sized in rem. A panel
 * has a width per variant: a timeline or a sequence takes the stage (288
 * narrow, 606 wide); a dispatch path and a sets panel are 288, a compact
 * dispatch variant 136. Panels fill rows left to right in order (`pack`), so
 * two compact variants sit side by side on a phone and beside the full path
 * on wider screens. Every height is fixed per variant.
 */

export const STAGE: PerVariant<number> = { narrow: 288, wide: 606 }
export const GAP = { row: 24, column: 16 } as const

export const SIZE = { value: 13, small: 12, heading: 20, headingGap: 4, line: 16 } as const
export const HEAD = SIZE.heading + SIZE.headingGap
const smallW = (t: string) => Math.ceil(monoWidth(t, SIZE.small))
const valueW = (t: string) => Math.ceil(monoWidth(t, SIZE.value))

export type Variant = keyof PerVariant<number>

/** The width a panel is drawn at in a variant. */
export function panelWidth(p: LanesPanel, v: Variant): number {
  if (p.kind === 'timeline' || p.kind === 'sequence') return STAGE[v]
  if (p.kind === 'dispatch' && p.compact) return 136
  return 288
}

// --- timeline ----------------------------------------------------------------

export const TL = { x0: 8, right: 14, row: 54, label: 13, track: 32, below: 49, axis: 26, tick: 7, drop: 3, release: 5.5, run: 5 } as const

export type TimelineGeometry = { notes: string[]; width: number; height: number; x: (t: number) => number; rowTop: (i: number) => number; axisY: number; notesTop: number; bandLabel: (from: number, to: number) => string | null }

export function layoutTimeline(p: TimelinePanel, width: number): TimelineGeometry {
  const k = (width - TL.x0 - TL.right) / p.end
  const x = (t: number) => Math.round((TL.x0 + t * k) * 10) / 10
  const rowTop = (i: number) => HEAD + i * TL.row
  const axisY = rowTop(p.rows.length) + 4
  const notesTop = axisY + TL.axis
  // A closed gate is named in full where its span fits the words, else shortly.
  const bandLabel = (from: number, to: number) => {
    // Clear of the labels at either end (a run's argument, `opens`).
    const span = x(to) - x(from) - 2 * smallW('opens') - 8
    return span >= smallW('gate closed') ? 'gate closed' : span >= smallW('closed') ? 'closed' : null
  }
  for (const r of p.rows) if (smallW(r.label) > width) throw new Error(`timeline row ${r.id}: its label is wider than ${width}px`)
  const notes = p.notes.flatMap((n) => wrapMono(n, width, SIZE.small))
  return { width, height: notesTop + notes.length * SIZE.line + 4, x, rowTop, axisY, notesTop, bandLabel, notes }
}

// --- dispatch ------------------------------------------------------------------

export const DP = { pitch: 34, pill: 24, badge: 10, lanesTop: 22, targetBadge: 28, logsGap: 10 } as const

export type DispatchGeometry = {
  width: number
  height: number
  cx: number
  pillW: number
  lx: number
  rx: number
  rowY: (at: string) => number
  firstY: number
  targetY: number
  badges: { n: number; x: number; y: number }[]
  logsTop: number
  /** The cut bar: its centre and orientation. */
  cut?: { x: number; y: number; vertical: boolean }
}

export function layoutDispatch(p: DispatchPanel): DispatchGeometry {
  const width = p.compact ? 136 : 288
  const cx = width / 2
  const pillW = Math.max(...p.path.map((x) => valueW(x) + 16))
  const lx = p.compact ? DP.badge + 2 : 56
  const rx = width - lx
  if (cx - pillW / 2 < lx + DP.badge + 4) throw new Error(`dispatch ${p.id}: the path's pills crowd the lanes`)
  const top = HEAD + (p.compact ? 16 : DP.lanesTop)
  const rowY = (at: string) => {
    const i = p.path.indexOf(at)
    if (i < 0) throw new Error(`dispatch ${p.id}: ${at} is not on the path`)
    return top + i * DP.pitch + DP.pill / 2
  }
  const target = p.path[p.path.length - 1]
  const targetY = rowY(target)
  const badges = p.steps.map((s) => ({
    n: s.n,
    x: s.phase === 1 ? lx : s.phase === 3 ? rx : cx,
    y: s.phase === 2 ? targetY + DP.pill / 2 + 4 + DP.badge : rowY(s.at),
  }))
  let cut: DispatchGeometry['cut']
  if (p.cutAfter !== undefined) {
    const s = p.steps[p.cutAfter - 1]
    if (s.phase === 1) cut = { x: lx, y: rowY(s.at) + DP.pitch / 2, vertical: false }
    else if (s.phase === 2) cut = { x: cx + pillW / 2 + (rx - cx - pillW / 2) / 2, y: targetY, vertical: true }
    else cut = { x: rx, y: rowY(s.at) - DP.pitch / 2, vertical: false }
  }
  // The full path names the target phase under its badge.
  const logsTop = targetY + DP.pill / 2 + DP.targetBadge + (p.compact ? 0 : 18) + DP.logsGap
  for (const s of p.steps) if (smallW(`${s.n} ${s.log}`) > width) throw new Error(`dispatch ${p.id}: log "${s.log}" is wider than ${width}px`)
  if (smallW(p.heading) > width) throw new Error(`dispatch ${p.id}: heading wider than ${width}px`)
  return { width, height: logsTop + p.steps.length * SIZE.line + 4, cx, pillW, lx, rx, rowY, firstY: rowY(p.path[0]), targetY, badges, logsTop, cut }
}

// --- sequence ------------------------------------------------------------------

export const SQ = { header: 26, title: 15, param: 14, arrow: 10, gap: 10, holdsGap: 14 } as const

/** The parameters a message shows: the values the figure is about (the text alternative lists every one). */
export const SHOWN = ['client_id', 'state', 'code_challenge', 'code', 'code_verifier', 'client_secret', 'access_token', 'id_token'] as const

export function shownParams(params: readonly string[]): string[] {
  return params.filter((x) => (SHOWN as readonly string[]).includes(x)).map((x) => (x === 'code_challenge' && params.includes('code_challenge_method') ? 'code_challenge (S256)' : x))
}

export type SequenceGeometry = {
  width: number
  height: number
  col: Record<Party, number>
  laneW: number
  messages: { n: number; top: number; y: number; x1: number; x2: number; labelX: number; anchor: 'start' | 'end'; lines: string[] }[]
  linesTop: number
  linesBottom: number
  lifelines: Record<Party, [number, number][]>
  holds: { party: Party; y: number; lines: string[] }[]
  notes: { y: number; lines: string[] }
}

export function layoutSequence(p: SequencePanel, width: number): SequenceGeometry {
  const laneW = width / 3
  const col = Object.fromEntries(p.parties.map((x, i) => [x.id, Math.round(laneW * (i + 0.5))])) as Record<Party, number>
  let y = HEAD + SQ.header
  const linesTop = y - 4
  const messages = p.messages.map((m) => {
    const a = col[m.from]
    const b = col[m.to]
    const self = m.channel === 'self'
    // Labels start at the message's left end and may run to the panel's edge (a self step ends at its lifeline).
    const anchor: 'start' | 'end' = self ? 'end' : 'start'
    const labelX = self ? a - 8 : Math.min(a, b) + 6
    const room = self ? labelX : width - labelX
    const params = shownParams(m.params)
    const lines = [...wrapMono(`${m.n} ${m.title}`, room, SIZE.small), ...(params.length ? wrapMono(params.join(', '), room, SIZE.small) : [])]
    for (const l of lines) if (smallW(l) > room) throw new Error(`sequence: "${l}" is wider than ${room}px`)
    const top = y
    y += SQ.title + (lines.length - 1) * SQ.param + SQ.arrow + SQ.gap
    return { n: m.n, top, y: top + SQ.title + (lines.length - 1) * SQ.param + SQ.arrow - 4, x1: a, x2: b, labelX, anchor, lines }
  })
  const linesBottom = y - SQ.gap + 4
  // Lifelines break behind a label that crosses them, so no line runs through text.
  const lifelines = Object.fromEntries(
    p.parties.map((x) => {
      const cx = col[x.id]
      const cuts = messages
        .map((m) => {
          const w = Math.max(...m.lines.map(smallW))
          const [l, r] = m.anchor === 'start' ? [m.labelX, m.labelX + w] : [m.labelX - w, m.labelX]
          return l - 4 <= cx && cx <= r + 4 ? ([m.top - 2, m.top + 15 + (m.lines.length - 1) * SQ.param] as [number, number]) : null
        })
        .filter((c): c is [number, number] => c !== null)
      const segs: [number, number][] = []
      let at = linesTop
      for (const [a, b] of cuts) {
        if (a > at) segs.push([at, a])
        at = Math.max(at, b)
      }
      if (linesBottom > at) segs.push([at, linesBottom])
      return [x.id, segs]
    }),
  ) as Record<Party, [number, number][]>
  y += SQ.holdsGap
  const holds = p.parties.map((x) => {
    const lines = wrapMono(`${x.label}: ${p.holds[x.id].join(', ')}`, width, SIZE.small)
    const at = y
    y += lines.length * SIZE.line
    return { party: x.id, y: at, lines }
  })
  y += 6
  const noteLines = p.notes.flatMap((n) => wrapMono(n, width, SIZE.small))
  const notes = { y, lines: noteLines }
  y += noteLines.length * SIZE.line + 4
  if (smallW(p.heading) > width) throw new Error(`sequence: heading wider than ${width}px`)
  return { width, height: Math.ceil(y), col, laneW, messages, linesTop, linesBottom, lifelines, holds, notes }
}

// --- sets ----------------------------------------------------------------------

export const ST = { band: 56, offset: 20, overlap: 80, bracket: 34, card: 28, cardGap: 16, pair: 36, pillPad: 6 } as const

export type SetsGeometry = { width: number; height: number; top: number; notesTop: number; notes: string[] }

export function layoutSets(p: SetsPanel): SetsGeometry {
  const width = 288
  const top = HEAD + 8
  let body = 0
  if (p.mode === 'values') body = ST.band + ST.offset + 2 * ST.bracket + 6
  if (p.mode === 'members') body = ST.card * (1 + Math.max(...p.cards.map((c) => c.members.length))) + 8
  if (p.mode === 'never') body = p.pairs.length * ST.pair
  const notesTop = top + body + 4
  const notes = p.notes.flatMap((n) => wrapMono(n, width, SIZE.small))
  for (const n of p.notes) for (const l of wrapMono(n, width, SIZE.small)) if (smallW(l) > width) throw new Error(`sets ${p.id}: "${l}" too wide`)
  if (smallW(p.heading) > width) throw new Error(`sets ${p.id}: heading wider than ${width}px`)
  return { width, height: notesTop + notes.length * SIZE.line + 4, top, notesTop, notes }
}

// --- the figure ------------------------------------------------------------------

export function panelHeight(p: LanesPanel, v: Variant): number {
  if (p.kind === 'timeline') return layoutTimeline(p, STAGE[v]).height
  if (p.kind === 'dispatch') return layoutDispatch(p).height
  if (p.kind === 'sequence') return layoutSequence(p, STAGE[v]).height
  return layoutSets(p).height
}

export type Row = { panels: number[]; height: number }

/** Panels into rows, in order: a panel joins the row while the row's widths and gaps fit the stage. */
export function pack(d: LanesData, v: Variant): Row[] {
  const rows: Row[] = []
  let used = Infinity
  d.panels.forEach((p, i) => {
    const w = panelWidth(p, v)
    if (used + GAP.column + w > STAGE[v]) {
      rows.push({ panels: [], height: 0 })
      used = -GAP.column
    }
    const row = rows[rows.length - 1]
    row.panels.push(i)
    row.height = Math.max(row.height, panelHeight(p, v))
    used += GAP.column + w
  })
  return rows
}

export function layoutLanes(d: LanesData): PerVariant<number> {
  const h = (v: Variant) => {
    const rows = pack(d, v)
    return rows.reduce((s, r) => s + r.height, 0) + (rows.length - 1) * GAP.row
  }
  return { narrow: h('narrow'), wide: h('wide') }
}
