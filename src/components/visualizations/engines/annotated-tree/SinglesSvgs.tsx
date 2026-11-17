import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import { arrowHead, routePath } from '../../substrates/box-arrow'
import { CALLS, callLabel, layoutCalls, underText } from './calls'
import { GRAPH, layoutGraph } from './graph'
import { GRID, cellLabel, layoutGrid } from './grid'
import { SIZE } from './layout'
import type { CallPanel, GraphPanel, GridPanel } from './model'
import { HEAD_LEGEND, MARK_EDGE, Notes, Svg, px, r1 } from './parts'

/**
 * The wave 3A panels of the annotated-tree substrate, in its vocabulary: a
 * node is the glyph fill with the `line` outline and its value in mono 13;
 * an edge is the 1.5 px connector; labels and notes are mono 12; printed
 * output is the result amber; each panel's one mark family is the neutral
 * `changed` role (`.vz-ch` for a box, `.vz-cm` at 2.5 px for an edge). A cut
 * call is a dashed ghost with its reason in words; a well is a dashed edge.
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

// ---------------------------------------------------------------------------

export function CallsSvg({ p, variant, className }: { p: CallPanel; variant: 'narrow' | 'wide'; className: string }) {
  const g = layoutCalls(p, variant)
  return (
    <Svg width={g.width} height={g.height} id={`${p.id}-${variant}`} heading={p.heading} className={className}>
      <Legend lines={p.legend} />
      {g.edges.map((e) => {
        const n = p.nodes.find((x) => x.id === e.to)!
        return (
          <g key={e.to} data-edge={`${n.parent}-${e.to}`} data-from={n.parent} data-to={e.to} data-kind={n.edge}>
            <path d={routePath(e.points, CALLS.corner)} className="vz-e" />
          </g>
        )
      })}
      {g.edges.map((e) =>
        e.label ? (
          <text key={e.to} x={r1(e.label.x)} y={r1(e.label.y)} textAnchor="end" className="vz-m vz-12" data-viz-part="take" data-for={e.to}>
            {e.label.text}
          </text>
        ) : null,
      )}
      {p.nodes.map((n) => {
        const b = g.boxes[n.id]
        const cut = n.end?.kind === 'cut'
        const answer = n.end?.kind === 'answer'
        const cx = r1(b.x + b.w / 2)
        return (
          <g key={n.id} data-node={n.id} data-i={n.i} data-s={n.s} data-t={n.t.join(',')} data-end={n.end?.kind} data-changed={answer ? '' : undefined}>
            <rect
              x={px(b.x)}
              y={px(b.y)}
              width={Math.round(b.w) - 1}
              height={CALLS.box - 1}
              rx={radius.chip.px}
              className={cut ? 'vz-l vz-d' : answer ? 'vz-ch' : 'vz-g'}
              fill={cut ? 'none' : undefined}
              strokeWidth={answer ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={cx} y={r1(b.y + CALLS.box / 2 + 4.5)} className={clsx('vz-c', cut && 'vz-m')}>
              {callLabel(n)}
            </text>
          </g>
        )
      })}
      {/* The line under each box (its path t, or a cut's reason), outside the box's group: it is wider than the box. */}
      <g data-viz-part="under">
        {p.nodes.map((n) => {
          const b = g.boxes[n.id]
          const cut = n.end?.kind === 'cut'
          const answer = n.end?.kind === 'answer'
          return (
            <text
              key={n.id}
              x={r1(b.x + b.w / 2)}
              y={r1(b.y + CALLS.under)}
              className={clsx('vz-c vz-12', answer ? 'vz-r' : cut ? 'vz-u' : 'vz-m')}
              data-viz-part={cut ? 'cut' : 'path'}
              data-for={n.id}
            >
              {underText(n)}
            </text>
          )
        })}
      </g>
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function GraphSvg({ p }: { p: GraphPanel }) {
  const g = layoutGraph(p)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {g.edges.map((e, k) => {
        const v = p.edges[k]
        const lit = v.accepted !== undefined
        return (
          <g
            key={`${e.a}-${e.b}`}
            data-edge={`${e.a}-${e.b}`}
            data-from={e.a}
            data-to={e.b}
            data-w={v.w}
            data-well={v.well ? '' : undefined}
            data-accepted={v.accepted}
            data-untried={v.untried ? '' : undefined}
            data-changed={lit ? '' : undefined}
            className={lit ? 'vz-cm' : undefined}
            style={lit ? MARK_EDGE : undefined}
          >
            <path d={`M${r1(e.x1)} ${r1(e.y1)}L${r1(e.x2)} ${r1(e.y2)}`} className={clsx('vz-e', v.well && 'vz-d')} />
          </g>
        )
      })}
      {g.edges.map((e, k) => (
        <text key={`${e.a}-${e.b}`} x={r1(e.label.x)} y={r1(e.label.y)} textAnchor={e.label.anchor} className="vz-u" data-viz-part="weight">
          {p.edges[k].w}
        </text>
      ))}
      {p.nodes.map((n) => {
        const a = g.at[n.id]
        if (n.source)
          return (
            <g key={n.id} data-node={n.id} data-source="">
              <rect
                x={px(a.x - a.w! / 2)}
                y={px(a.y - GRAPH.source.h / 2)}
                width={Math.round(a.w!) - 1}
                height={GRAPH.source.h - 1}
                rx={radius.glyph.px}
                className="vz-g"
                strokeWidth={strokeWidth.outline}
              />
              <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
                {n.label}
              </text>
            </g>
          )
        return (
          <g key={n.id} data-node={n.id}>
            <circle cx={r1(a.x)} cy={r1(a.y)} r={GRAPH.r} className="vz-g" strokeWidth={strokeWidth.outline} />
            <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
              {n.label}
            </text>
            {n.note ? (
              <text x={r1(a.x)} y={r1(a.y + GRAPH.noteDy)} className="vz-u vz-c" data-viz-part="node-note">
                {n.note}
              </text>
            ) : null}
          </g>
        )
      })}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

export function GridSvg({ p }: { p: GridPanel }) {
  const g = layoutGrid(p)
  const center = ([i, j]: [number, number]) => ({
    x: g.x[j] + GRID.cell.w / 2,
    y: g.y[i] + GRID.cell.h / 2,
  })
  const marked = (c: GridPanel['cells'][number]) => (p.mark === 'heap' ? c.state === 'heap' : p.mark === 'twice' ? c.state === 'twice' : false)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      <g data-viz-part="axes" className="vz-m vz-12">
        {/* An addition table: each cell is its row's value plus its column's. */}
        <text x={g.gutter - GRID.gutterGap} y={g.headerY} textAnchor="end" data-viz-part="corner">
          +
        </text>
        {p.cols.values.map((v, j) => (
          <text key={`c${j}`} x={r1(g.x[j] + GRID.cell.w / 2)} y={g.headerY} className="vz-c">
            {v}
          </text>
        ))}
        {p.rows.values.map((v, i) => (
          <text key={`r${i}`} x={g.gutter - GRID.gutterGap} y={r1(g.y[i] + GRID.cell.h / 2 + 4)} textAnchor="end">
            {v}
          </text>
        ))}
      </g>
      {p.cells.map((c) => {
        const lit = marked(c)
        const label = cellLabel(c)
        return (
          <g key={`${c.i},${c.j}`} data-node={`cell-${c.i}-${c.j}`} data-cell={`${c.i},${c.j}`} data-sum={c.sum} data-state={c.state} data-order={c.order} data-changed={lit ? '' : undefined}>
            <rect
              x={px(g.x[c.j])}
              y={px(g.y[c.i])}
              width={GRID.cell.w - 1}
              height={GRID.cell.h - 1}
              rx={radius.chip.px}
              className={lit ? 'vz-ch' : 'vz-g'}
              strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={r1(g.x[c.j] + GRID.cell.w / 2)} y={r1(g.y[c.i] + (label ? 16 : 23))} className={clsx('vz-c', !c.state && 'vz-m')}>
              {c.sum}
            </text>
            {label ? (
              <text
                x={r1(g.x[c.j] + GRID.cell.w / 2)}
                y={r1(g.y[c.i] + 31)}
                className={clsx('vz-c vz-12', c.state === 'heap' || c.state === 'twice' ? 'vz-u' : 'vz-m')}
                data-viz-part="cell-label"
              >
                {label}
              </text>
            ) : null}
          </g>
        )
      })}
      {p.arrows.map((a) => {
        const from = center(a.from)
        const to = center(a.to)
        const across = a.from[0] === a.to[0]
        const start = across
          ? { x: g.x[a.from[1]] + GRID.cell.w + GRID.arrowInset, y: from.y }
          : { x: from.x, y: g.y[a.from[0]] + GRID.cell.h + GRID.arrowInset }
        const end = across ? { x: g.x[a.to[1]] - GRID.arrowInset, y: to.y } : { x: to.x, y: g.y[a.to[0]] - GRID.arrowInset }
        // Under the twice mark only the arrows into the cell pushed twice are lit.
        const lit = p.mark === 'twice' && p.cells.some((c) => c.state === 'twice' && c.i === a.to[0] && c.j === a.to[1])
        return (
          <g
            key={`${a.from}-${a.to}`}
            data-edge={`${a.from.join(',')}-${a.to.join(',')}`}
            data-from={a.from.join(',')}
            data-to={a.to.join(',')}
            data-changed={lit ? '' : undefined}
            className={lit ? 'vz-cm' : undefined}
            style={lit ? MARK_EDGE : undefined}
          >
            <path d={`M${r1(start.x)} ${r1(start.y)}L${r1(end.x)} ${r1(end.y)}`} className="vz-e" />
            <path d={arrowHead([start, end])} className="vz-ah" />
          </g>
        )
      })}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}
