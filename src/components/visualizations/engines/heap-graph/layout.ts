import {
  arrowHead,
  bottom,
  crosses,
  right,
  routePath,
  segments,
  textWidth,
  type Point,
  type Rect,
} from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { isRef, type HeapDiagram, type HeapEdgeId, type HeapObject, type HeapPanel } from './model'

/**
 * Automatic layout for heap graphs. No coordinates live in the data: names
 * sit in the left column, the objects they identify to their right, and an
 * object a property identifies one column further (`columns`); where that
 * is too wide, every object shares one column in the order a reader meets
 * them, and a property's arrow drops straight into the object under it or
 * turns back through a lane on the right (`stack`).
 *
 * Vertical structure depends only on the panel and the arrangement, which
 * is chosen once per variant at its narrowest width, so every width of a
 * variant has the same height and the footprint is known on the server.
 * Rows are placed so each arrow runs straight where it can: a column is fit
 * to the positions its neighbours want (isotonic regression keeps the order
 * and the gaps), sweeping left to right and back.
 */

export const SIZE = {
  header: 12,
  headerLine: 16,
  headerPad: 6,
  value: 13,
  row: 28,
  cellPad: 8,
  /** A name's box: as tall as a function object (env-records `SIZE.fn`). */
  bind: 32,
  bindPad: 8,
  /** A one-letter name still gets a 40 px box (a 54 px touch band). */
  bindMin: 40,
  /** Between names: 16, so each keeps a 46 px touch band (`HIT`, 7 px a side). */
  bindGap: 16,
  objGap: 16,
  /** Between an object and the one its last property drops into. */
  dropGap: 28,
  minGap: 32,
  maxGap: 80,
  laneMargin: 10,
  laneStep: 10,
  /** Ports keep this far from an object's corners, and this far apart. */
  portInset: 6,
  portStep: 12,
  dot: 3,
  /** A property's dot sits this far inside the object's right edge (the env-records reference dot). */
  dotInset: 14,
  resultGap: 12,
  resultLine: 20,
} as const

/** Arrow jogs shorter than this read as a kink (F-ER-08); the layout test forbids them. */
export const MIN_JOG = 16

export type Arrangement = 'columns' | 'stack'

export type LaidRow = {
  key: string
  /** Text value, or null for a dot. */
  value: string | null
  top: number
  keyWidth: number
  changed?: boolean
}

export type LaidBox = {
  id: string
  kind: 'binding' | 'object'
  rect: Rect
  /** A name's text, or an object's header. */
  title: string
  /** A name holding a primitive: its value cell. */
  value?: string
  nameWidth?: number
  rows: LaidRow[]
}

export type LaidEdge = {
  id: HeapEdgeId
  kind: 'bind' | 'ref'
  from: string
  to: string
  points: Point[]
  d: string
  head: string
  /** Where the arrow starts: on a name's edge, inside a property's value cell. */
  dot: Point
  /** The arrow a rebinding moved (the panel's mark). */
  changed?: boolean
}

export type LaidText = {
  kind: 'expr' | 'result'
  text: string
  x: number
  /** Baseline. */
  y: number
  rect: Rect
}

export type PanelScene = {
  id: string
  width: number
  height: number
  boxes: LaidBox[]
  edges: LaidEdge[]
  texts: LaidText[]
}

const headerH = 2 * SIZE.headerPad + SIZE.headerLine
const objectH = (o: HeapObject) => headerH + o.rows.length * SIZE.row
const rowCenter = (k: number) => headerH + k * SIZE.row + SIZE.row / 2

function nameWidth(name: string) {
  return textWidth(name, SIZE.value) + 2 * SIZE.cellPad
}

function bindingWidth(panel: HeapPanel, id: string): number {
  const b = panel.bindings.find((x) => x.id === id)!
  if (isRef(b.value)) return Math.max(SIZE.bindMin, Math.ceil(textWidth(b.name, SIZE.value) + 2 * SIZE.bindPad))
  return Math.ceil(nameWidth(b.name) + textWidth(b.value.text, SIZE.value) + 2 * SIZE.cellPad)
}

function keyWidth(o: HeapObject) {
  return Math.ceil(Math.max(0, ...o.rows.map((r) => textWidth(r.key, SIZE.value))) + 2 * SIZE.cellPad)
}

function objectWidth(o: HeapObject): number {
  const header = textWidth(o.title[0], SIZE.header) + 2 * SIZE.cellPad
  const value =
    Math.max(12, ...o.rows.map((r) => (isRef(r.value) ? 2 * SIZE.dot + 8 : textWidth(r.value.text, SIZE.value)))) +
    2 * SIZE.cellPad
  return Math.ceil(Math.max(header, o.rows.length ? keyWidth(o) + value : 0, 56))
}

// ---------------------------------------------------------------------------
// Structure: columns, order, edges.
// ---------------------------------------------------------------------------

type EdgeSpec = { id: HeapEdgeId; kind: 'bind' | 'ref'; from: string; to: string; row: number }

function edgeSpecs(panel: HeapPanel): EdgeSpec[] {
  const out: EdgeSpec[] = []
  for (const b of panel.bindings)
    if (isRef(b.value)) out.push({ id: `bind:${b.id}`, kind: 'bind', from: b.id, to: b.value.ref, row: -1 })
  for (const o of panel.objects)
    o.rows.forEach((r, k) => {
      if (isRef(r.value)) out.push({ id: `ref:${o.id}.${r.key}`, kind: 'ref', from: o.id, to: r.value.ref, row: k })
    })
  return out
}

/** Objects in the order a reader meets them: each name's object, then what its properties identify (depth first). */
function readingOrder(panel: HeapPanel): string[] {
  const out: string[] = []
  const visit = (id: string) => {
    if (out.includes(id)) return
    out.push(id)
    for (const r of panel.objects.find((o) => o.id === id)!.rows) if (isRef(r.value)) visit(r.value.ref)
  }
  for (const b of panel.bindings) if (isRef(b.value)) visit(b.value.ref)
  for (const o of panel.objects) visit(o.id)
  return out
}

/**
 * Names top to bottom: grouped by the object they identify, in reading
 * order (two names for one object sit together, so their arrows converge
 * instead of crossing a third), then the names holding primitives; ties
 * keep the program's order.
 */
function nameOrder(panel: HeapPanel): string[] {
  const order = readingOrder(panel)
  const key = (i: number) => {
    const v = panel.bindings[i].value
    return isRef(v) ? order.indexOf(v.ref) : order.length
  }
  return panel.bindings
    .map((b, i) => ({ id: b.id, i }))
    .sort((p, q) => key(p.i) - key(q.i) || p.i - q.i)
    .map((x) => x.id)
}

/**
 * The column of every node (names are column 0), or null when the panel
 * cannot be drawn in that arrangement: in `columns` every arrow must point
 * one column right (a shared or cyclic structure that breaks this uses `stack`).
 */
function columnsOf(panel: HeapPanel, arrangement: Arrangement): Map<string, number> | null {
  const col = new Map<string, number>(panel.bindings.map((b) => [b.id, 0]))
  if (arrangement === 'stack') {
    for (const o of panel.objects) col.set(o.id, 1)
    return col
  }
  // Breadth first from the names: an object's column is its distance.
  let frontier = panel.bindings.flatMap((b) => (isRef(b.value) ? [b.value.ref] : []))
  let depth = 1
  while (frontier.length) {
    const next: string[] = []
    for (const id of frontier) {
      if (col.has(id)) continue
      col.set(id, depth)
      for (const r of panel.objects.find((o) => o.id === id)!.rows) if (isRef(r.value)) next.push(r.value.ref)
    }
    frontier = next
    depth++
  }
  for (const e of edgeSpecs(panel)) if (col.get(e.to)! !== col.get(e.from)! + 1) return null
  return col
}

// ---------------------------------------------------------------------------
// Vertical placement.
// ---------------------------------------------------------------------------

/**
 * Tops for one column: as close to `want` as the order and the gaps allow
 * (least squares, pool-adjacent-violators), never above 0. `weight` 0
 * means "no wish": the item packs against its neighbours.
 */
export function fitColumn(heights: number[], gaps: number[], want: number[], weight: number[]): number[] {
  const n = heights.length
  const offset: number[] = []
  let acc = 0
  for (let i = 0; i < n; i++) {
    offset.push(acc)
    acc += heights[i] + (gaps[i] ?? 0)
  }
  // Blocks of pooled items: mean of (want - offset), weighted.
  const blocks: { sum: number; w: number; n: number }[] = []
  for (let i = 0; i < n; i++) {
    const w = Math.max(weight[i], 1e-6)
    blocks.push({ sum: (want[i] - offset[i]) * w, w, n: 1 })
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1]
      const a = blocks[blocks.length - 2]
      if (a.sum / a.w <= b.sum / b.w) break
      blocks.splice(-2, 2, { sum: a.sum + b.sum, w: a.w + b.w, n: a.n + b.n })
    }
  }
  const out: number[] = []
  let i = 0
  for (const b of blocks) {
    const x = Math.max(0, b.sum / b.w)
    for (let k = 0; k < b.n; k++, i++) out.push(Math.round(x + offset[i]))
  }
  return out
}

type Vertical = {
  tops: Map<string, number>
  heights: Map<string, number>
  /** Columns in order, top to bottom. */
  columns: string[][]
  col: Map<string, number>
  /** `ref` edges that drop straight down into the next object of a stack. */
  drops: Set<HeapEdgeId>
}

function vertical(panel: HeapPanel, col: Map<string, number>, arrangement: Arrangement): Vertical {
  const specs = edgeSpecs(panel)
  const heights = new Map<string, number>()
  for (const b of panel.bindings) heights.set(b.id, SIZE.bind)
  for (const o of panel.objects) heights.set(o.id, objectH(o))
  const maxCol = Math.max(0, ...col.values())
  const order = readingOrder(panel)
  const columns: string[][] = Array.from({ length: maxCol + 1 }, () => [])
  for (const id of nameOrder(panel)) columns[0].push(id)
  for (const id of order) columns[col.get(id)!].push(id)

  // Drops (stack): the object right under the one whose last property is
  // its only incoming arrow.
  const drops = new Set<HeapEdgeId>()
  if (arrangement === 'stack') {
    const objs = columns[1]
    for (const e of specs.filter((s) => s.kind === 'ref')) {
      const src = panel.objects.find((o) => o.id === e.from)!
      const at = objs.indexOf(e.from)
      const incoming = specs.filter((s) => s.to === e.to).length
      if (objs[at + 1] === e.to && e.row === src.rows.length - 1 && incoming === 1) drops.add(e.id)
    }
  }
  const gapAfter = (c: number, i: number) => {
    if (c === 0) return SIZE.bindGap
    const a = columns[c][i]
    const b = columns[c][i + 1]
    const drop = specs.find((s) => s.from === a && s.to === b && drops.has(s.id))
    return drop ? SIZE.dropGap : SIZE.objGap
  }

  const tops = new Map<string, number>()
  columns.forEach((ids, c) => {
    let y = 0
    ids.forEach((id, i) => {
      tops.set(id, y)
      y += heights.get(id)! + gapAfter(c, i)
    })
  })

  const sourceY = (e: EdgeSpec) => tops.get(e.from)! + (e.kind === 'bind' ? SIZE.bind / 2 : rowCenter(e.row))
  const cross = specs.filter((e) => col.get(e.from) !== col.get(e.to))
  const incoming = (id: string) => cross.filter((e) => e.to === id)
  /** Where arrows meet an object: its header when one arrives, its middle when several do. */
  const anchor = (id: string) => (incoming(id).length > 1 ? heights.get(id)! / 2 : headerH / 2)

  const fit = (c: number, wish: (id: string) => number | null) => {
    const ids = columns[c]
    const wants = ids.map(wish)
    const tops2 = fitColumn(
      ids.map((id) => heights.get(id)!),
      ids.map((_, i) => gapAfter(c, i)),
      wants.map((w) => w ?? 0),
      wants.map((w) => (w === null ? 0 : 1)),
    )
    ids.forEach((id, i) => tops.set(id, tops2[i]))
  }
  const leftToRight = () => {
    for (let c = 1; c <= maxCol; c++)
      fit(c, (id) => {
        const ins = incoming(id)
        if (!ins.length) return null
        return ins.reduce((s, e) => s + sourceY(e), 0) / ins.length - anchor(id)
      })
  }
  const rightToLeft = () => {
    for (let c = maxCol - 1; c >= 0; c--)
      fit(c, (id) => {
        const outs = cross.filter((e) => e.from === id)
        if (!outs.length) return tops.get(id)!
        const want = outs.map((e) => {
          // Several names converging on one object want to straddle its anchor.
          const peers = incoming(e.to).sort((p, q) => sourceY(p) - sourceY(q))
          const k = peers.indexOf(e)
          const spread = (k - (peers.length - 1) / 2) * (SIZE.bind + SIZE.bindGap)
          const offset = e.kind === 'bind' ? SIZE.bind / 2 : rowCenter(e.row)
          return tops.get(e.to)! + anchor(e.to) + (peers.length > 1 && e.kind === 'bind' ? spread : 0) - offset
        })
        return want.reduce((s, x) => s + x, 0) / want.length
      })
  }
  leftToRight()
  rightToLeft()
  leftToRight()
  rightToLeft()
  leftToRight()
  return { tops, heights, columns, col, drops }
}

// ---------------------------------------------------------------------------
// Horizontal grid, shared by every panel of a variant.
// ---------------------------------------------------------------------------

/**
 * `colW`: each column's widest box over the panels (columns line up from
 * panel to panel); `width`: the columns without their gaps, the last one at
 * the widest a panel draws it, right lanes included.
 */
type Grid = { arrangement: Arrangement; colW: number[]; width: number }

/** Each panel's widest box per column; objects in a column share that width (siblings read as a set). */
function panelColumnWidths(panel: HeapPanel, col: Map<string, number>): number[] {
  const out: number[] = []
  for (const b of panel.bindings) out[0] = Math.max(out[0] ?? 0, bindingWidth(panel, b.id))
  for (const o of panel.objects) {
    const c = col.get(o.id)!
    out[c] = Math.max(out[c] ?? 0, objectWidth(o))
  }
  return Array.from(out, (w) => w ?? 0)
}

/** Right lanes a stack panel needs: one per arrow that turns back into an object it cannot drop into. */
function rightLanes(panel: HeapPanel, v: Vertical): number {
  return edgeSpecs(panel).filter((e) => e.kind === 'ref' && !v.drops.has(e.id)).length
}

const lanesWidth = (n: number) => (n ? SIZE.laneMargin + (n - 1) * SIZE.laneStep + 6 : 0)

function gridFor(d: HeapDiagram, arrangement: Arrangement, minWidth: number): Grid | null {
  const colW: number[] = []
  let last = 0
  for (const p of d.panels) {
    const col = columnsOf(p, arrangement)
    if (!col) return null
    const own = panelColumnWidths(p, col)
    own.forEach((w, c) => (colW[c] = Math.max(colW[c] ?? 0, w)))
    // A stack's one object column, with the lanes this panel turns back through.
    if (arrangement === 'stack') last = Math.max(last, own[1] + lanesWidth(rightLanes(p, vertical(p, col, arrangement))))
  }
  const n = colW.length
  const fixed = colW.slice(0, -1).reduce((a, b) => a + b, 0) + Math.max(last, colW[n - 1] ?? 0)
  const free = n > 1 ? (minWidth - fixed) / (n - 1) : minWidth - fixed
  if (free < (n > 1 ? SIZE.minGap : 0)) return null
  return { arrangement, colW, width: fixed }
}

/** The arrangement for a variant: columns when every panel fits them at the narrowest width, else the stack. */
export function chooseGrid(d: HeapDiagram, minWidth: number): Grid {
  const g = gridFor(d, 'columns', minWidth) ?? gridFor(d, 'stack', minWidth)
  if (!g) {
    const need = gridFor(d, 'stack', Number.MAX_SAFE_INTEGER)
    throw new Error(`the panels need ${need ? Math.ceil(need.width + SIZE.minGap) : '?'}px, more than ${minWidth}px`)
  }
  return g
}

// ---------------------------------------------------------------------------
// One panel at one width.
// ---------------------------------------------------------------------------

export function layoutPanel(panel: HeapPanel, grid: Grid, gap: number, width: number): PanelScene {
  const col = columnsOf(panel, grid.arrangement)
  if (!col) throw new Error(`${panel.id}: cannot be drawn in ${grid.arrangement}`)
  const v = vertical(panel, col, grid.arrangement)
  const n = grid.colW.length
  const x0 = 0
  const colX: number[] = []
  grid.colW.forEach((w, c) => colX.push(c === 0 ? x0 : colX[c - 1] + grid.colW[c - 1] + gap))
  const own = panelColumnWidths(panel, col)

  const rect = (id: string): Rect => {
    const c = col.get(id)!
    return { x: colX[c], y: v.tops.get(id)!, w: own[c], h: v.heights.get(id)! }
  }
  const mark = panel.changed
  const boxes: LaidBox[] = [
    ...panel.bindings.map((b): LaidBox => {
      const r = rect(b.id)
      return {
        id: b.id,
        kind: 'binding',
        rect: r,
        title: b.name,
        value: isRef(b.value) ? undefined : b.value.text,
        nameWidth: isRef(b.value) ? undefined : Math.ceil(nameWidth(b.name)),
        rows: [],
      }
    }),
    ...readingOrder(panel).map((id): LaidBox => {
      const o = panel.objects.find((x) => x.id === id)!
      const r = rect(id)
      return {
        id,
        kind: 'object',
        rect: r,
        title: o.title[0],
        rows: o.rows.map((row, k) => ({
          key: row.key,
          value: isRef(row.value) ? null : row.value.text,
          top: r.y + headerH + k * SIZE.row,
          keyWidth: keyWidth(o),
          changed: mark && 'row' in mark && mark.row.object === id && mark.row.key === row.key ? true : undefined,
        })),
      }
    }),
  ]
  const boxOf = (id: string) => boxes.find((b) => b.id === id)!.rect

  // Sources, then ports, then routes.
  const specs = edgeSpecs(panel)
  const source = (e: EdgeSpec): Point => {
    const R = boxOf(e.from)
    return e.kind === 'bind'
      ? { x: right(R), y: R.y + SIZE.bind / 2 }
      : { x: right(R) - SIZE.dotInset, y: R.y + rowCenter(e.row) }
  }
  const side = (e: EdgeSpec): 'left' | 'right' | 'top' =>
    v.drops.has(e.id) ? 'top' : col.get(e.to) === col.get(e.from) ? 'right' : 'left'
  const ports = new Map<HeapEdgeId, number>()
  for (const target of panel.objects) {
    for (const s of ['left', 'right'] as const) {
      const T = boxOf(target.id)
      // An object that identifies itself (a cycle): the arrow turns back into its own header.
      for (const e of specs.filter((x) => x.to === target.id && x.from === target.id && side(x) === s))
        ports.set(e.id, T.y + headerH / 2)
      const ins = specs
        .filter((e) => e.to === target.id && e.from !== target.id && side(e) === s)
        .sort((p, q) => source(p).y - source(q).y)
      if (!ins.length) continue
      placePorts(ins.map((e) => source(e).y), T.y + SIZE.portInset, bottom(T) - SIZE.portInset).forEach((y, i) =>
        ports.set(ins[i].id, y),
      )
    }
  }

  const edges: LaidEdge[] = []
  // Left-entering arrows that need an elbow share their gap's lanes.
  for (let c = 0; c < n - 1; c++) {
    const inGap = specs.filter((e) => side(e) === 'left' && col.get(e.from) === c)
    const bent = inGap.filter((e) => Math.abs(source(e).y - ports.get(e.id)!) >= 0.5)
    const xs = Math.max(...inGap.map((e) => right(boxOf(e.from))), colX[c] + own[c])
    const xt = colX[c + 1]
    const straight = inGap.filter((e) => !bent.includes(e))
    const order = bestLaneOrder(bent, (e, laneX) => {
      const s = source(e)
      return [s, { x: laneX, y: s.y }, { x: laneX, y: ports.get(e.id)! }, { x: boxOf(e.to).x, y: ports.get(e.id)! }]
    }, xs, xt, straight.map((e) => [source(e), { x: boxOf(e.to).x, y: source(e).y }]))
    for (const e of straight) {
      const s = source(e)
      edges.push(edgeOf(e, [s, { x: boxOf(e.to).x, y: s.y }], s, mark))
    }
    order.forEach(({ e, laneX }) => {
      const s = source(e)
      const p = ports.get(e.id)!
      edges.push(edgeOf(e, [s, { x: laneX, y: s.y }, { x: laneX, y: p }, { x: boxOf(e.to).x, y: p }], s, mark))
    })
  }
  // Stack: drops, then arrows that turn back through the right lanes (shortest innermost).
  const colRight = colX[1] + own[1]
  const back = specs
    .filter((e) => side(e) === 'right')
    .sort((p, q) => Math.abs(source(p).y - ports.get(p.id)!) - Math.abs(source(q).y - ports.get(q.id)!))
  back.forEach((e, k) => {
    const s = source(e)
    const laneX = colRight + SIZE.laneMargin + k * SIZE.laneStep
    const p = ports.get(e.id)!
    edges.push(edgeOf(e, [s, { x: laneX, y: s.y }, { x: laneX, y: p }, { x: right(boxOf(e.to)), y: p }], s, mark))
  })
  for (const e of specs.filter((x) => side(x) === 'top')) {
    const s = source(e)
    edges.push(edgeOf(e, [s, { x: s.x, y: boxOf(e.to).y }], s, mark))
  }
  // Data order, so the markup reads in the order of the program.
  edges.sort((p, q) => specs.findIndex((s) => s.id === p.id) - specs.findIndex((s) => s.id === q.id))

  // The program's own output under the panel: the expression, then `› value`.
  const texts: LaidText[] = []
  let contentBottom = Math.max(0, ...boxes.map((b) => bottom(b.rect)))
  let y = contentBottom + SIZE.resultGap
  for (const r of panel.results ?? []) {
    const ew = textWidth(r.expr, SIZE.value)
    const out = `› ${r.text}`
    const ow = textWidth(out, SIZE.value)
    const gapW = textWidth(' ', SIZE.value)
    texts.push({ kind: 'expr', text: r.expr, x: x0, y: y + 14, rect: { x: x0, y, w: ew, h: SIZE.resultLine } })
    texts.push({
      kind: 'result',
      text: out,
      x: x0 + ew + gapW,
      y: y + 14,
      rect: { x: x0 + ew + gapW, y, w: ow, h: SIZE.resultLine },
    })
    y += SIZE.resultLine
    contentBottom = y
  }

  return { id: panel.id, width, height: Math.ceil(contentBottom), boxes, edges, texts }
}

/**
 * Ports on one side of an object, `portStep` apart: level with each source
 * where every one fits (straight arrows); otherwise spread around the
 * middle, so no arrow ends in a jog shorter than `MIN_JOG` (a kink, F-ER-08)
 * unless the source is level with its port.
 */
export function placePorts(sources: number[], lo: number, hi: number): number[] {
  const n = sources.length
  const clamp = (y: number) => Math.min(hi, Math.max(lo, y))
  const kinks = (p: number[]) => p.some((y, i) => Math.abs(y - sources[i]) >= 0.5 && Math.abs(y - sources[i]) < MIN_JOG)
  const half = (x: number) => Math.round(x * 2) / 2
  if (n === 1) return [half(clamp(sources[0]))]
  const step = Math.min(SIZE.portStep, (hi - lo) / (n - 1))
  const level = sources.map(clamp)
  for (let i = 1; i < n; i++) level[i] = Math.max(level[i], level[i - 1] + step)
  if (level[n - 1] <= hi && !kinks(level)) return level.map(half)
  const mid = (lo + hi) / 2
  const spread = sources.map((_, i) => mid + (i - (n - 1) / 2) * step)
  // A source level with the band keeps its straight arrow where the order allows.
  spread.forEach((y, i) => {
    const s = sources[i]
    const ok = s >= lo && s <= hi && (i === 0 || s >= spread[i - 1] + step) && (i === n - 1 || s <= spread[i + 1] - step)
    if (ok && Math.abs(y - s) < MIN_JOG) spread[i] = s
  })
  return spread.map(half)
}

/**
 * Lane x positions for the bent arrows of one gap, in the order with the
 * fewest crossings (every order when there are few, as in real lessons).
 */
function bestLaneOrder<E>(
  bent: E[],
  route: (e: E, laneX: number) => Point[],
  xs: number,
  xt: number,
  fixed: Point[][],
): { e: E; laneX: number }[] {
  if (!bent.length) return []
  const laneAt = (i: number) => Math.round(xs + ((i + 1) * (xt - xs)) / (bent.length + 1))
  const score = (order: E[]) => {
    const routes = [...order.map((e, i) => route(e, laneAt(i))), ...fixed].map(segments)
    let k = 0
    for (let a = 0; a < routes.length; a++)
      for (let b = a + 1; b < routes.length; b++)
        for (const s of routes[a]) for (const t of routes[b]) if (crosses(s, t)) k++
    return k
  }
  let best = bent
  let bestScore = score(bent)
  if (bent.length <= 6) {
    const permute = (rest: E[], acc: E[]) => {
      if (!rest.length) {
        const s = score(acc)
        if (s < bestScore) {
          best = acc
          bestScore = s
        }
        return
      }
      rest.forEach((e, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, e]))
    }
    permute(bent, [])
  }
  return best.map((e, i) => ({ e, laneX: laneAt(i) }))
}

function edgeOf(e: EdgeSpec, points: Point[], dot: Point, mark: HeapPanel['changed']): LaidEdge {
  return {
    id: e.id,
    kind: e.kind,
    from: e.from,
    to: e.to,
    points,
    d: routePath(points, 8, 2),
    head: arrowHead(points),
    dot,
    changed: mark && 'binding' in mark && e.kind === 'bind' && mark.binding === e.from ? true : undefined,
  }
}

// ---------------------------------------------------------------------------
// The figure per variant.
// ---------------------------------------------------------------------------

export type Variant = 'narrow' | 'wide'

/**
 * Stage widths a static frame gets (the env-records `STAGE`): 288 (320
 * viewport) and 343 below 768; 606 (768) and 734 (the lesson column from
 * 1280) above. Panels stack at every width (a panel needs its full width for
 * three columns), and each listed width gets its own layout.
 */
export const STAGE = {
  narrow: { min: 288, widths: [288, 343] },
  wide: { min: 606, widths: [606, 734] },
} as const
export const PANEL_GAP = 32
/** Panel heading: one line of code above each panel (the env-records `HEADING`). */
export const HEADING = { line: 20, gap: 8 } as const
/** The one-line hint (H3 R11), worded per input; sans 12/20. */
export const HINT = {
  line: 20,
  gap: 12,
  size: 12,
  hover: 'Hover a name to trace what it identifies.',
  tap: 'Tap a name to trace what it identifies.',
} as const
export const hasHint = (d: HeapDiagram) => d.panels.some((p) => p.bindings.some((b) => isRef(b.value)))

export type DiagramScene = {
  variant: Variant
  arrangement: Arrangement
  panels: { panel: HeapPanel; scenes: PanelScene[] }[]
  /** The stage widths that get their own svg (the first of each run with one gap). */
  widths: readonly number[]
  height: number
}

/** The width of a result line: the expression, a space, `› value`. */
const resultWidth = (r: { expr: string; text: string }) =>
  textWidth(r.expr, SIZE.value) + textWidth(' ', SIZE.value) + textWidth(`› ${r.text}`, SIZE.value)

export function layoutDiagram(d: HeapDiagram, variant: Variant): DiagramScene {
  const { min } = STAGE[variant]
  const grid = chooseGrid(d, min)
  for (const p of d.panels) {
    const w = Math.ceil(monoWidth(p.heading, SIZE.value))
    if (w > min) throw new Error(`panel ${p.id} heading: ${w}px > ${min}px; it would wrap`)
    for (const r of p.results ?? [])
      if (resultWidth(r) > min) throw new Error(`panel ${p.id}: the result "${r.expr}" is wider than ${min}px`)
  }
  // Each stage width spreads the columns up to `maxGap`; widths that end up
  // with the same gap draw the same picture, so only the first is kept (the
  // svg is centred in its stage, spec §6.5 markup budget). Every panel of a
  // width shares one svg width, so the columns line up from panel to panel.
  const n = grid.colW.length
  const gapAt = (w: number) => (n > 1 ? Math.min(SIZE.maxGap, Math.floor((w - grid.width) / (n - 1))) : 0)
  const results = Math.max(0, ...d.panels.flatMap((p) => (p.results ?? []).map((r) => Math.ceil(resultWidth(r)))))
  const widths = STAGE[variant].widths.filter((w, i, all) => i === 0 || gapAt(w) !== gapAt(all[i - 1]))
  const sceneWidth = (w: number) => Math.max(grid.width + (n - 1) * gapAt(w), results)
  const panels = d.panels.map((panel) => ({
    panel,
    scenes: widths.map((w) => layoutPanel(panel, grid, gapAt(w), sceneWidth(w))),
  }))
  let height = hasHint(d) ? HINT.line + HINT.gap : 0
  panels.forEach((p, i) => {
    height += HEADING.line + HEADING.gap + p.scenes[0].height + (i > 0 ? PANEL_GAP : 0)
  })
  return { variant, arrangement: grid.arrangement, panels, widths, height }
}

/** Two caption lines for the fallback note (env-records `FAILED_HEIGHT`). */
export const FAILED_HEIGHT = 48

/** The layout for rendering: never throws; a rejected diagram renders as a note pointing to "Diagram as text". */
export function layoutDiagramSafe(
  d: HeapDiagram,
  variant: Variant,
): DiagramScene | { variant: Variant; failed: string; height: number } {
  try {
    return layoutDiagram(d, variant)
  } catch (e) {
    return { variant, failed: (e as Error).message, height: FAILED_HEIGHT }
  }
}
