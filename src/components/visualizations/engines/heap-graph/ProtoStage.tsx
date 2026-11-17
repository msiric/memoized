import type { CSSProperties } from 'react'
import { Fragment } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import { H_CLS, heights } from '../../shell/vars'
import { toRem } from '../../substrates/units'
import { SIZE } from './layout'
import type { ProtoDiagram } from './proto-model'
import { PROTO, layoutProto, type ProtoBoxScene, type ProtoEdgeScene, type ProtoPanelScene } from './proto-layout'

/**
 * The prototype object graph's stage: server markup only, in the heap
 * graph's svg vocabulary (`.vz-*`): object boxes with a header and one row
 * per drawn own property, a function as a named pill (`ƒ Person`), arrows in
 * the `line` role. The three links read apart by shape as well as by their
 * labels: the [[Prototype]] link is a plain vertical connector down the spine
 * with no dot; `.prototype` is a solid arrow from a dot; `.constructor` is a
 * dashed arrow from a dot. The panel's one mark, the lookup (H3 R2 Q9, the
 * neutral `changed` role, never lime): the links it followed at the 2.5 px
 * weight and the row that answered it on the white/5 tint with the doubled
 * edge. Narrow stacks the panels; wide sets them two to a row; paper keeps
 * every panel whole.
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const px = (n: number) => Math.round(n) + 0.5
const MARK = { '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties
const headerBottom = (y: number) => y + 2 * SIZE.headerPad + SIZE.headerLine

function Box({ box }: { box: ProtoBoxScene }) {
  const { x, y, w, h } = box.rect
  if (box.fn)
    return (
      <g data-node={box.id} data-fn="">
        <rect x={px(x)} y={px(y)} width={Math.round(w) - 1} height={Math.round(h) - 1} rx={radius.chip.px} className="vz-g" />
        <text x={r1(x + w / 2)} y={r1(y + h / 2 + 4.5)} className="vz-c">
          <tspan className="vz-m">ƒ</tspan> {box.title}
        </text>
      </g>
    )
  const rowBase = (top: number) => r1(top + 18.5)
  return (
    <g data-node={box.id}>
      <rect x={px(x)} y={px(y)} width={Math.round(w) - 1} height={Math.round(h) - 1} rx={radius.glyph.px} className="vz-g" />
      <text x={r1(x + SIZE.cellPad)} y={r1(y + SIZE.headerPad + 12)} className="vz-t">
        {box.title}
      </text>
      {box.rows
        .filter((row) => row.changed)
        .map((row) => (
          <rect
            key={row.key}
            data-changed=""
            x={px(x) + 3}
            y={row.top + 3.5}
            width={Math.round(w) - 7}
            height={SIZE.row - 6}
            rx={radius.chip.px}
            strokeWidth={strokeWidth.mark}
            className="vz-ch"
          />
        ))}
      <path
        d={box.rows
          .map((row, i) => {
            const sep = i === 0 ? headerBottom(y) : row.top
            const bottomY = row.top + SIZE.row - (i === box.rows.length - 1 ? 1 : 0)
            return `M${r1(x + 1)} ${px(sep)}H${r1(x + w - 1)}${row.muted ? '' : `M${px(x + row.keyWidth)} ${row.top + 1}V${bottomY}`}`
          })
          .join('')}
        className="vz-hl"
      />
      {box.rows.map((row, i) =>
        row.muted ? (
          <text key={`m${i}`} x={r1(x + SIZE.cellPad)} y={rowBase(row.top)} className="vz-m vz-12" data-viz-part="more">
            {row.muted}
          </text>
        ) : (
          <Fragment key={row.key}>
            <text x={r1(x + SIZE.cellPad)} y={rowBase(row.top)} data-key={row.key}>
              {row.key}
            </text>
            {row.value !== null ? (
              <text x={r1(x + row.keyWidth + SIZE.cellPad)} y={rowBase(row.top)} className={row.value === 'ƒ' ? 'vz-m' : undefined}>
                {row.value}
              </text>
            ) : null}
          </Fragment>
        ),
      )}
    </g>
  )
}

function Edge({ edge }: { edge: ProtoEdgeScene }) {
  return (
    <g
      data-edge={edge.id}
      data-kind={edge.kind}
      data-from={edge.from}
      data-to={edge.to}
      data-changed={edge.changed ? '' : undefined}
      className={edge.changed ? 'vz-cm' : undefined}
      style={edge.changed ? MARK : undefined}
    >
      <path d={edge.d} className={clsx('vz-e', edge.kind === 'constructor' && 'vz-d')} />
      <path d={edge.head} className="vz-ah" />
      {edge.dot ? <circle cx={r1(edge.dot.x)} cy={r1(edge.dot.y)} r={SIZE.dot} className="vz-ah" /> : null}
      {edge.label ? (
        <text x={edge.label.x} y={edge.label.y} textAnchor={edge.label.anchor} className="vz-el" data-viz-part="edge-label">
          {edge.label.text}
        </text>
      ) : null}
    </g>
  )
}

function PanelSvg({ s, heading }: { s: ProtoPanelScene; heading: string }) {
  const n = s.nullRect
  return (
    <svg
      aria-hidden
      data-viz-panel={s.id}
      viewBox={`0 0 ${s.width} ${s.height}`}
      width="100%"
      className="vz-s block"
      style={{ maxWidth: toRem(s.width), height: toRem(s.height) }}
      fontSize={SIZE.value}
    >
      <text x={0} y={14} className="vz-u" data-viz-part="panel-heading">
        {heading}
      </text>
      {s.boxes.map((b) => (
        <Box key={b.id} box={b} />
      ))}
      <g data-node="null">
        <rect x={px(n.x)} y={px(n.y)} width={n.w - 1} height={n.h - 1} rx={radius.chip.px} className="vz-g" />
        <text x={r1(n.x + n.w / 2)} y={r1(n.y + n.h / 2 + 4.5)} className="vz-c vz-m">
          null
        </text>
      </g>
      {s.edges.map((e) => (
        <Edge key={e.id} edge={e} />
      ))}
      {s.results.map((r, i) => (
        <g key={i} data-viz-part="result">
          <text x={0} y={r.y} className="vz-m">
            {r.expr}
          </text>
          <text x={r.textX} y={r.y} className="vz-r">
            <tspan>›</tspan> {r.text}
          </text>
        </g>
      ))}
      {s.note ? (
        <text x={0} y={s.note.y} className="vz-m vz-12" data-viz-part="note">
          {s.note.text}
        </text>
      ) : null}
    </svg>
  )
}

export function ProtoStage({ data }: StaticStageProps<ProtoDiagram>) {
  const scene = layoutProto(data)
  return (
    <div className="grid content-start vz-wide:grid-cols-2" style={{ rowGap: toRem(PROTO.panelGap), columnGap: toRem(PROTO.columnGap) }}>
      {scene.panels.map((s, i) => (
        <div key={s.id} data-viz-section={s.id} className={clsx('min-w-0 print:break-inside-avoid', H_CLS)} style={heights(scene.blocks[i])}>
          <PanelSvg s={s} heading={data.panels[i].heading} />
        </div>
      ))}
    </div>
  )
}
