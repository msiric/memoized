import { cn as clsx } from '../../../primitives/cn'
import { ink, type as typeScale } from '../../../primitives/tokens-v3'
import type { StaticStageProps } from '../../../shell/static-types'
import { toRem } from '../../../substrates/units'
import { SIZE, linkShape, tagBox, type ListGeometry } from '../geometry'
import { Arrow, NodeBox, TagBody, r1 } from '../glyphs'
import { NULL_ID, linkId, nodeId } from '../model'
import { FRAME_G, RHO, labelWidth, layoutFrames, rhoLink, rhoTags, type RhoGeometry } from './layout'
import type { FramesData, RhoPanel, RowPanel } from './model'

/**
 * The pointer-rewiring frames: server markup only (no state, no script).
 * Each panel is its heading (mono, the label role, as the heap-graph
 * panels), then one svg drawn 1:1 at 288 user units at the default text
 * size (it scales down only under very large text, inside its fixed
 * height), then, for the rho, the recorded pointer pairs. Narrow stacks the
 * panels; from 768 they sit two to a row. Paper keeps every panel whole.
 */

function Svg({ g, children, id }: { g: { width: number; height: number }; children: React.ReactNode; id: string }) {
  return (
    <svg
      aria-hidden
      data-viz-panel={id}
      viewBox={`0 0 ${g.width} ${g.height}`}
      width="100%"
      className="vz-s block"
      style={{ maxWidth: toRem(g.width), height: toRem(g.height) }}
      fontSize={SIZE.value}
    >
      {children}
    </svg>
  )
}

function RowSvg({ p, g }: { p: RowPanel; g: ListGeometry }) {
  const s = p.state
  return (
    <Svg g={g} id={p.id}>
      <text data-node={NULL_ID} x={r1(g.nullX)} y={r1(g.mid + 4)} className="vz-m vz-12 vz-c">
        null
      </text>
      {s.nodes.map((n, i) => (
        <NodeBox key={n.id} id={n.id} x={g.cols[i] - SIZE.node / 2} y={g.rowTop} label={n.label} />
      ))}
      {s.next.map((to, i) => {
        const shape = linkShape(g, i, to)
        const lit = p.changed === i
        return (
          <g
            key={i}
            data-edge={linkId(i)}
            data-from={nodeId(i)}
            data-to={to === null ? NULL_ID : nodeId(to)}
            data-changed={lit ? '' : undefined}
            className={lit ? 'vz-cm' : undefined}
          >
            <Arrow d={shape.d} head={shape.head} changed={lit} />
          </g>
        )
      })}
      {s.pointers.map((ptr) => {
        const b = tagBox(g, ptr.name, ptr.at)
        return (
          <g key={ptr.name} data-pointer={ptr.name} data-at={ptr.at === null ? NULL_ID : nodeId(ptr.at)} transform={`translate(${b.x} ${b.y})`}>
            <TagBody name={ptr.name} w={b.w} />
          </g>
        )
      })}
    </Svg>
  )
}

function RhoSvg({ p, g }: { p: RhoPanel; g: RhoGeometry }) {
  const s = p.state
  const half = SIZE.node / 2
  const d = p.distances
  const entry = g.pos[p.rho.entry]
  // The tail ends left of the entry, where its last arrow arrives.
  const tail = p.rho.tail.map((n) => g.pos[n])
  const corner = g.pos[p.rho.cycle[1]]
  const below = g.pos[p.rho.cycle[2]]
  return (
    <Svg g={g} id={p.id}>
      {s.nodes.map((n, i) => (
        <NodeBox key={n.id} id={n.id} x={g.pos[i].x - half} y={g.pos[i].y - half} label={n.label} changed={p.mark?.node === i} />
      ))}
      {s.next.map((to, i) =>
        to === null ? null : (
          <g key={i} data-edge={linkId(i)} data-from={nodeId(i)} data-to={nodeId(to)}>
            <Arrow {...rhoLink(g, i, to)} />
          </g>
        ),
      )}
      {/* The mark's word: "meet" right of the meeting node, "entry" over the entry. */}
      {p.mark ? (
        p.mark.label === 'entry' || p.mark.node === p.rho.entry ? (
          <text x={r1(entry.x)} y={RHO.labelBase} className="vz-t vz-c" data-viz-part="mark-label">
            {p.mark.label}
          </text>
        ) : (
          <text
            x={r1(g.pos[p.mark.node].x + half + 6)}
            y={r1(g.pos[p.mark.node].y + 4)}
            className="vz-t"
            data-viz-part="mark-label"
          >
            {p.mark.label}
          </text>
        )
      ) : null}
      {p.mark?.label === 'meet' ? (
        <text x={r1(entry.x)} y={RHO.labelBase} className="vz-m vz-12 vz-c" data-viz-part="entry-label">
          entry
        </text>
      ) : null}
      {d ? (
        <g aria-hidden data-viz-part="distances">
          {/* a: head to the entry, a dashed dimension over the tail. */}
          <path
            d={`M${r1(tail[0].x)} ${RHO.dimY - RHO.tick}V${RHO.dimY + RHO.tick}M${r1(tail[0].x)} ${RHO.dimY}H${r1(entry.x - 10)}M${r1(entry.x - 10)} ${RHO.dimY - RHO.tick}V${RHO.dimY + RHO.tick}`}
            className="vz-x vz-d fill-none"
          />
          <text x={r1((tail[0].x + entry.x - 10) / 2)} y={RHO.labelBase} className="vz-u vz-c">
            {`a = ${d.a}`}
          </text>
          {/* b: the entry to the meeting node, along the cycle's first two links. */}
          <path
            d={`M${r1(entry.x + 10)} ${RHO.dimY - RHO.tick}V${RHO.dimY + RHO.tick}M${r1(entry.x + 10)} ${RHO.dimY}H${r1(corner.x + half + 8)}V${r1(below.y)}M${r1(corner.x + half + 8 - RHO.tick)} ${r1(below.y)}H${r1(corner.x + half + 8 + RHO.tick)}`}
            className="vz-x vz-d fill-none"
          />
          <text x={r1(corner.x + half + 14)} y={r1((corner.y + below.y) / 2 + 4)} className="vz-u">
            {`b = ${d.b}`}
          </text>
          {/* c: once round the cycle, in the middle of the square. */}
          <text x={r1((entry.x + corner.x) / 2)} y={r1((entry.y + below.y) / 2 + 4)} className="vz-u vz-c">
            {`c = ${d.c}`}
          </text>
        </g>
      ) : null}
      {rhoTags(g, p).map((t) => (
        <g key={t.name} data-pointer={t.name} data-at={nodeId(t.at)} transform={`translate(${r1(t.x)} ${r1(t.y)})`}>
          <TagBody name={t.name} w={t.w} />
        </g>
      ))}
    </Svg>
  )
}

/** Whether a label of `text` fits right of the cycle (the layout test checks every preset). */
export const rhoLabelFits = (g: RhoGeometry, p: RhoPanel, text: string) =>
  g.pos[p.rho.cycle[1]].x + SIZE.node / 2 + 14 + labelWidth(text) <= g.width

export function FramesStage({ data }: StaticStageProps<FramesData>) {
  const scene = layoutFrames(data)
  return (
    <div className="flex h-full flex-col">
      <div
        className="grid content-start vz-wide:grid-cols-2"
        style={{ rowGap: toRem(FRAME_G.panelGap), columnGap: toRem(FRAME_G.columnGap) }}
      >
        {data.panels.map((p, i) => (
          <div
            key={p.id}
            data-viz-section={p.id}
            className="min-w-0 print:break-inside-avoid"
            style={{ height: toRem(scene.blocks[i]) }}
          >
            <p
              className={clsx('m-0 truncate', typeScale.value.cls, ink.secondary)}
              style={{ marginBottom: toRem(FRAME_G.headingGap) }}
            >
              {p.heading}
            </p>
            {p.kind === 'row' ? <RowSvg p={p} g={scene.row!} /> : <RhoSvg p={p} g={scene.rho[p.id]} />}
            {p.kind === 'rho' ? (
              <p
                data-viz-part="pairs"
                className={clsx('m-0 truncate', typeScale.meta.cls, ink.muted)}
                style={{ marginTop: toRem(FRAME_G.pairsGap), lineHeight: toRem(FRAME_G.pairs) }}
              >
                <span className={ink.secondary}>{`${p.pairs.names.join(', ')}:`}</span> {p.pairs.values.join(' ')}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {data.footnote ? (
        <p
          data-viz-part="footnote"
          className={clsx('m-0', typeScale.item.cls, ink.secondary)}
          style={{ marginTop: toRem(FRAME_G.footnoteGap), lineHeight: toRem(FRAME_G.footnote) }}
        >
          {data.footnote}
        </p>
      ) : null}
    </div>
  )
}
