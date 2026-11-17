import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import {
  FOREST,
  HEAP,
  HIT,
  INTERVAL,
  REC,
  ROW,
  SEG,
  TAG,
  hitText,
  idxText,
  layoutForest,
  layoutHeap,
  layoutInterval,
  layoutRecursion,
  layoutSegment,
  rangeText,
  smallW,
  sumText,
  tagText,
  tagWidth,
  type ArrayRowGeometry,
  type DsaPanel,
  type ForestPanel,
  type HeapPanel,
  type IntervalPanel,
  type RecursionPanel,
  type SegmentPanel,
} from './dsa'
import { SIZE } from './layout'
import { HEAD_LEGEND, MARK_EDGE, Notes, Svg, px, r1 } from './parts'

/**
 * The wave 4A panels of the annotated-tree substrate, in its vocabulary: a
 * node is the glyph fill with the `line` outline and its value in mono 13;
 * an edge is the 1.5 px connector; labels and notes are mono 12; each
 * panel's one mark family is the neutral `changed` role (`.vz-ch` for a box
 * or a cell, `.vz-cm` at 2.5 px for an edge). A node the call never needed
 * (a disjoint range) is a dashed ghost; a cell-to-node link is the hairline.
 */

function Legend({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <text key={i} x={0} y={HEAD_LEGEND + i * SIZE.line} className="vz-m vz-12" data-viz-part="legend">
          {l}
        </text>
      ))}
    </>
  )
}

/** A cell of the shared array row: the glyph (or the changed mark) with its value centred. */
function Cell({ x, y, w, value, changed, data }: { x: number; y: number; w: number; value: string | number; changed?: boolean; data: Record<string, string | number | undefined> }) {
  return (
    <g data-changed={changed ? '' : undefined} {...data}>
      <rect
        x={px(x - w / 2)}
        y={px(y)}
        width={w - 1}
        height={ROW.cell.h - 1}
        rx={radius.chip.px}
        className={changed ? 'vz-ch' : 'vz-g'}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
      />
      <text x={r1(x)} y={r1(y + ROW.cell.h / 2 + 4.5)} className="vz-c">
        {value}
      </text>
    </g>
  )
}

/** The shared array-cells row: index header, gutter names, cells centred at `xs`. */
function ArrayRows({
  g,
  xs,
  w,
  header,
  rows,
  part,
}: {
  g: ArrayRowGeometry
  xs: number[]
  w: number
  header: (string | number)[]
  rows: { name: string; values: (string | number)[]; changed?: number[] }[]
  part: string
}) {
  const gutter = xs[0] - w / 2 - ROW.gutterGap
  return (
    <g data-viz-part={part} data-array="">
      {g.headerY !== null ? (
        <g className="vz-m vz-12" data-viz-part="index">
          {header.map((h, k) => (
            <text key={k} x={r1(xs[k])} y={g.headerY!} className="vz-c">
              {h}
            </text>
          ))}
        </g>
      ) : null}
      {rows.map((row, r) => (
        <g key={row.name} data-row={row.name}>
          {row.name ? (
            <text x={r1(gutter)} y={r1(g.rowY[r] + ROW.cell.h / 2 + 4)} textAnchor="end" className="vz-u" data-viz-part="row-name">
              {row.name}
            </text>
          ) : null}
          {row.values.map((v, k) => (
            <Cell key={k} x={xs[k]} y={g.rowY[r]} w={w} value={v} changed={row.changed?.includes(k)} data={{ 'data-cell': `${row.name}:${k}`, 'data-value': v }} />
          ))}
        </g>
      ))}
    </g>
  )
}

/** The cell-to-node link of the shared row: the hairline, from the node's bottom to the cell's top. */
function Link({ x1, y1, x2, y2, k, bend = y1 }: { x1: number; y1: number; x2: number; y2: number; k: number; bend?: number }) {
  // Straight down from the node to `bend` (below every node), then an S-curve into the cell from above:
  // the links cross only in that band, never through a node.
  const b = Math.max(y1, bend)
  const m = (b + y2) / 2
  const d =
    Math.abs(x2 - x1) < 0.5
      ? `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`
      : `M${r1(x1)} ${r1(y1)}L${r1(x1)} ${r1(b)}C${r1(x1)} ${r1(m)} ${r1(x2)} ${r1(m)} ${r1(x2)} ${r1(y2)}`
  return <path d={d} className="vz-l vz-d" fill="none" strokeWidth={strokeWidth.outline} data-link={k} />
}

/** The shared lazy-tag mark: a changed pill with `+v`, left edge at x, centred on y. */
function LazyTag({ x, y, v }: { x: number; y: number; v: number }) {
  const w = tagWidth(v)
  return (
    <g data-viz-part="lazy-tag" data-tag={v}>
      <rect x={px(x)} y={px(y - TAG.h / 2)} width={w - 1} height={TAG.h - 1} rx={radius.chip.px} className="vz-ch" strokeWidth={strokeWidth.mark} />
      <text x={r1(x + w / 2)} y={r1(y + 4)} className="vz-c vz-u">
        {tagText(v)}
      </text>
    </g>
  )
}

/** The shared memo-hit leaf: a small changed box naming the memo cell the call returned. */
function MemoHit({ cx, cy, n, w }: { cx: number; cy: number; n: number; w: number }) {
  return (
    <>
      <rect x={px(cx - w / 2)} y={px(cy - HIT.h / 2)} width={Math.round(w) - 1} height={HIT.h - 1} rx={radius.chip.px} className="vz-ch" strokeWidth={strokeWidth.mark} />
      <text x={r1(cx)} y={r1(cy + 4)} className="vz-c vz-u" data-viz-part="memo-hit">
        {hitText(n)}
      </text>
    </>
  )
}

// ---------------------------------------------------------------------------

export function SegmentSvg({ p }: { p: SegmentPanel }) {
  const g = layoutSegment(p)
  const by = new Map(p.nodes.map((n) => [n.idx, n]))
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <Legend lines={p.legend} />
      {g.edges.map((e) => {
        const a = g.boxes[e.from]
        const b = g.boxes[e.to]
        const lit = p.mark === 'path' && by.get(e.from)!.path && by.get(e.to)!.path
        return (
          <g key={e.to} data-edge={`${e.from}-${e.to}`} data-from={e.from} data-to={e.to} data-changed={lit ? '' : undefined} className={lit ? 'vz-cm' : undefined} style={lit ? MARK_EDGE : undefined}>
            <path d={`M${r1(a.cx)} ${r1(a.y + SEG.h)}L${r1(b.cx)} ${r1(b.y)}`} className={clsx('vz-e', p.mark === 'cover' && by.get(e.to)!.cover === 'disjoint' && 'vz-d')} />
          </g>
        )
      })}
      {p.nodes.map((n) => {
        const b = g.boxes[n.idx]
        const ghost = p.mark === 'cover' && n.cover === 'disjoint'
        const lit = (p.mark === 'cover' && n.cover === 'full') || (p.mark === 'path' && n.path)
        const [r0, r1_, r2] = SEG.rows
        const idxW = smallW(idxText(n))
        const rowW = idxW + (n.tag ? TAG.gap + tagWidth(n.tag) : 0)
        const idxX = b.cx - rowW / 2
        return (
          <g
            key={n.idx}
            data-node={n.idx}
            data-range={`${n.start},${n.end}`}
            data-sum={n.sum}
            data-was={n.was}
            data-cover={n.cover}
            data-tag={n.tag}
            data-path={n.path ? '' : undefined}
            data-changed={lit ? '' : undefined}
          >
            <rect
              x={px(b.x)}
              y={px(b.y)}
              width={Math.round(b.w) - 1}
              height={SEG.h - 1}
              rx={radius.chip.px}
              className={ghost ? 'vz-l vz-d' : lit ? 'vz-ch' : 'vz-g'}
              fill={ghost ? 'none' : undefined}
              strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={r1(b.cx)} y={r1(b.y + r0)} className="vz-c vz-m vz-12" data-viz-part="range">
              {rangeText(n)}
            </text>
            <text x={r1(b.cx)} y={r1(b.y + r1_)} className={clsx('vz-c', ghost && 'vz-m')} data-viz-part="sum">
              {sumText(n)}
            </text>
            <text x={r1(idxX)} y={r1(b.y + r2)} className="vz-m vz-12" data-viz-part="index">
              {idxText(n)}
            </text>
            {n.tag ? <LazyTag x={idxX + idxW + TAG.gap} y={b.y + r2 - 4} v={n.tag} /> : null}
          </g>
        )
      })}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function ForestSvg({ p }: { p: ForestPanel }) {
  const g = layoutForest(p)
  const lit = new Set(p.changed)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <g data-viz-part="links">
        {g.at.map((a, i) => (
          <Link key={i} k={i} x1={a.x} y1={a.y + FOREST.r + 2} x2={g.colX[i]} y2={g.rows.headerY! - 13} />
        ))}
      </g>
      {g.arrows.map((a) => {
        const on = lit.has(a.from)
        return (
          <g key={a.from} data-edge={`${a.from}-${a.to}`} data-from={a.from} data-to={a.to} data-changed={on ? '' : undefined} className={on ? 'vz-cm' : undefined} style={on ? MARK_EDGE : undefined}>
            <path d={a.d} className="vz-e" />
            <path d={a.head} className="vz-ah" />
          </g>
        )
      })}
      {g.at.map((a, i) => {
        const on = lit.has(i)
        return (
          <g key={i} data-node={i} data-parent={p.parent[i]} data-depth={a.depth} data-root={p.parent[i] === i ? '' : undefined} data-changed={on ? '' : undefined}>
            <circle cx={r1(a.x)} cy={r1(a.y)} r={FOREST.r} className={on ? 'vz-ch' : 'vz-g'} strokeWidth={on ? strokeWidth.mark : strokeWidth.outline} />
            <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
              {i}
            </text>
          </g>
        )
      })}
      <ArrayRows g={g.rows} xs={g.colX} w={FOREST.cellW} header={p.parent.map((_, i) => i)} rows={p.rows} part="arrays" />
      <text x={r1(g.colX[0] - FOREST.cellW / 2 - ROW.gutterGap)} y={g.rows.headerY!} textAnchor="end" className="vz-m vz-12">
        i
      </text>
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function HeapSvg({ p }: { p: HeapPanel }) {
  const g = layoutHeap(p)
  const c = p.compare
  const litNode = (i: number) => (c ? (c.smaller === null ? i === c.at : i === c.smaller) : false)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <g data-viz-part="links">
        {g.at.map((a, i) => (
          <Link key={i} k={i} x1={a.x} y1={a.y + HEAP.r + 2} x2={g.cellX[i]} y2={g.rows.headerY! - 13} bend={g.bend} />
        ))}
      </g>
      {p.heap.map((_, i) => {
        if (i === 0) return null
        const parent = Math.floor((i - 1) / 2)
        const a = g.at[parent]
        const b = g.at[i]
        const on = Boolean(c && c.smaller !== null && parent === c.at && i === c.smaller)
        const l = Math.hypot(b.x - a.x, b.y - a.y)
        const ux = (b.x - a.x) / l
        const uy = (b.y - a.y) / l
        return (
          <g key={i} data-edge={`${parent}-${i}`} data-from={parent} data-to={i} data-changed={on ? '' : undefined} className={on ? 'vz-cm' : undefined} style={on ? MARK_EDGE : undefined}>
            <path d={`M${r1(a.x + ux * HEAP.r)} ${r1(a.y + uy * HEAP.r)}L${r1(b.x - ux * HEAP.r)} ${r1(b.y - uy * HEAP.r)}`} className="vz-e" />
          </g>
        )
      })}
      {g.formulas.map((f) => (
        <text key={f.text} x={r1(f.x)} y={r1(f.y)} textAnchor={f.anchor} className="vz-m vz-12" data-viz-part="formula">
          {f.text}
        </text>
      ))}
      {p.heap.map((v, i) => {
        const a = g.at[i]
        const on = litNode(i)
        return (
          <g key={i} data-node={i} data-value={v} data-compared={c && (c.at === i || c.kids.includes(i)) ? '' : undefined} data-changed={on ? '' : undefined}>
            <circle cx={r1(a.x)} cy={r1(a.y)} r={HEAP.r} className={on ? 'vz-ch' : 'vz-g'} strokeWidth={on ? strokeWidth.mark : strokeWidth.outline} />
            <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
              {v}
            </text>
          </g>
        )
      })}
      <ArrayRows
        g={g.rows}
        xs={g.cellX}
        w={HEAP.cellW}
        header={p.heap.map((_, i) => i)}
        rows={[{ name: '', values: p.heap, changed: p.heap.map((_, i) => i).filter(litNode) }]}
        part="array"
      />
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function RecursionSvg({ p }: { p: RecursionPanel }) {
  const g = layoutRecursion(p)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <Legend lines={p.legend} />
      {p.nodes.map((n) => {
        if (!n.parent) return null
        const a = g.at[n.parent]
        const b = g.at[n.id]
        const l = Math.hypot(b.x - a.x, b.y - a.y)
        const ux = (b.x - a.x) / l
        const uy = (b.y - a.y) / l
        // A memo-hit leaf is a box: the edge stops at its top.
        const end = n.hit ? { x: b.x - (ux * (HIT.h / 2)) / Math.max(uy, 0.01), y: b.y - HIT.h / 2 } : { x: b.x - ux * REC.r, y: b.y - uy * REC.r }
        return (
          <g key={n.id} data-edge={`${n.parent}-${n.id}`} data-from={n.parent} data-to={n.id}>
            <path d={`M${r1(a.x + ux * REC.r)} ${r1(a.y + uy * REC.r)}L${r1(end.x)} ${r1(end.y)}`} className="vz-e" />
          </g>
        )
      })}
      {p.nodes.map((n) => {
        const a = g.at[n.id]
        if (n.hit)
          return (
            <g key={n.id} data-node={n.id} data-n={n.n} data-hit="" data-changed="">
              <MemoHit cx={a.x} cy={a.y} n={n.n} w={smallW(hitText(n.n)) + 2 * HIT.pad} />
            </g>
          )
        return (
          <g key={n.id} data-node={n.id} data-n={n.n} data-repeat={n.repeat ? '' : undefined} data-changed={n.repeat ? '' : undefined}>
            <circle cx={r1(a.x)} cy={r1(a.y)} r={REC.r} className={n.repeat ? 'vz-ch' : 'vz-g'} strokeWidth={n.repeat ? strokeWidth.mark : strokeWidth.outline} />
            <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
              {n.n}
            </text>
          </g>
        )
      })}
      {g.memo && p.memo ? (
        <ArrayRows
          g={g.memo.rows}
          xs={g.memo.cellX}
          w={REC.cellW}
          header={p.memo.map((m) => m.n)}
          rows={[
            { name: 'memo', values: p.memo.map((m) => m.value) },
            { name: 'write', values: p.memo.map((_, k) => k + 1) },
          ]}
          part="memo"
        />
      ) : null}
      {g.memo ? (
        <text x={r1(g.memo.cellX[0] - REC.cellW / 2 - ROW.gutterGap)} y={g.memo.rows.headerY!} textAnchor="end" className="vz-m vz-12">
          n
        </text>
      ) : null}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function IntervalSvg({ p }: { p: IntervalPanel }) {
  const g = layoutInterval(p)
  const n = p.s.length
  const cw = INTERVAL.cell.w
  const ch = INTERVAL.cell.h
  const [ti, tj] = p.target
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <Legend lines={p.legend} />
      <g className="vz-m vz-12" data-viz-part="axes">
        <text x={INTERVAL.gutter - 8} y={g.headerY[0]} textAnchor="end">
          j
        </text>
        {[...p.s].map((c, j) => (
          <g key={j}>
            <text x={r1(g.x[j] + cw / 2)} y={g.headerY[0]} className="vz-c">
              {j}
            </text>
            <text x={r1(g.x[j] + cw / 2)} y={g.headerY[1]} className="vz-c vz-u">
              {c}
            </text>
          </g>
        ))}
        {[...p.s].map((c, i) => (
          <text key={i} x={INTERVAL.gutter - 8} y={r1(g.y[i] + ch / 2 + 4)} textAnchor="end">
            {`${i} `}
            <tspan className="vz-u">{c}</tspan>
          </text>
        ))}
      </g>
      {p.cells.map((c) => {
        const on = c.i === ti && c.j === tj
        const base = c.i === c.j
        const text = p.show === 'value' ? String(c.value) : base ? 'base' : String(c.order)
        return (
          <g key={`${c.i},${c.j}`} data-node={`${c.i},${c.j}`} data-cell={`${c.i},${c.j}`} data-value={c.value} data-order={c.order} data-changed={on ? '' : undefined}>
            <rect
              x={px(g.x[c.j])}
              y={px(g.y[c.i])}
              width={cw - 1}
              height={ch - 1}
              rx={radius.chip.px}
              className={on ? 'vz-ch' : 'vz-g'}
              strokeWidth={on ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={r1(g.x[c.j] + cw / 2)} y={r1(g.y[c.i] + ch / 2 + 4.5)} className={clsx('vz-c', p.show === 'order' && base && 'vz-m vz-12')}>
              {text}
            </text>
          </g>
        )
      })}
      {g.arrows.map((a) => (
        <g
          key={`${a.to}`}
          data-edge={`${ti},${tj}-${a.to.join(',')}`}
          data-from={`${ti},${tj}`}
          data-to={a.to.join(',')}
          data-used={a.used ? '' : undefined}
          data-changed={a.used ? '' : undefined}
          className={a.used ? 'vz-cm' : undefined}
          style={a.used ? MARK_EDGE : undefined}
        >
          <path d={a.d} className="vz-e" />
          <path d={a.head} className="vz-ah" />
        </g>
      ))}
      <g data-viz-part="empty" className="vz-m vz-12">
        <text x={r1(g.empty.x)} y={r1(g.empty.y)}>
          {n > 3 ? 'i > j: empty interval' : 'i > j: empty'}
        </text>
      </g>
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

export function DsaSvg({ p }: { p: DsaPanel }) {
  if (p.kind === 'segment') return <SegmentSvg p={p} />
  if (p.kind === 'forest') return <ForestSvg p={p} />
  if (p.kind === 'heap') return <HeapSvg p={p} />
  if (p.kind === 'recursion') return <RecursionSvg p={p} />
  return <IntervalSvg p={p} />
}
