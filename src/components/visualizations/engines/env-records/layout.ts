import {
  arrowHead,
  bottom,
  centerX,
  intersects,
  right,
  routePath,
  segmentBox,
  segments,
  simplify,
  textWidth,
  type Point,
  type Rect,
} from '../../substrates/box-arrow'
import { sansWidth, wrapByWidth } from '../../substrates/text-metrics'
import {
  isFunction,
  isRecord,
  isSlot,
  type EdgeId,
  type EnvDiagram,
  type EnvFunction,
  type EnvRecord,
  type EnvNode,
  type EnvSection,
  type Label,
} from './model'

/**
 * Automatic layout for environment-records diagrams. No coordinates live in
 * the data: tiers come from the outer chain (outermost on top, so outer
 * links always point up), columns from the busiest tier, routes from the
 * links, and labels go wherever they collide with nothing.
 *
 * Vertical structure depends only on the layout variant (label choices are
 * made at the variant's narrowest width), so every width of a variant has
 * the same height and the frame's footprint is known on the server.
 */

export const SIZE = {
  header: 12,
  headerLine: 16,
  headerPad: 6,
  value: 13,
  row: 28,
  cellPad: 8,
  fn: 32,
  fnPad: 10,
  /** Function boxes tighten to this inner padding before a tier gives up. */
  fnPadTight: 6,
  slot: 32,
  tierGap: 48,
  /** Above a record that several functions converge on: room for elbows and a label. */
  convergeGap: 72,
  colGap: 16,
  minColGap: 8,
  outputGap: 6,
  outputLine: 20,
  lane: 12,
  laneMargin: 12,
  busTop: 14,
  busStep: 12,
  noteGap: 12,
  noteLine: 16,
  /** A note wraps at this width at most, so it reads as a caption to its mark. */
  noteMax: 220,
  label: 12,
  labelGap: 6,
  dot: 3,
  /** The legend's hatch swatch (D22) and its gap to the words. */
  swatch: 12,
  swatchGap: 6,
  /** Beside arrangement: first reference lane and lane step outside the record, gap to the column. */
  besideLane: 8,
  besideStep: 10,
  besideGap: 10,
  /** Beside arrangement: a record to its function (room for the `env` label), and between groups. */
  besideEnv: 32,
  besideGroup: 16,
} as const

/** Narrowest section width per variant; wider containers reuse the same vertical structure. */
export type SectionWidths = { min: number; widths: readonly number[] }

export type LaidRow = {
  name: string
  /** Text value, or null for a reference dot. */
  value: string | null
  uninitialized?: boolean
  top: number
  nameWidth: number
}

export type LaidBox = {
  id: string
  kind: EnvNode['kind']
  rect: Rect
  title: string[]
  rows: LaidRow[]
  unused?: boolean
}

export type LaidEdge = {
  id: EdgeId
  kind: 'env' | 'outer' | 'ref'
  points: Point[]
  d: string
  head: string
  dashed: boolean
  /** Reference arrows start at a dot in the binding's value cell. */
  dot?: Point
}

export type LaidText = {
  kind: 'output' | 'label' | 'note'
  text: string
  /**
   * The node whose traced path lights this text: the function an output
   * belongs to (its `› value`), or the owner of the link a label names.
   */
  node?: string
  /** The link a label names: it is drawn with that link and rides its hover path. */
  edge?: EdgeId
  x: number
  /** Baseline. */
  y: number
  anchor: 'start' | 'middle'
  rect: Rect
}

export type SectionScene = {
  id: string
  width: number
  height: number
  boxes: LaidBox[]
  edges: LaidEdge[]
  texts: LaidText[]
  /** Top of each tier, for alignment and tests. */
  tierTops: number[]
  /** The mark the note explains (a swatch is drawn before its first line). */
  noteMark?: 'hatch'
}

const pick = (label: Label, level: number) =>
  label[Math.min(level, label.length - 1)]
const lines = (s: string) => s.split('\n')
const maxLevel = (nodes: EnvNode[]) =>
  Math.max(0, ...nodes.map((n) => n.title.length - 1))

function boxSize(
  node: EnvNode,
  level: number,
  fnPad: number = SIZE.fnPad,
): { w: number; h: number; title: string[] } {
  const title = lines(pick(node.title, level))
  if (isRecord(node)) {
    const header =
      Math.max(...title.map((t) => textWidth(t, SIZE.header))) +
      2 * SIZE.cellPad
    const nameW =
      Math.max(0, ...node.bindings.map((b) => textWidth(b.name, SIZE.value))) +
      2 * SIZE.cellPad
    const valueW =
      Math.max(
        12,
        ...node.bindings.map((b) =>
          b.uninitialized
            ? textWidth('‹uninitialized›', SIZE.header)
            : 'text' in b.value
              ? textWidth(b.value.text, SIZE.value)
              : 2 * SIZE.dot + 8,
        ),
      ) +
      2 * SIZE.cellPad
    const rows = node.bindings.length ? nameW + valueW : 0
    const h =
      2 * SIZE.headerPad +
      title.length * SIZE.headerLine +
      node.bindings.length * SIZE.row
    return { w: Math.ceil(Math.max(header, rows, 56)), h, title }
  }
  if (isFunction(node)) {
    return {
      w: Math.ceil(textWidth(`ƒ ${title[0]}`, SIZE.header) + 2 * fnPad),
      h: SIZE.fn,
      title,
    }
  }
  return {
    w: Math.ceil(textWidth(title[0], SIZE.header) + 2 * fnPad),
    h: SIZE.slot,
    title,
  }
}

/** Which nodes link up to `id` (the children it is laid out over). */
function kidsOf(section: EnvSection, id: string): EnvNode[] {
  return section.nodes.filter(
    (n) =>
      (isFunction(n) && n.env === id) ||
      (isRecord(n) && n.outer === id) ||
      (isSlot(n) && n.under === id),
  )
}

function parentOf(section: EnvSection, node: EnvNode): string | null {
  if (isFunction(node)) return node.env
  if (isSlot(node)) return node.under
  return node.outer
}

export function tiersOf(section: EnvSection): EnvNode[][] {
  const ids = new Set(section.nodes.map((n) => n.id))
  const depth = new Map<string, number>()
  const recordDepth = (id: string, seen: Set<string> = new Set()): number => {
    if (depth.has(id)) return depth.get(id)!
    if (seen.has(id)) throw new Error(`${section.id}: outer cycle at ${id}`)
    seen.add(id)
    const node = section.nodes.find((n) => n.id === id)!
    if (!isRecord(node)) throw new Error(`${section.id}: ${id} is not a record`)
    const d =
      node.outer && ids.has(node.outer) ? recordDepth(node.outer, seen) + 1 : 0
    depth.set(id, d)
    return d
  }
  const records = section.nodes.filter(isRecord)
  const deepest = Math.max(0, ...records.map((r) => recordDepth(r.id)))
  const tiers: EnvNode[][] = Array.from({ length: deepest + 2 }, () => [])
  for (const n of section.nodes)
    tiers[isRecord(n) ? recordDepth(n.id) : deepest + 1].push(n)
  return tiers.filter((t) => t.length > 0)
}

function refTargets(section: EnvSection): string[] {
  const out: string[] = []
  for (const r of section.nodes.filter(isRecord))
    for (const b of r.bindings)
      if ('ref' in b.value && !out.includes(b.value.ref)) out.push(b.value.ref)
  return out
}

function lanesWidth(section: EnvSection): number {
  const n = refTargets(section).length
  return n ? SIZE.laneMargin + (n - 1) * SIZE.lane + 4 : 0
}

/** Uniform width per kind inside a tier, so siblings read as a set. */
function uniformWidths(
  tier: EnvNode[],
  widths: Map<string, number>,
): Map<string, number> {
  const out = new Map(widths)
  for (const group of [['record'], ['function', 'slot']]) {
    const of = tier.filter((n) => group.includes(n.kind))
    const w = Math.max(0, ...of.map((n) => widths.get(n.id)!))
    for (const n of of) out.set(n.id, w)
  }
  return out
}

/**
 * Widths and x positions for a tier: equal columns of uniform boxes when they
 * fit, else boxes at their own width with even gaps. Null when nothing fits.
 */
function placeTier(
  tier: EnvNode[],
  widths: Map<string, number>,
  contentW: number,
): { w: number[]; x: number[] } | null {
  const same = uniformWidths(tier, widths)
  const ws = tier.map((n) => same.get(n.id)!)
  const columns = equalColumns(ws, contentW)
  if (columns) return { w: ws, x: columns }
  const own = tier.map((n) => widths.get(n.id)!)
  const spread = contentSized(own, contentW)
  return spread ? { w: own, x: spread } : null
}

function anchorIndex(tiers: EnvNode[][]): number {
  let best = 0
  tiers.forEach((t, i) => {
    if (t.length >= tiers[best].length) best = i
  })
  return best
}

function equalColumns(widths: number[], contentW: number): number[] | null {
  const n = widths.length
  const maxW = Math.max(...widths)
  for (const gap of [SIZE.colGap, SIZE.minColGap]) {
    const cw = (contentW - (n - 1) * gap) / n
    if (maxW <= cw) return widths.map((w, i) => i * (cw + gap) + (cw - w) / 2)
  }
  return null
}

function contentSized(widths: number[], contentW: number): number[] | null {
  const n = widths.length
  const free = contentW - widths.reduce((a, b) => a + b, 0)
  if (n === 1) return free >= 0 ? [free / 2] : null
  const gap = free / (n - 1)
  if (gap < SIZE.minColGap) return null
  const xs: number[] = []
  let x = 0
  for (const w of widths) {
    xs.push(x)
    x += w + gap
  }
  return xs
}

/** Pick the longest labels each tier can afford at the narrowest width. */
function chooseLevels(
  section: EnvSection,
  tiers: EnvNode[][],
  minWidth: number,
): Map<string, number> {
  const contentW = minWidth - lanesWidth(section)
  const levels = new Map<string, number>()
  for (const tier of tiers) {
    const top = maxLevel(tier)
    const widthsAt = (level: number) =>
      new Map(tier.map((n) => [n.id, boxSize(n, level).w]))
    // Prefer the longest labels that keep equal columns (siblings stay
    // aligned under their parents), then any labels that fit at all.
    const columns = (level: number) => {
      const same = uniformWidths(tier, widthsAt(level))
      return (
        equalColumns(
          tier.map((n) => same.get(n.id)!),
          contentW,
        ) !== null
      )
    }
    let chosen = top
    const levelsUpTo = Array.from({ length: top + 1 }, (_, i) => i)
    const firstColumns = levelsUpTo.find(columns)
    const firstFit = levelsUpTo.find(
      (l) => placeTier(tier, widthsAt(l), contentW) !== null,
    )
    if (
      firstColumns !== undefined &&
      (tier.length > 1 || firstFit === undefined)
    )
      chosen = firstColumns
    else if (firstFit !== undefined) chosen = firstFit
    for (const n of tier) levels.set(n.id, chosen)
  }
  return levels
}

type Placed = { node: EnvNode; rect: Rect; title: string[] }

/**
 * x positions for a row of boxes that want to sit centred on `center`: as
 * close to it as the gaps allow, never overlapping and never outside
 * [0, contentW]. Null when the boxes cannot fit even at the minimum gap
 * (VIZ-H A3: a row used to be clamped into overlap).
 */
function resolveRow(
  items: { id: string; w: number; center: number }[],
  contentW: number,
): Map<string, number> | null {
  const sorted = [...items].sort((a, b) => a.center - b.center)
  for (const gap of [SIZE.colGap, SIZE.minColGap]) {
    const total = sorted.reduce((s, it) => s + it.w, 0) + (sorted.length - 1) * gap
    if (total > contentW + 0.5) continue
    const xs: number[] = []
    sorted.forEach((it, i) => {
      const want = Math.max(0, it.center - it.w / 2)
      xs.push(i === 0 ? want : Math.max(want, xs[i - 1] + sorted[i - 1].w + gap))
    })
    // Pull back from the right edge, keeping the gaps.
    for (let i = sorted.length - 1; i >= 0; i--) {
      const limit = i === sorted.length - 1 ? contentW - sorted[i].w : xs[i + 1] - gap - sorted[i].w
      xs[i] = Math.min(xs[i], limit)
    }
    return new Map(sorted.map((it, i) => [it.id, Math.round(Math.max(0, xs[i]))]))
  }
  return null
}

/**
 * The beside arrangement (VIZ-H D18): a record whose bindings name
 * functions sits on the left, and each named function sits in one column to
 * its right, under the record it closed over (`call A` above `ƒ A`, so the
 * [[Environment]] arrow still points up). References leave the value cells
 * and turn into the function from the left, so two names for one function
 * converge within a few rows instead of detouring under the whole figure.
 *
 * Applies when the section is exactly that shape: one root record holding
 * the references, and for each referenced function its own record, a child
 * of the root drawn without its outer link. Anything else uses the tiers.
 */
type BesidePlan = {
  root: EnvRecord
  groups: { fn: EnvFunction; record: EnvRecord }[]
}

export function besidePlan(section: EnvSection): BesidePlan | null {
  const ids = new Set(section.nodes.map((n) => n.id))
  const roots = section.nodes.filter(isRecord).filter((r) => !r.outer || !ids.has(r.outer))
  if (roots.length !== 1) return null
  const root = roots[0]
  const order: string[] = []
  for (const b of root.bindings) if ('ref' in b.value && !order.includes(b.value.ref)) order.push(b.value.ref)
  if (!order.length) return null
  const used = new Set([root.id])
  const groups: BesidePlan['groups'] = []
  for (const id of order) {
    const fn = section.nodes.find((n) => n.id === id)
    if (!fn || !isFunction(fn)) return null
    const record = section.nodes.find((n) => n.id === fn.env)
    if (!record || !isRecord(record) || record === root) return null
    if (record.outer !== root.id || record.drawOuter !== false || used.has(record.id)) return null
    if (record.bindings.some((b) => 'ref' in b.value)) return null
    used.add(record.id)
    used.add(fn.id)
    groups.push({ fn, record })
  }
  if (section.nodes.some((n) => !used.has(n.id))) return null
  return { root, groups }
}

function layoutBeside(
  section: EnvSection,
  plan: BesidePlan,
  width: number,
  minWidth: number,
): SectionScene | null {
  const { root, groups } = plan
  const k = groups.length
  const rootSize = boxSize(root, 0)
  const lanesEnd = rootSize.w + SIZE.besideLane + (k - 1) * SIZE.besideStep
  const colX = lanesEnd + SIZE.besideGap
  // The longest record titles (shared by the group) that fit at the narrowest width.
  const recLevels = Math.max(...groups.map((g) => g.record.title.length))
  const fnLevels = Math.max(...groups.map((g) => g.fn.title.length))
  let chosen: { rl: number; fl: number; colW: number } | null = null
  for (let rl = 0; rl < recLevels && !chosen; rl++)
    for (let fl = 0; fl < fnLevels && !chosen; fl++) {
      const colW = Math.max(
        ...groups.map((g) => boxSize(g.record, rl).w),
        ...groups.map((g) => boxSize(g.fn, fl).w),
      )
      if (colX + colW <= minWidth) chosen = { rl, fl, colW }
    }
  if (!chosen) return null
  const { rl, fl, colW } = chosen
  const fnW = Math.max(...groups.map((g) => boxSize(g.fn, fl).w))

  const placed = new Map<string, Placed>()
  let y = 0
  const fnCenter = new Map<string, number>()
  for (const g of groups) {
    const rs = boxSize(g.record, rl)
    placed.set(g.record.id, { node: g.record, rect: { x: colX, y, w: colW, h: rs.h }, title: rs.title })
    y += rs.h + SIZE.besideEnv
    const fs = boxSize(g.fn, fl)
    placed.set(g.fn.id, {
      node: g.fn,
      rect: { x: colX + Math.round((colW - fnW) / 2), y, w: fnW, h: fs.h },
      title: fs.title,
    })
    fnCenter.set(g.fn.id, y + fs.h / 2)
    y += fs.h + (g.fn.logs !== undefined ? SIZE.outputGap + SIZE.outputLine : 0) + SIZE.besideGroup
  }
  const columnBottom = y - SIZE.besideGroup

  // Drop the root so the rows naming the first function meet it level.
  const header = 2 * SIZE.headerPad + rootSize.title.length * SIZE.headerLine
  const rowCenter = (i: number) => header + i * SIZE.row + SIZE.row / 2
  const first = groups[0].fn.id
  const firstRows = root.bindings.flatMap((b, i) => ('ref' in b.value && b.value.ref === first ? [rowCenter(i)] : []))
  const mean = firstRows.reduce((a, b) => a + b, 0) / firstRows.length
  const rootY = Math.max(0, Math.round(fnCenter.get(first)! - mean))
  placed.set(root.id, {
    node: root,
    rect: { x: 0, y: rootY, w: rootSize.w, h: rootSize.h },
    title: rootSize.title,
  })

  const boxes = laidBoxes(section, placed)
  const rectOf = (id: string) => placed.get(id)!.rect
  const edges: LaidEdge[] = []
  for (const g of groups) {
    const F = rectOf(g.fn.id)
    const R = rectOf(g.record.id)
    const x = centerX(F)
    const id: EdgeId = `env:${g.fn.id}`
    edges.push(edgeOf(id, 'env', [{ x, y: F.y }, { x, y: bottom(R) }], false))
  }
  // Lanes: the lowest target takes the innermost lane, so no two references cross.
  const R = rectOf(root.id)
  const rows = boxes.find((b) => b.id === root.id)!.rows
  root.bindings.forEach((b, i) => {
    if (!('ref' in b.value)) return
    const gi = groups.findIndex((g) => g.fn.id === (b.value as { ref: string }).ref)
    const laneX = right(R) + SIZE.besideLane + (k - 1 - gi) * SIZE.besideStep
    const F = rectOf(groups[gi].fn.id)
    const fy = F.y + F.h / 2
    const dot = { x: right(R) - 14, y: rows[i].top + SIZE.row / 2 }
    const points = simplify([dot, { x: laneX, y: dot.y }, { x: laneX, y: fy }, { x: F.x, y: fy }])
    const id: EdgeId = `ref:${root.id}.${b.name}`
    edges.push({ ...edgeOf(id, 'ref', points, false), dot })
  })
  const contentBottom = Math.max(bottom(R), columnBottom)
  return finishScene(section, width, minWidth, boxes, edges, contentBottom, [0])
}

export function layoutSection(
  section: EnvSection,
  width: number,
  minWidth: number,
  extraBeforeLast = 0,
): SectionScene {
  const plan = besidePlan(section)
  const beside = plan && layoutBeside(section, plan, width, minWidth)
  if (beside) return beside
  const tiers = tiersOf(section)
  const levels = chooseLevels(section, tiers, minWidth)
  const contentW = width - lanesWidth(section)

  const fits = (pad: number) =>
    tiers.every((t) =>
      placeTier(
        t,
        new Map(t.map((n) => [n.id, boxSize(n, levels.get(n.id)!, pad).w])),
        contentW,
      ),
    )
  const fnPad = fits(SIZE.fnPad) ? SIZE.fnPad : SIZE.fnPadTight
  const sizes = new Map<string, { w: number; h: number; title: string[] }>()
  for (const n of section.nodes)
    sizes.set(n.id, boxSize(n, levels.get(n.id)!, fnPad))
  // Siblings share one width when the tier has room for it.
  for (const t of tiers) {
    const same = uniformWidths(
      t,
      new Map(t.map((n) => [n.id, sizes.get(n.id)!.w])),
    )
    const fits = equalColumns(
      t.map((n) => same.get(n.id)!),
      contentW,
    )
    if (fits) for (const n of t) sizes.get(n.id)!.w = same.get(n.id)!
  }

  // Vertical: tier tops.
  const tierTops: number[] = []
  let y = 0
  tiers.forEach((tier, i) => {
    if (i === tiers.length - 1) y += extraBeforeLast
    tierTops.push(y)
    const converges = tier.some(
      (n) =>
        section.nodes.filter((k) => isFunction(k) && k.env === n.id).length > 1,
    )
    y +=
      Math.max(...tier.map((n) => sizes.get(n.id)!.h)) +
      (i < tiers.length - 1 ? (converges ? SIZE.convergeGap : SIZE.tierGap) : 0)
  })
  const tierOf = new Map<string, number>()
  tiers.forEach((t, i) => t.forEach((n) => tierOf.set(n.id, i)))

  // Horizontal: the busiest tier sets the columns; others follow their links.
  const placed = new Map<string, Placed>()
  const put = (n: EnvNode, x: number, w: number) =>
    placed.set(n.id, {
      node: n,
      rect: { x: Math.round(x), y: tierTops[tierOf.get(n.id)!], w: Math.round(w), h: sizes.get(n.id)!.h },
      title: sizes.get(n.id)!.title,
    })
  const a = anchorIndex(tiers)
  const anchor = placeTier(
    tiers[a],
    new Map(tiers[a].map((n) => [n.id, sizes.get(n.id)!.w])),
    contentW,
  )
  if (!anchor)
    throw new Error(`${section.id}: tier ${a} does not fit in ${contentW}px`)
  tiers[a].forEach((n, i) => put(n, anchor.x[i], anchor.w[i]))

  for (let t = a - 1; t >= 0; t--) {
    const items = tiers[t].map((n) => {
      const kids = kidsOf(section, n.id).filter((k) => placed.has(k.id))
      const kidRects = kids.map((k) => placed.get(k.id)!.rect)
      const own = sizes.get(n.id)!.w
      const recordKids = kids.filter(isRecord)
      if (recordKids.length >= 2) {
        const left = Math.min(...kidRects.map((r) => r.x))
        const span = Math.max(...kidRects.map(right)) - left
        const w = Math.max(own, span)
        return { id: n.id, w, center: left + span / 2 }
      }
      const center = kidRects.length
        ? kidRects.reduce((s, r) => s + centerX(r), 0) / kidRects.length
        : contentW / 2
      return { id: n.id, w: own, center }
    })
    const xs = resolveRow(items, contentW)
    if (!xs) throw new Error(`${section.id}: tier ${t} does not fit in ${contentW}px`)
    for (const it of items)
      put(tiers[t].find((n) => n.id === it.id)!, xs.get(it.id)!, it.w)
  }
  for (let t = a + 1; t < tiers.length; t++) {
    const items = tiers[t].map((n) => {
      const parent = parentOf(section, n)
      const p = parent ? placed.get(parent) : undefined
      return {
        id: n.id,
        w: sizes.get(n.id)!.w,
        center: p ? centerX(p.rect) : contentW / 2,
      }
    })
    const xs = resolveRow(items, contentW)
    if (!xs) throw new Error(`${section.id}: tier ${t} does not fit in ${contentW}px`)
    for (const it of items)
      put(tiers[t].find((n) => n.id === it.id)!, xs.get(it.id)!, it.w)
  }

  const boxes = laidBoxes(section, placed)
  const rectOf = (id: string) => placed.get(id)!.rect

  // Edges: environment and outer links enter the bottom of their target.
  const edges: LaidEdge[] = []
  const incoming = new Map<
    string,
    { id: EdgeId; kind: 'env' | 'outer'; from: Rect; dashed: boolean }[]
  >()
  for (const n of section.nodes) {
    let target: string | null = null
    let id: EdgeId | null = null
    let kind: 'env' | 'outer' = 'env'
    if (isFunction(n)) {
      target = n.env
      id = `env:${n.id}`
    } else if (
      isRecord(n) &&
      n.outer &&
      placed.has(n.outer) &&
      n.drawOuter !== false
    ) {
      target = n.outer
      id = `outer:${n.id}`
      kind = 'outer'
    }
    if (!target || !id) continue
    const list = incoming.get(target) ?? []
    list.push({
      id,
      kind,
      from: rectOf(n.id),
      dashed: isRecord(n) && Boolean(n.unused),
    })
    incoming.set(target, list)
  }
  for (const [target, list] of incoming) {
    const T = rectOf(target)
    list.sort((p, q) => centerX(p.from) - centerX(q.from))
    const inside = (x: number) => x >= T.x + 12 && x <= right(T) - 12
    const allInside = list.every((e) => inside(centerX(e.from)))
    const spacing =
      list.length > 1 ? Math.min(20, (T.w - 24) / (list.length - 1)) : 0
    list.forEach((e, i) => {
      const sx = centerX(e.from)
      const sy = e.from.y
      const spread = centerX(T) + (i - (list.length - 1) / 2) * spacing
      // A jog shorter than two corner radii reads as a kink (F-ER-08): enter
      // straight above the source instead, which stays 12 px clear of the
      // neighbouring entries.
      const px = allInside || (Math.abs(spread - sx) < 8 && inside(sx)) ? sx : spread
      const ty = bottom(T)
      const mid = Math.round(ty + (sy - ty) / 2)
      const points =
        Math.abs(px - sx) < 0.5
          ? [
              { x: sx, y: sy },
              { x: sx, y: ty },
            ]
          : [
              { x: sx, y: sy },
              { x: sx, y: mid },
              { x: px, y: mid },
              { x: px, y: ty },
            ]
      edges.push(edgeOf(e.id, e.kind, points, e.dashed))
    })
  }

  // Reference arrows: out of the value cell to a lane on the right, down
  // under the lowest tier, then up into the target. Lanes are ordered so no
  // two references cross: the rightmost target gets the innermost lane.
  const targets = refTargets(section).sort(
    (p, q) => centerX(rectOf(q)) - centerX(rectOf(p)),
  )
  const lowest = Math.max(...boxes.map((b) => bottom(b.rect)))
  for (const r of section.nodes.filter(isRecord)) {
    const R = rectOf(r.id)
    r.bindings.forEach((b, i) => {
      if (!('ref' in b.value)) return
      const k = targets.indexOf(b.value.ref)
      const T = rectOf(b.value.ref)
      const laneX = contentW + SIZE.laneMargin + k * SIZE.lane
      const busY = lowest + SIZE.busTop + k * SIZE.busStep
      const row = boxes.find((x) => x.id === r.id)!.rows[i]
      const dot = { x: right(R) - 14, y: row.top + SIZE.row / 2 }
      const points = [
        dot,
        { x: laneX, y: dot.y },
        { x: laneX, y: busY },
        { x: centerX(T), y: busY },
        { x: centerX(T), y: bottom(T) },
      ]
      const id: EdgeId = `ref:${r.id}.${b.name}`
      edges.push({
        ...edgeOf(id, 'ref', points, false),
        dot,
      })
    })
  }

  let contentBottom = lowest
  if (targets.length)
    contentBottom = Math.max(
      contentBottom,
      lowest + SIZE.busTop + (targets.length - 1) * SIZE.busStep + 2,
    )
  return finishScene(section, width, minWidth, boxes, edges, contentBottom, tierTops)
}

function laidBoxes(section: EnvSection, placed: Map<string, Placed>): LaidBox[] {
  return section.nodes.map((n) => {
    const p = placed.get(n.id)!
    const nameWidth = isRecord(n)
      ? Math.ceil(Math.max(0, ...n.bindings.map((x) => textWidth(x.name, SIZE.value))) + 2 * SIZE.cellPad)
      : 0
    const rows: LaidRow[] = isRecord(n)
      ? n.bindings.map((b, i) => ({
          name: b.name,
          value: b.uninitialized ? '‹uninitialized›' : 'text' in b.value ? b.value.text : null,
          uninitialized: b.uninitialized,
          top: p.rect.y + 2 * SIZE.headerPad + p.title.length * SIZE.headerLine + i * SIZE.row,
          nameWidth,
        }))
      : []
    return {
      id: n.id,
      kind: n.kind,
      rect: p.rect,
      title: p.title,
      rows,
      unused: isRecord(n) ? n.unused : undefined,
    }
  })
}

/** Outputs under the functions that logged, one label per link kind, the note. */
function finishScene(
  section: EnvSection,
  width: number,
  minWidth: number,
  boxes: LaidBox[],
  edges: LaidEdge[],
  contentBottomIn: number,
  tierTops: number[],
): SectionScene {
  const rectOf = (id: string) => boxes.find((b) => b.id === id)!.rect
  const texts: LaidText[] = []
  let contentBottom = contentBottomIn
  for (const n of section.nodes.filter(isFunction)) {
    if (n.logs === undefined) continue
    const F = rectOf(n.id)
    const text = `› ${n.logs}`
    const w = textWidth(text, SIZE.value)
    const top = bottom(F) + SIZE.outputGap
    texts.push({
      kind: 'output',
      text,
      node: n.id,
      x: centerX(F),
      y: top + 14,
      anchor: 'middle',
      rect: { x: centerX(F) - w / 2, y: top, w, h: SIZE.outputLine },
    })
    contentBottom = Math.max(contentBottom, top + SIZE.outputLine)
  }

  // One label per link kind, wherever it collides with nothing.
  placeLabels(edges, boxes, texts, width)

  let height = contentBottom
  if (section.note) {
    // A legend, not code: upright sans 12/16 (D22), after a hatch swatch
    // when the note explains the hatch. It wraps at a width fixed per
    // variant (so every width keeps one height), and sits under the mark it
    // explains: right-aligned to the hatched record's column (R2 critique
    // F-CL-06), so "no function is saved" is read beside "no ƒ".
    const indent = section.noteMark === 'hatch' ? SIZE.swatch + SIZE.swatchGap : 0
    const noteLines = wrapByWidth(section.note, Math.min(SIZE.noteMax, minWidth) - indent, (t) =>
      sansWidth(t, SIZE.label),
    )
    const blockW = Math.ceil(indent + Math.max(...noteLines.map((l) => sansWidth(l, SIZE.label))))
    const mark = section.noteMark === 'hatch' ? boxes.find((b) => b.unused) : undefined
    const x0 = mark ? Math.max(0, Math.min(width - blockW, right(mark.rect) - blockW)) : 0
    let top = height + SIZE.noteGap
    for (const line of noteLines) {
      texts.push({
        kind: 'note',
        text: line,
        x: x0 + indent,
        y: top + 12,
        anchor: 'start',
        rect: { x: x0 + indent, y: top, w: sansWidth(line, SIZE.label), h: SIZE.noteLine },
      })
      top += SIZE.noteLine
    }
    height = top
  }

  return {
    id: section.id,
    width,
    height: Math.ceil(height),
    boxes,
    edges,
    texts,
    tierTops,
    noteMark: section.note ? section.noteMark : undefined,
  }
}

/** The nodes an edge joins, for `data-from` and `data-to` (the stress harness reads them). */
export function edgeEnds(section: EnvSection, id: EdgeId): { from: string; to: string; binding?: string } {
  const [kind, rest] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)]
  if (kind === 'env') {
    const fn = section.nodes.find((n) => n.id === rest)
    return { from: rest, to: fn && isFunction(fn) ? fn.env : '' }
  }
  if (kind === 'outer') {
    const rec = section.nodes.find((n) => n.id === rest)
    return { from: rest, to: rec && isRecord(rec) ? (rec.outer ?? '') : '' }
  }
  const dot = rest.indexOf('.')
  const recId = rest.slice(0, dot)
  const name = rest.slice(dot + 1)
  const rec = section.nodes.find((n) => n.id === recId)
  const b = rec && isRecord(rec) ? rec.bindings.find((x) => x.name === name) : undefined
  return { from: recId, to: b && 'ref' in b.value ? b.value.ref : '', binding: name }
}

function edgeOf(
  id: EdgeId,
  kind: LaidEdge['kind'],
  points: Point[],
  dashed: boolean,
): LaidEdge {
  return {
    id,
    kind,
    points,
    d: routePath(points, 8, 2),
    head: arrowHead(points),
    dashed,
  }
}

/**
 * One word per link kind at every width and in every section (R2 critique
 * F-CL-05: a learner on a phone and one on a laptop read the same word).
 * `[[Environment]]` fits only where the columns are wide, so the drawing
 * says `env`; "Diagram as text" and each function's name spell it out.
 */
export const LABELS = { env: 'env', outer: 'outer' } as const

/** The node a link belongs to: its label lights with that node's path (R2M-14). */
const ownerOf = (id: EdgeId) => id.slice(id.indexOf(':') + 1).split('.')[0]

function placeLabels(
  edges: LaidEdge[],
  boxes: LaidBox[],
  texts: LaidText[],
  width: number,
) {
  const obstacles = (): Rect[] => [
    ...boxes.map((b) => ({
      x: b.rect.x - 4,
      y: b.rect.y - 4,
      w: b.rect.w + 8,
      h: b.rect.h + 8,
    })),
    ...edges.flatMap((e) => segments(e.points).map((s) => segmentBox(s, 3))),
    ...texts.map((t) => t.rect),
  ]
  for (const kind of ['outer', 'env'] as const) {
    const text = LABELS[kind]
    const w = textWidth(text, SIZE.label)
    const place = () => {
      for (const e of edges.filter((x) => x.kind === kind)) {
        // The segment entering the target, then the one leaving the source.
        const segs = segments(e.points).filter((s) => s.a.x === s.b.x)
        for (const s of [segs[segs.length - 1], segs[0]]) {
          if (!s) continue
          const y0 = Math.min(s.a.y, s.b.y)
          const len = Math.abs(s.a.y - s.b.y)
          if (len < 20) continue
          const top = Math.round(y0 + len / 2 - 8)
          for (const x of [s.a.x + SIZE.labelGap, s.a.x - SIZE.labelGap - w]) {
            const rect = { x, y: top, w, h: 16 }
            if (x < 0 || x + w > width) continue
            if (obstacles().some((o) => intersects(o, rect))) continue
            texts.push({ kind: 'label', text, edge: e.id, node: ownerOf(e.id), x, y: top + 12, anchor: 'start', rect })
            return
          }
        }
      }
    }
    place()
  }
}

// ---------------------------------------------------------------------------
// Diagram composition per variant.
// ---------------------------------------------------------------------------

export type Variant = 'narrow' | 'wide'

/**
 * Stage widths a static frame gets (spec §3.4, measured on a lesson page):
 * 288 (320 viewport) and 343 (375) below 768; 606 (768), 638 (1024) and 734
 * (the 768 px prose column from 1280) above. Each listed width gets its own
 * layout; widths in between centre the nearest smaller one.
 */
export const STAGE = {
  narrow: { min: 288, widths: [288, 343] },
  wide: { min: 606, widths: [606, 734] },
} as const
export const SECTION_GAP = { narrow: 32, wide: 16 } as const
/** Section heading: one line of code above each diagram. */
export const HEADING = { line: 20, gap: 8 } as const
/**
 * The one-line interaction hint above a figure that has functions (H3 R11):
 * sans 12/20 (`text-2xs`), the wording per input (hover or tap). The layout
 * test keeps both on one line at the narrowest stage.
 */
export const HINT = {
  line: 20,
  gap: 12,
  size: 12,
  hover: 'Hover a function to trace what it remembers.',
  tap: 'Tap a function to trace what it remembers.',
} as const
export const hasHint = (diagram: EnvDiagram) => diagram.sections.some((s) => s.nodes.some(isFunction))

/** Sections stack below 768 and sit side by side from 768 (at most two per row). */
export function sectionWidths(
  diagram: EnvDiagram,
  variant: Variant,
): SectionWidths {
  const cols = variant === 'narrow' ? 1 : Math.min(2, diagram.sections.length)
  const per = (w: number) =>
    Math.floor((w - (cols - 1) * SECTION_GAP.wide) / cols)
  return {
    min: per(STAGE[variant].min),
    widths: STAGE[variant].widths.map(per),
  }
}

export type DiagramScene = {
  variant: Variant
  columns: number
  /** One scene per section per sub-width, in `widths` order. */
  sections: { section: EnvSection; scenes: SectionScene[] }[]
  widths: readonly number[]
  /** Height of the whole stage for this variant. */
  height: number
}

/**
 * The layout for rendering: never throws. A diagram the layout rejects (the
 * authoring lint reports it first) renders as a short note that points to
 * "Diagram as text", so lesson data can never crash a page (VIZ-H A9).
 */
export function layoutDiagramSafe(
  diagram: EnvDiagram,
  variant: Variant,
): DiagramScene | { variant: Variant; failed: string; height: number } {
  try {
    return layoutDiagram(diagram, variant)
  } catch (e) {
    return { variant, failed: (e as Error).message, height: FAILED_HEIGHT }
  }
}
/** Two caption lines for the fallback note. */
export const FAILED_HEIGHT = 48

export function layoutDiagram(
  diagram: EnvDiagram,
  variant: Variant,
): DiagramScene {
  const { min, widths } = sectionWidths(diagram, variant)
  const columns =
    variant === 'narrow' ? 1 : Math.min(2, diagram.sections.length)
  const natural = diagram.sections.map((s) => layoutSection(s, min, min))
  const extra = diagram.sections.map((_, i) => {
    // Only sections that share a row line up their function rows.
    if (diagram.align !== 'bottom' || columns < 2) return 0
    const lastTop = (sc: SectionScene) => sc.tierTops[sc.tierTops.length - 1]
    return Math.max(...natural.map(lastTop)) - lastTop(natural[i])
  })
  const sections = diagram.sections.map((section, i) => ({
    section,
    scenes: widths.map((w) =>
      layoutSection(section, w, min, extra[i]),
    ),
  }))
  const sectionH = sections.map(
    (s) => HEADING.line + HEADING.gap + s.scenes[0].height,
  )
  let height = hasHint(diagram) ? HINT.line + HINT.gap : 0
  for (let i = 0; i < sectionH.length; i += columns) {
    const row = Math.max(...sectionH.slice(i, i + columns))
    height += row + (i > 0 ? SECTION_GAP[variant] : 0)
  }
  return { variant, columns, sections, widths, height }
}
