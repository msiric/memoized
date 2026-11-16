import type { PerVariant } from '../../shell/types'
import { arrowHead, routePath, textWidth, type Point, type Rect } from '../../substrates/box-arrow'
import { SIZE } from './layout'
import { besideOf, spineOf, type ProtoDiagram, type ProtoObject, type ProtoPanel } from './proto-model'

/**
 * Layout for the prototype object graph: the heap graph's boxes and rows
 * (`SIZE`), arranged as a chain. The spine (an instance and the objects its
 * [[Prototype]] links reach, then `null`) is one column on the left; each
 * constructor function is a pill in the column to its right, level with the
 * object its `.prototype` names, so the `.constructor` row runs straight
 * across to it and the `.prototype` arrow hooks back over the pill into that
 * object's header. Every panel of a figure shares the columns, so panels set
 * side by side (wide) or stacked (narrow) line up; a panel is drawn 1:1 at
 * the default text size in one svg of `width` units, so its height is fixed
 * for every width of a variant.
 */

export const PROTO = {
  /** The panel heading's line (in the svg, so it scales with the drawing). */
  heading: 20,
  headingGap: 8,
  /** Between spine boxes: room for the [[Prototype]] label beside the link. */
  vgap: 36,
  /** A constructor pill (the closures function object's height). */
  pill: 32,
  pillPad: 8,
  /** Where a pill stands below its prototype object's top when no row places it. */
  pillDrop: 26,
  /** Between the spine and the function column. */
  gap: 40,
  /** The hook's lane right of the function column, and the room its stroke needs. */
  lane: 12,
  laneRoom: 6,
  /** The `null` terminal. */
  nullW: 44,
  nullH: 24,
  resultGap: 12,
  line: 20,
  /** Panels side by side (wide): two to a row, this far apart; stacked: this far apart. */
  columnGap: 24,
  panelGap: 32,
  /** A panel's widest drawing: two fit the 606 px wide stage side by side. */
  maxWidth: 280,
} as const

const headerH = 2 * SIZE.headerPad + SIZE.headerLine

export type ProtoRowScene = {
  key: string
  /** The value cell's text, null for a dot (an arrow starts there). */
  value: string | null
  top: number
  keyWidth: number
  changed?: boolean
  /** A muted line across the row: `+11 more`, `12 properties`, `no own properties`. */
  muted?: string
}

export type ProtoBoxScene = { id: string; fn: boolean; title: string; rect: Rect; rows: ProtoRowScene[] }

export type ProtoEdgeScene = {
  id: string
  kind: 'proto' | 'prototype' | 'constructor'
  from: string
  to: string
  d: string
  head: string
  /** A property's arrow starts at a dot (the [[Prototype]] link has none). */
  dot?: Point
  label?: { text: string; x: number; y: number; anchor: 'start' | 'middle' }
  changed?: boolean
}

export type ProtoPanelScene = {
  id: string
  width: number
  height: number
  boxes: ProtoBoxScene[]
  edges: ProtoEdgeScene[]
  nullRect: Rect
  results: { expr: string; text: string; y: number; textX: number }[]
  note?: { text: string; y: number }
}

const LABEL_SIZE = 12
const mutedLine = (o: ProtoObject) =>
  o.rows.length ? (o.hidden ? `+${o.hidden} more` : null) : o.hidden ? `${o.hidden} properties` : 'no own properties'

const valueText = (v: ProtoObject['rows'][number]['value']) => ('ref' in v ? null : 'fn' in v ? 'ƒ' : v.text)

function keyWidth(o: ProtoObject) {
  return Math.ceil(Math.max(0, ...o.rows.map((r) => textWidth(r.key, SIZE.value))) + 2 * SIZE.cellPad)
}

function boxWidth(o: ProtoObject): number {
  const header = textWidth(o.title, SIZE.header) + 2 * SIZE.cellPad
  const value = Math.max(12, ...o.rows.map((r) => (valueText(r.value) === null ? 2 * SIZE.dot + 8 : textWidth(valueText(r.value)!, SIZE.value)))) + 2 * SIZE.cellPad
  const muted = mutedLine(o)
  return Math.ceil(Math.max(header, o.rows.length ? keyWidth(o) + value : 0, muted ? textWidth(muted, LABEL_SIZE) + 2 * SIZE.cellPad : 0, 56))
}

const pillWidth = (o: ProtoObject) => Math.ceil(textWidth(`ƒ ${o.title}`, SIZE.value) + 2 * PROTO.pillPad)
const boxHeight = (o: ProtoObject) => headerH + Math.max(1, o.rows.length + (o.rows.length && o.hidden ? 1 : 0)) * SIZE.row

/** The columns every panel of the figure shares. */
export function protoColumns(d: ProtoDiagram) {
  const spine = Math.max(...d.panels.flatMap((p) => spineOf(p).map(boxWidth)))
  const fns = d.panels.flatMap((p) => p.objects.filter((o) => o.fn))
  const fn = fns.length ? Math.max(...fns.map(pillWidth)) : 0
  const label = textWidth('[[Prototype]]', LABEL_SIZE)
  const width = fn ? spine + PROTO.gap + fn + PROTO.lane + PROTO.laneRoom : Math.ceil(spine / 2 + 8 + label)
  const w = Math.max(width, spine, ...d.panels.map((p) => resultsWidth(p)), Math.ceil(spine / 2 + 8 + label))
  if (w > PROTO.maxWidth) throw new Error(`the prototype graph needs ${w}px, more than ${PROTO.maxWidth}px`)
  return { spine, fn, fnX: spine + PROTO.gap, width: w }
}

const resultsWidth = (p: ProtoPanel) =>
  Math.ceil(
    Math.max(
      textWidth(p.heading, LABEL_SIZE),
      ...p.results.map((r) => textWidth(`${r.expr} › ${r.text}`, SIZE.value)),
      p.note ? textWidth(p.note, LABEL_SIZE) : 0,
    ),
  )

export function layoutProtoPanel(p: ProtoPanel, cols: ReturnType<typeof protoColumns>): ProtoPanelScene {
  const spine = spineOf(p)
  const lookup = p.lookup
  const boxes: ProtoBoxScene[] = []
  const edges: ProtoEdgeScene[] = []
  let y = PROTO.heading + PROTO.headingGap
  const rectOf = new Map<string, Rect>()
  for (const o of spine) {
    const rect = { x: 0, y, w: cols.spine, h: boxHeight(o) }
    rectOf.set(o.id, rect)
    const kw = keyWidth(o)
    const rows: ProtoRowScene[] = o.rows.map((r, k) => ({
      key: r.key,
      value: valueText(r.value),
      top: y + headerH + k * SIZE.row,
      keyWidth: kw,
      changed: lookup?.found === o.id && lookup.key === r.key ? true : undefined,
    }))
    const muted = mutedLine(o)
    if (muted) rows.push({ key: '', value: null, top: y + headerH + o.rows.length * SIZE.row, keyWidth: kw, muted })
    boxes.push({ id: o.id, fn: false, title: o.title, rect, rows })
    y += rect.h + PROTO.vgap
  }
  const cx = Math.round(cols.spine / 2)
  const nullRect = { x: cx - PROTO.nullW / 2, y, w: PROTO.nullW, h: PROTO.nullH }
  const hops = new Set((lookup?.visited ?? []).slice(1).map((id, i) => `${lookup!.visited[i]}>${id}`))
  // [[Prototype]] links down the spine, labelled beside the link.
  spine.forEach((o, i) => {
    const a = rectOf.get(o.id)!
    const to = i + 1 < spine.length ? spine[i + 1].id : 'null'
    const bTop = i + 1 < spine.length ? rectOf.get(to)!.y : nullRect.y
    const pts = [
      { x: cx, y: a.y + a.h },
      { x: cx, y: bTop },
    ]
    edges.push({
      id: `proto:${o.id}`,
      kind: 'proto',
      from: o.id,
      to,
      d: routePath(pts, 8, 2),
      head: arrowHead(pts),
      label: { text: '[[Prototype]]', x: cx + 8, y: Math.round((a.y + a.h + bTop) / 2 + 4), anchor: 'start' },
      changed: hops.has(`${o.id}>${to}`) ? true : undefined,
    })
  })
  // Constructor functions beside their prototype objects.
  for (const f of p.objects.filter((o) => o.fn)) {
    const target = besideOf(p, f)
    const t = rectOf.get(target)
    if (!t) throw new Error(`${p.id}: ${f.id}.prototype names ${target}, which is not on the spine`)
    const tObj = spine.find((o) => o.id === target)!
    const k = tObj.rows.findIndex((r) => r.key === 'constructor' && 'ref' in r.value && r.value.ref === f.id)
    const pillTop = k >= 0 ? t.y + headerH + k * SIZE.row + SIZE.row / 2 - PROTO.pill / 2 : t.y + PROTO.pillDrop
    const rect = { x: cols.fnX, y: pillTop, w: cols.fn, h: PROTO.pill }
    rectOf.set(f.id, rect)
    boxes.push({ id: f.id, fn: true, title: f.title, rect, rows: [] })
    const cy = pillTop + PROTO.pill / 2
    const laneX = cols.fnX + cols.fn + PROTO.lane
    const hookY = t.y + headerH / 2
    const pts = [
      { x: rect.x + rect.w, y: cy },
      { x: laneX, y: cy },
      { x: laneX, y: hookY },
      { x: t.x + t.w, y: hookY },
    ]
    edges.push({
      id: `prototype:${f.id}`,
      kind: 'prototype',
      from: f.id,
      to: target,
      d: routePath(pts, 8, 2),
      head: arrowHead(pts),
      dot: pts[0],
      label: { text: 'prototype', x: Math.round((t.x + t.w + laneX) / 2), y: hookY - 6, anchor: 'middle' },
    })
  }
  // Rows that name a drawn object: `.constructor`, straight across to its pill.
  for (const o of spine)
    o.rows.forEach((r, k) => {
      if (!('ref' in r.value)) return
      const to = rectOf.get(r.value.ref)
      const fn = p.objects.find((x) => x.id === (r.value as { ref: string }).ref)
      if (!to || !fn?.fn || r.key !== 'constructor') throw new Error(`${p.id}: ${o.id}.${r.key} is drawn only as a .constructor arrow to a function`)
      const a = rectOf.get(o.id)!
      const yy = a.y + headerH + k * SIZE.row + SIZE.row / 2
      if (Math.abs(yy - (to.y + to.h / 2)) > 0.5) throw new Error(`${p.id}: ${o.id}.constructor names ${fn.id}, which stands beside another object`)
      const pts = [
        { x: a.x + a.w - SIZE.dotInset, y: yy },
        { x: to.x, y: yy },
      ]
      edges.push({
        id: `constructor:${o.id}`,
        kind: 'constructor',
        from: o.id,
        to: fn.id,
        d: routePath(pts, 8, 2),
        head: arrowHead(pts),
        dot: pts[0],
        changed: lookup?.found === o.id && lookup.key === 'constructor' ? true : undefined,
      })
    })
  let bottom = nullRect.y + nullRect.h
  const results = p.results.map((r) => {
    const top = bottom + (r === p.results[0] ? PROTO.resultGap : 0)
    bottom = top + PROTO.line
    return { ...r, y: top + 14, textX: Math.ceil(textWidth(`${r.expr} `, SIZE.value)) }
  })
  const note = p.note ? { text: p.note, y: bottom + 14 } : undefined
  if (note) bottom += PROTO.line
  return { id: p.id, width: cols.width, height: Math.ceil(bottom), boxes, edges, nullRect, results, note }
}

export type ProtoScene = {
  panels: ProtoPanelScene[]
  /** Per panel: its block's height in each variant (wide: its row's tallest panel). */
  blocks: PerVariant<number>[]
  height: PerVariant<number>
}

export function layoutProto(d: ProtoDiagram): ProtoScene {
  const cols = protoColumns(d)
  const panels = d.panels.map((p) => layoutProtoPanel(p, cols))
  const blocks = panels.map((s, i) => {
    const mate = panels[i % 2 === 0 ? i + 1 : i - 1]
    return { narrow: s.height, wide: Math.max(s.height, mate?.height ?? 0) }
  })
  const narrow = panels.reduce((a, s) => a + s.height, 0) + PROTO.panelGap * (panels.length - 1)
  const rows = Math.ceil(panels.length / 2)
  let wide = PROTO.panelGap * (rows - 1)
  for (let r = 0; r < rows; r++) wide += blocks[2 * r].wide
  return { panels, blocks, height: { narrow, wide } }
}
