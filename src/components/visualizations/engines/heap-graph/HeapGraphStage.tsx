import clsx from 'clsx'
import { Fragment } from 'react'
import { ink, radius, strokeWidth, type as typeScale } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import { CONTAINER } from '../env-records/EnvRecordsStage'
import {
  HEADING,
  HINT,
  PANEL_GAP,
  SIZE,
  hasHint,
  layoutDiagramSafe,
  type DiagramScene,
  type LaidBox,
  type LaidEdge,
  type LaidText,
  type PanelScene,
} from './layout'
import type { HeapDiagram, HeapPanel } from './model'
import { pathCss, pathLabel, traceable } from './paths'

/**
 * The heap-graph stage: one SVG per panel per sub-width, chosen by CSS
 * alone (the frame's `vz-wide` query picks the variant, a container query
 * on the panel picks the width), so the server markup is final. It speaks
 * the closures figure's vocabulary (`.vz-*` in `src/styles/tailwind.css`):
 * the same glyph fill, outline, header, hairline, arrow, dot and traced
 * lime, so the two read as one system.
 *
 * - A name is a focusable box (`.vz-fb`, as a function object is in the
 *   closures figure) with a 46 px touch band; its arrow starts at a dot on
 *   its edge. A name holding a primitive is two cells, `name │ value`.
 * - An object is a rounded box with its header (`Object A`) and one row per
 *   own property; a property that identifies an object starts its arrow at
 *   a dot in the value cell.
 * - The panel's one mark (H3 R2 Q9 "changed", never lime): the row a
 *   mutation wrote (`.vz-ch`, a doubled zinc-300 edge on a white/5 tint) or
 *   the arrow a rebinding moved (`.vz-cm`, zinc-300 at the 2.5 px weight).
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const px = (n: number) => Math.round(n) + 0.5

/** The touch band around a name: 32 + 2 x 7 = 46 px (R11), as the closures `HIT`. */
export const HIT = 7

export type Band = { l: number; r: number; t: number; b: number }

/** Each name's band: HIT a side, or half the gap to the next name, so two targets never overlap. */
export function hitBands(boxes: LaidBox[]): Map<string, Band> {
  const names = boxes.filter((b) => b.kind === 'binding')
  const out = new Map<string, Band>()
  for (const f of names) {
    const a = f.rect
    const band: Band = { l: HIT, r: HIT, t: HIT, b: HIT }
    for (const g of names) {
      if (g === f) continue
      const o = g.rect
      const half = (gap: number) => Math.max(0, Math.floor(gap / 2))
      if (o.y >= a.y + a.h) band.b = Math.min(band.b, half(o.y - a.y - a.h))
      if (o.y + o.h <= a.y) band.t = Math.min(band.t, half(a.y - o.y - o.h))
    }
    out.set(f.id, band)
  }
  return out
}

/** A name: its box, its text and (for a primitive) its value cell. Focusable when it can be traced. */
function Binding({ box, label, band }: { box: LaidBox; label?: string; band?: Band }) {
  const { x, y, w, h } = box.rect
  const X = px(x)
  const Y = px(y)
  const W = Math.round(w) - 1
  const H = Math.round(h) - 1
  const base = r1(y + h / 2 + 4.5)
  return (
    <g data-node={box.id} tabIndex={label ? 0 : undefined} role={label ? 'img' : undefined} aria-label={label}>
      {band ? (
        <rect
          x={X - band.l}
          y={Y - band.t}
          width={W + band.l + band.r}
          height={H + band.t + band.b}
          className="vz-hit"
        />
      ) : null}
      <rect x={X} y={Y} width={W} height={H} rx={radius.chip.px} className={label ? 'vz-fb' : 'vz-g'} />
      <text x={r1(x + (box.value === undefined ? SIZE.bindPad : SIZE.cellPad))} y={base}>
        {box.title}
      </text>
      {box.value !== undefined && box.nameWidth ? (
        <>
          <path d={`M${px(x + box.nameWidth)} ${y + 1}V${y + h - 1}`} className="vz-hl" />
          <text x={r1(x + box.nameWidth + SIZE.cellPad)} y={base}>
            {box.value}
          </text>
        </>
      ) : null}
    </g>
  )
}

/** An object: header, dividers, rows; the changed row carries its mark. */
function ObjectBox({ box }: { box: LaidBox }) {
  const { x, y, w, h } = box.rect
  const X = px(x)
  const W = Math.round(w) - 1
  const headerBottom = y + 2 * SIZE.headerPad + SIZE.headerLine
  const rowBase = (top: number) => r1(top + 18.5)
  // A collectible object (reachability presets) is greyed: a dashed outline and muted text throughout.
  const muted = box.gone ? 'vz-m' : undefined
  return (
    <g data-node={box.id} data-gone={box.gone ? '' : undefined}>
      <rect x={X} y={px(y)} width={W} height={Math.round(h) - 1} rx={radius.glyph.px} className={clsx('vz-g', box.gone && 'vz-d')} />
      {/* `vz-t`: the header role, 12 px medium (the closures record header). */}
      <text x={r1(x + SIZE.cellPad)} y={r1(y + SIZE.headerPad + 12)} className={box.gone ? 'vz-m vz-12' : 'vz-t'}>
        {box.title}
      </text>
      {box.badge ? (
        <text x={r1(x + w - SIZE.cellPad)} y={r1(y + SIZE.headerPad + 12)} textAnchor="end" className="vz-m vz-12" data-viz-part="badge">
          {box.badge}
        </text>
      ) : null}
      {box.rows
        .filter((row) => row.changed)
        .map((row) => (
          // Under the dividers (the key cell's divider stays drawn on paper,
          // where the tint is opaque), inset at the chip radius like the
          // closures read tint.
          <rect
            key={row.key}
            data-changed=""
            x={X + 3}
            y={row.top + 3.5}
            width={W - 6}
            height={SIZE.row - 6}
            rx={radius.chip.px}
            strokeWidth={strokeWidth.mark}
            className="vz-ch"
          />
        ))}
      {box.rows.length || box.note ? (
        <path
          d={[
            ...box.rows.map((row, i) => {
              const sep = i === 0 ? headerBottom : row.top
              const last = i === box.rows.length - 1 && !box.note
              const bottomY = row.top + SIZE.row - (last ? 1 : 0)
              return `M${r1(x + 1)} ${px(sep)}H${r1(x + w - 1)}M${px(x + row.keyWidth)} ${row.top + 1}V${bottomY}`
            }),
            box.note ? `M${r1(x + 1)} ${px(box.rows.length ? box.note.top : headerBottom)}H${r1(x + w - 1)}` : '',
          ].join('')}
          className="vz-hl"
        />
      ) : null}
      {box.rows.map((row) => (
        <Fragment key={row.key}>
          <text x={r1(x + SIZE.cellPad)} y={rowBase(row.top)} className={muted}>
            {row.key}
          </text>
          {row.value !== null ? (
            <text x={r1(x + row.keyWidth + SIZE.cellPad)} y={rowBase(row.top)} className={muted}>
              {row.value}
            </text>
          ) : null}
        </Fragment>
      ))}
      {box.note ? (
        <text x={r1(x + SIZE.cellPad)} y={rowBase(box.note.top)} className="vz-m vz-12" data-viz-part="note">
          {box.note.text}
        </text>
      ) : null}
    </g>
  )
}

/** An arrow: its line, its head and the dot it starts from, in the link's colour. */
function Edge({ edge }: { edge: LaidEdge }) {
  return (
    <g
      data-edge={edge.id}
      data-from={edge.from}
      data-to={edge.to}
      data-changed={edge.changed ? '' : undefined}
      data-weak={edge.weak ? '' : undefined}
      data-gone={edge.gone ? '' : undefined}
      className={edge.changed ? 'vz-cm' : undefined}
      // The moved arrow at the `now` connector weight, in its neutral colour (a lit trace sets the same width).
      style={edge.changed ? ({ '--vz-sw': `${strokeWidth.nowConnector}px` } as React.CSSProperties) : undefined}
    >
      <path d={edge.d} className={clsx('vz-e', edge.weak && 'vz-d')} />
      <path d={edge.head} className="vz-ah" />
      <circle cx={r1(edge.dot.x)} cy={r1(edge.dot.y)} r={SIZE.dot} className="vz-ah" />
    </g>
  )
}

/** The program's own output under a panel: the expression (muted), then `› value` (the output role, N12). */
function Result({ t }: { t: LaidText }) {
  // Reachability: the roots label over the names, the island's label under the greyed objects.
  if (t.kind === 'roots' || t.kind === 'island')
    return (
      <text x={r1(t.x)} y={r1(t.y)} className="vz-m vz-12" data-viz-part={t.kind}>
        {t.text}
      </text>
    )
  if (t.kind === 'expr')
    return (
      <text x={r1(t.x)} y={r1(t.y)} className="vz-m">
        {t.text}
      </text>
    )
  return (
    <text x={r1(t.x)} y={r1(t.y)} className="vz-r">
      <tspan>›</tspan>
      {t.text.slice(1)}
    </text>
  )
}

function PanelSvg({ scene, panel, className }: { scene: PanelScene; panel: HeapPanel; className: string }) {
  const names = scene.boxes.filter((b) => b.kind === 'binding')
  const objects = scene.boxes.filter((b) => b.kind === 'object')
  const traced = new Set(traceable(panel).map((b) => b.id))
  const bands = hitBands(scene.boxes)
  return (
    // Only the names are exposed (focusable, named); the rest of the picture
    // is described by "Diagram as text". `vz-s`: the closures svg role.
    <svg
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      data-viz-width={scene.width}
      className={clsx('vz-s', className)}
      style={{ width: `${scene.width / 16}rem` }}
      fontSize={SIZE.value}
    >
      <g aria-hidden>
        {objects.map((b) => (
          <ObjectBox key={b.id} box={b} />
        ))}
      </g>
      {names.map((b) => (
        <Binding
          key={b.id}
          box={b}
          band={traced.has(b.id) ? bands.get(b.id) : undefined}
          label={traced.has(b.id) ? pathLabel(panel, b.id) : undefined}
        />
      ))}
      {/* Arrows over the boxes: a property's arrow starts inside its value cell. */}
      <g aria-hidden>
        {scene.edges.map((e) => (
          <Edge key={e.id} edge={e} />
        ))}
        {scene.texts.map((t, i) => (
          <Result key={i} t={t} />
        ))}
      </g>
    </svg>
  )
}

function Heading({ text, emphasis }: { text: string; emphasis?: string }) {
  const at = emphasis ? text.indexOf(emphasis) : -1
  if (!emphasis || at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <span className={ink.base}>{emphasis}</span>
      {text.slice(at + emphasis.length)}
    </>
  )
}

function visibility(widths: readonly number[], i: number): string {
  const next = widths[i + 1]
  const own = i === 0 ? 'block' : clsx('hidden', CONTAINER[widths[i]]?.show)
  return clsx(own, next !== undefined && CONTAINER[next]?.hide)
}

function VariantStage({ data, scene }: { data: HeapDiagram; scene: DiagramScene }) {
  const wide = scene.variant === 'wide'
  return (
    <div
      data-viz-variant={scene.variant}
      data-viz-arrangement={scene.arrangement}
      className={wide ? 'hidden vz-wide:block' : 'vz-wide:hidden'}
    >
      {hasHint(data) ? (
        // The figure's only instruction (R11), worded for the reader's input; print keeps the space, not the words.
        <p
          data-viz-part="hint"
          className={clsx('m-0 print:invisible', typeScale.provenance.cls, ink.muted)}
          style={{ marginBottom: HINT.gap }}
        >
          <span className="[@media(hover:none)]:hidden">{HINT.hover}</span>
          <span className="hidden [@media(hover:none)]:inline">{HINT.tap}</span>
        </p>
      ) : null}
      <div className="grid" style={{ rowGap: PANEL_GAP }}>
        {scene.panels.map(({ panel, scenes }) => (
          <div key={panel.id} data-viz-section={panel.id} className="min-w-0 [container-type:inline-size]">
            {/* The heading is code (mono, the label role), as the closures section heading. */}
            <p
              className={clsx('m-0 break-words', typeScale.value.cls, ink.secondary)}
              style={{ marginBottom: HEADING.gap }}
            >
              <Heading text={panel.heading} emphasis={panel.emphasis} />
            </p>
            {scenes.map((s, i) => (
              <PanelSvg key={s.width} scene={s} panel={panel} className={visibility(scene.widths, i)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Variant({ data, variant }: { data: HeapDiagram; variant: 'narrow' | 'wide' }) {
  const scene = layoutDiagramSafe(data, variant)
  if ('failed' in scene)
    return (
      <p
        data-viz-variant={variant}
        data-viz-layout-failed={scene.failed}
        className={clsx(
          'm-0',
          variant === 'wide' ? 'hidden vz-wide:block' : 'vz-wide:hidden',
          typeScale.item.cls,
          ink.muted,
        )}
      >
        Too wide to draw at this size. “Diagram as text” below describes it.
      </p>
    )
  return <VariantStage data={data} scene={scene} />
}

export function HeapGraphStage({ data }: StaticStageProps<HeapDiagram>) {
  return (
    <>
      {/* The hover and focus paths (D21): server CSS, no script. */}
      <style dangerouslySetInnerHTML={{ __html: pathCss(data) }} />
      <Variant data={data} variant="narrow" />
      <Variant data={data} variant="wide" />
    </>
  )
}
