import { cn as clsx } from '../../primitives/cn'
import { strokeWidth } from '../../primitives/tokens-v3'
import { FLOW, layoutResidual, type ResidualPanel } from './flow'
import { SIZE } from './layout'
import { MARK_EDGE, Notes, Svg, r1 } from './parts'

/**
 * The residual-graph panel (wave 4B), in the substrate's vocabulary: a
 * vertex is the glyph fill with the `line` outline; an edge is the 1.5 px
 * connector with a filled head, its flow / capacity in mono 12 beside it; a
 * reverse residual is the same connector dashed. The one mark family is
 * the neutral `changed` role: the augmenting path's edges (`.vz-cm` at
 * 2.5 px, a reverse hop dashed), or the minimum cut, its source side a
 * shaded region (`.vz-ch`, dashed outline) under the drawing and the edges
 * that leave it marked.
 */

export function FlowSvg({ p, variant, legend, notes, className = 'block' }: { p: ResidualPanel; variant: 'narrow' | 'wide'; legend: number; notes: number; className?: string }) {
  const g = layoutResidual(p, variant, legend, notes)
  const id = p.wide ? `${p.id}-${variant}` : p.id
  return (
    <Svg width={g.width} height={g.height} id={id} heading={p.heading} className={className}>
      {p.legend.map((l, i) => (
        <text key={i} x={0} y={r1(g.legendTop + 12 + i * SIZE.line)} className="vz-m vz-12" data-viz-part="legend">
          {l}
        </text>
      ))}
      {g.hull ? <path d={g.hull} className="vz-ch vz-d" strokeWidth={strokeWidth.outline} data-viz-part="cut" data-changed="" /> : null}
      {g.edges.map((e, k) => {
        const v = p.edges[k]
        const lit = v.mark !== undefined
        const backLit = v.back?.mark === 'path'
        const showBack = p.reverse && (v.back?.residual ?? 0) > 0
        return (
          <g key={`${e.from}-${e.to}`}>
            <g
              data-edge={`${e.from}-${e.to}`}
              data-from={e.from}
              data-to={e.to}
              data-flow={v.flow}
              data-cap={v.cap}
              data-mark={v.mark}
              data-changed={lit ? '' : undefined}
              className={lit ? 'vz-cm' : undefined}
              style={lit ? MARK_EDGE : undefined}
            >
              <path d={`M${r1(e.line.x1)} ${r1(e.line.y1)}L${r1(e.line.x2)} ${r1(e.line.y2)}`} className="vz-e" />
              <path d={e.line.head} className="vz-ah" />
            </g>
            {showBack ? (
              <g
                data-edge={`${e.to}-${e.from}`}
                data-from={e.to}
                data-to={e.from}
                data-reverse=""
                data-residual={v.back!.residual}
                data-mark={backLit ? 'path' : undefined}
                data-changed={backLit ? '' : undefined}
                className={backLit ? 'vz-cm' : undefined}
                style={backLit ? MARK_EDGE : undefined}
              >
                <path d={`M${r1(e.back.x1)} ${r1(e.back.y1)}L${r1(e.back.x2)} ${r1(e.back.y2)}`} className="vz-e vz-d" />
                <path d={e.back.head} className="vz-ah" />
              </g>
            ) : null}
          </g>
        )
      })}
      {g.edges.map((e, k) => (
        <text
          key={`${e.from}-${e.to}`}
          x={r1(e.label.x)}
          y={r1(e.label.y + 4)}
          className={clsx('vz-c', p.edges[k].mark ? 'vz-t' : 'vz-u')}
          data-viz-part="flow"
          data-for={`${e.from}-${e.to}`}
        >
          {e.label.text}
        </text>
      ))}
      {p.nodes.map((n) => {
        const a = g.at[n.id]
        return (
          <g key={n.id} data-node={n.id} data-cut={p.cut?.includes(n.id) ? '' : undefined}>
            <circle cx={r1(a.x)} cy={r1(a.y)} r={FLOW.r} className="vz-g" strokeWidth={strokeWidth.outline} />
            <text x={r1(a.x)} y={r1(a.y + 4.5)} className="vz-c">
              {n.label}
            </text>
          </g>
        )
      })}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}
