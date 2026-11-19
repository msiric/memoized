import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import { arrowHead, routePath } from '../../substrates/box-arrow'
import { BOX, labelBox, smallW, tagBox, textBox, type BoxEdge, type BoxNode, type BoxesPanel } from './boxes'
import { SIZE } from './layout'
import { MARK_EDGE, Notes, Svg, px, r1 } from './parts'

/**
 * The `boxes` panel (wave 4D) in the substrate's vocabulary: a node is the
 * glyph fill with the `line` outline (a pill for an element that is not a
 * component or for a ref, a circle for a commit, no outline for a row of an
 * outline tree), its first line mono 13, the rest mono 12 secondary; an
 * edge is the 1.5 px connector with a filled head, dashed where the figure
 * says so, a word on it on a plate. The one mark family is the neutral
 * `changed` role: a node on the white/5 tint with the doubled zinc-300
 * edge (`.vz-ch`), an edge at 2.5 px (`.vz-cm`), a ref tag on the tint. A
 * ghost is a dashed outline with muted text; a node left out of a tree is
 * muted text struck through.
 */

const dataAttrs = (d?: Record<string, string | number>) => Object.fromEntries(Object.entries(d ?? {}).map(([k, v]) => [`data-${k}`, String(v)]))

function NodeGlyph({ n }: { n: BoxNode }) {
  const quiet = n.state === 'ghost' || n.state === 'gone'
  const lit = n.state === 'mark'
  const t = textBox(n)
  const cx = n.align === 'start' ? t.x : n.x + n.w / 2
  const anchor = n.align === 'start' ? 'start' : 'middle'
  const top = t.y + 10
  let outline = null
  if (n.shape === 'circle')
    outline = (
      <circle
        cx={r1(n.x + n.w / 2)}
        cy={r1(n.y + n.h / 2)}
        r={n.h / 2}
        className={n.state === 'ghost' ? 'vz-l vz-d' : lit ? 'vz-ch' : 'vz-g'}
        fill={n.state === 'ghost' ? 'none' : undefined}
        strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
      />
    )
  else if (n.shape === 'row')
    // A row's box (from 4 px before its text to 6 past it, where a link meets it): drawn only when marked, kept bare so the gates can measure it.
    outline = <rect x={px(n.x - 4)} y={px(n.y + 1)} width={Math.round(n.w + 10) - 1} height={n.h - 3} rx={radius.chip.px} className={lit ? 'vz-ch' : undefined} fill={lit ? undefined : 'none'} strokeWidth={lit ? strokeWidth.mark : 0} />
  else
    outline = (
      <rect
        x={px(n.x)}
        y={px(n.y)}
        width={Math.round(n.w) - 1}
        height={n.h - 1}
        rx={n.shape === 'pill' ? Math.floor(n.h / 2) : radius.chip.px}
        className={n.state === 'ghost' ? 'vz-l vz-d' : lit ? 'vz-ch' : 'vz-g'}
        fill={n.state === 'ghost' ? 'none' : undefined}
        strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
      />
    )
  return (
    <g data-node={n.id} data-state={n.state} data-changed={lit ? '' : undefined} data-shape={n.shape} {...dataAttrs(n.data)}>
      {outline}
      <text x={r1(cx)} y={r1(top + (n.lines.length > 1 ? 0 : 0.5))} textAnchor={anchor} className={clsx(quiet && 'vz-m')} data-viz-part="node-text">
        {n.lines.map((l, i) => (
          <tspan key={i} x={r1(cx)} dy={i ? 13 : 0} className={i ? (quiet ? 'vz-m vz-12' : 'vz-u') : n.small ? 'vz-12' : undefined}>
            {l}
          </tspan>
        ))}
      </text>
      {n.state === 'gone' ? <path d={`M${r1(t.x - 2)} ${r1(t.y + 7)}H${r1(t.x + t.w + 2)}`} className="vz-l" strokeWidth={strokeWidth.outline} data-viz-part="strike" /> : null}
    </g>
  )
}

function EdgeGlyph({ e }: { e: BoxEdge }) {
  const head = e.head !== false
  return (
    <g data-edge={e.id} data-from={e.from} data-to={e.to} data-dashed={e.dashed ? '' : undefined} data-changed={e.mark ? '' : undefined} className={e.mark ? 'vz-cm' : undefined} style={e.mark ? MARK_EDGE : undefined} {...dataAttrs(e.data)}>
      <path d={routePath(e.points, BOX.corner, head ? 2 : 0)} className={clsx('vz-e', e.dashed && 'vz-d')} />
      {head ? <path d={arrowHead(e.points)} className="vz-ah" /> : null}
      {e.tag
        ? (() => {
            const r = tagBox(e.tag.text, e.tag.at)
            return (
              <g data-viz-part="edge-tag">
                <rect x={px(r.x)} y={px(r.y)} width={Math.round(r.w) - 1} height={r.h - 1} rx={radius.chip.px} className="vz-g" strokeWidth={strokeWidth.outline} />
                <text x={r1(e.tag.at.x)} y={r1(e.tag.at.y + 4)} className="vz-u vz-c">
                  {e.tag.text}
                </text>
              </g>
            )
          })()
        : null}
    </g>
  )
}

export function BoxesSvg({ p, height }: { p: BoxesPanel; height?: number }) {
  return (
    <Svg width={p.width} height={height ?? p.height} id={p.id} heading={p.heading}>
      {p.keys.length ? (
        <g data-viz-part="keys">
          {(() => {
            let x = 0
            const y = 14 + SIZE.line + 2
            return p.keys.map((k, i) => {
              const at = x
              x += BOX.keySample + 6 + Math.ceil(smallW(k.text)) + BOX.keyGap
              return (
                <g key={i}>
                  <path d={`M${at + 1} ${y - 4}H${at + BOX.keySample - 1}`} className={clsx('vz-l', k.sample === 'dashed' && 'vz-d')} strokeWidth={strokeWidth.connector} fill="none" />
                  <text x={at + BOX.keySample + 6} y={y} className="vz-u">
                    {k.text}
                  </text>
                </g>
              )
            })
          })()}
        </g>
      ) : null}
      {p.edges.map((e) => (
        <EdgeGlyph key={e.id} e={e} />
      ))}
      {p.nodes.map((n) => (
        <NodeGlyph key={n.id} n={n} />
      ))}
      {p.labels.map((l, i) => {
        if (l.tone !== 'tag')
          return (
            <text key={i} x={r1(l.x)} y={r1(l.y)} textAnchor={l.anchor} className={l.tone === 'note' ? 'vz-u' : l.tone === 'result' ? 'vz-r vz-12' : 'vz-m vz-12'} data-viz-part={l.part} data-for={l.for}>
              {l.text}
            </text>
          )
        const r = labelBox(l)
        return (
          <g key={i} data-viz-part={l.part} data-for={l.for} data-changed={l.mark ? '' : undefined} data-ref={l.text}>
            <rect
              x={px(r.x)}
              y={px(r.y)}
              width={Math.round(r.w) - 1}
              height={r.h - 1}
              rx={radius.chip.px}
              className={clsx(l.mark ? 'vz-ch' : 'vz-p vz-l', l.dashed && 'vz-d')}
              strokeWidth={l.mark ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={r1(r.x + r.w / 2)} y={r1(r.y + 12)} className="vz-u vz-c">
              {l.text}
            </text>
          </g>
        )
      })}
      <Notes top={p.notesTop} lines={p.notes} />
    </Svg>
  )
}
