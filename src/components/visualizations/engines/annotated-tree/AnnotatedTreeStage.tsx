import type { CSSProperties, ReactNode } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import { H_CLS, heights } from '../../shell/vars'
import { routePath } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { toRem } from '../../substrates/units'
import {
  LABEL_LINE,
  SIZE,
  SUFFIX,
  TRIE,
  layoutGain,
  layoutSuffix,
  layoutTree,
  layoutTrie,
  type Label,
} from './layout'
import type { GainPanel, SuffixPanel, TreeData, TriePanel } from './model'

/**
 * The annotated-tree stage: server markup only (no state, no script), in
 * the static figures' svg vocabulary (`.vz-*`, `src/styles/tailwind.css`):
 * a node is the glyph fill with the `line` outline, its value in mono 13; an
 * edge is the 1.5 px connector; labels and notes are mono 12 in the
 * secondary ink, printed output in the result amber. The panel's one mark
 * family is the neutral `changed` role (H3 R2 Q9, never lime): a doubled
 * zinc-300 edge on the white/5 tint for a node (`.vz-ch`), zinc-300 at
 * 2.5 px for an edge (`.vz-cm`). A pruned trie node is a dashed ghost with
 * its reason in words. Each panel is one svg with its heading inside, drawn
 * 1:1 at the default text size; narrow stacks the panels, wide sets them
 * two to a row. Paper keeps every panel whole.
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const px = (n: number) => Math.round(n) + 0.5
/** The legend's baseline: the line under the heading. */
const HEAD_LEGEND = 14 + SIZE.line
const MARK_EDGE = { '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties

function Svg({ width, height, id, heading, className, children }: { width: number; height: number; id: string; heading: string; className?: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      data-viz-panel={id}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className={clsx('vz-s', className ?? 'block')}
      style={{ maxWidth: toRem(width), height: toRem(height) }}
      fontSize={SIZE.value}
    >
      {/* The panel heading, in the drawing so it scales with it under large text. */}
      <text x={0} y={14} className="vz-u" data-viz-part="panel-heading">
        {heading}
      </text>
      {children}
    </svg>
  )
}

function EdgeLabel({ label, className = 'vz-u', part }: { label: Label; className?: string; part: string }) {
  return (
    <text x={r1(label.x)} y={r1(label.y + 10)} textAnchor={label.anchor} className={className} data-viz-part={part}>
      {label.lines.map((l, i) => (
        <tspan key={i} x={r1(label.x)} dy={i ? LABEL_LINE : 0}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

function Notes({ top, lines }: { top: number; lines: string[] }) {
  return (
    <g data-viz-part="notes">
      {lines.map((l, i) => (
        <text key={i} x={0} y={r1(top + i * SIZE.line + 12)} className="vz-u">
          {l}
        </text>
      ))}
    </g>
  )
}

// ---------------------------------------------------------------------------

function GainSvg({ p, room, legend }: { p: GainPanel; room: number; legend: number }) {
  const g = layoutGain(p, room, legend)
  const best = new Set(p.best ?? [])
  const onBest = (a: string, b: string) => {
    const path = p.best ?? []
    const i = path.indexOf(a)
    const j = path.indexOf(b)
    return i >= 0 && j >= 0 && Math.abs(i - j) === 1
  }
  const setter = p.best?.find((id) => p.nodes[id].through === p.nodes[id].ans && best.has(id) && p.nodes[id].left && p.nodes[id].right)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {p.legend.map((l, i) => (
        <text key={i} x={0} y={HEAD_LEGEND + i * SIZE.line} className="vz-m vz-12" data-viz-part="legend">
          {l}
        </text>
      ))}
      {g.edges.map((e) => {
        const lit = onBest(e.from, e.to) || p.clamp?.child === e.to
        return (
          <g key={e.to} data-edge={`${e.from}-${e.to}`} data-from={e.from} data-to={e.to} data-changed={lit ? '' : undefined} className={lit ? 'vz-cm' : undefined} style={lit ? MARK_EDGE : undefined}>
            <path d={`M${r1(e.x1)} ${r1(e.y1)}L${r1(e.x2)} ${r1(e.y2)}`} className="vz-e" />
          </g>
        )
      })}
      {g.edges.map((e) => (
        <EdgeLabel key={e.to} label={e.label} part={p.clamp?.child === e.to ? 'clamp' : 'returned'} />
      ))}
      {Object.values(g.boxes).map((b) => {
        const n = p.nodes[b.id]
        const lit = b.id === setter
        const X = px(b.x)
        const Y = px(b.y)
        const base = r1(b.y + b.h / 2 + 4.5)
        return (
          <g key={b.id} data-node={b.id} data-value={n.value} data-through={n.through} data-returned={n.returned}>
            <rect x={X} y={Y} width={Math.round(b.w) - 1} height={b.h - 1} rx={radius.chip.px} className="vz-g" strokeWidth={strokeWidth.outline} />
            {lit ? (
              <rect
                x={px(b.x + b.valueW)}
                y={Y}
                width={Math.round(b.w - b.valueW) - 1}
                height={b.h - 1}
                rx={radius.chip.px}
                className="vz-ch"
                strokeWidth={strokeWidth.mark}
                data-changed=""
              />
            ) : null}
            <path d={`M${px(b.x + b.valueW)} ${b.y + 1}V${b.y + b.h - 1}`} className="vz-hl" />
            <text x={r1(b.x + b.valueW / 2)} y={base} className="vz-c">
              {n.value}
            </text>
            <text x={r1(b.x + b.valueW + (b.w - b.valueW) / 2)} y={base} className="vz-c" data-viz-part="through">
              {n.through}
            </text>
          </g>
        )
      })}
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

// ---------------------------------------------------------------------------

function TrieSvg({ p, rows }: { p: TriePanel; rows: number }) {
  const g = layoutTrie(p, rows)
  const byId = new Map(p.nodes.map((n) => [n.id, n]))
  const R = (id: string) => (id === 'root' ? TRIE.root : TRIE.r)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {p.nodes.map((n) => {
        if (!n.parent) return null
        const a = g.at[n.parent]
        const b = g.at[n.id]
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const ux = (b.x - a.x) / len
        const uy = (b.y - a.y) / len
        // An edge meets a node's END ring where it has one (a pruned ghost has none).
        const ringed = (x: TriePanel['nodes'][number]) => x.end && x.mark !== 'pruned'
        const ra = R(n.parent) + (ringed(byId.get(n.parent)!) ? TRIE.ring : 0)
        const rb = R(n.id) + (ringed(n) ? TRIE.ring : 0)
        const lit = n.mark === 'path'
        const ghost = n.mark === 'pruned'
        return (
          <g key={n.id} data-edge={`${n.parent}-${n.id}`} data-from={n.parent} data-to={n.id} data-changed={lit ? '' : undefined} className={lit ? 'vz-cm' : undefined} style={lit ? MARK_EDGE : undefined}>
            <path d={`M${r1(a.x + ux * ra)} ${r1(a.y + uy * ra)}L${r1(b.x - ux * rb)} ${r1(b.y - uy * rb)}`} className={clsx('vz-e', ghost && 'vz-d')} />
          </g>
        )
      })}
      {p.nodes.map((n) => {
        const { x, y } = g.at[n.id]
        if (!n.parent)
          return (
            <g key={n.id} data-node="root">
              <circle cx={x} cy={y} r={TRIE.root} className="vz-g" strokeWidth={strokeWidth.outline} />
            </g>
          )
        const ghost = n.mark === 'pruned'
        const lit = n.mark === 'path' || n.mark === 'cleared' || n.mark === 'stop'
        // A pruned node's reason is in the results line under the drawing (its dashed ghost has no room for a word).
        const label = ghost ? null : n.mark === 'cleared' ? 'END cleared' : n.end ? 'END' : null
        return (
          <g key={n.id} data-node={n.id} data-end={n.end ? '' : undefined} data-mark={n.mark} data-changed={lit ? '' : undefined}>
            {n.end && !ghost ? <circle cx={x} cy={y} r={TRIE.r + TRIE.ring} className="vz-l" fill="none" strokeWidth={strokeWidth.outline} data-viz-part="end-ring" /> : null}
            <circle
              cx={x}
              cy={y}
              r={TRIE.r}
              className={ghost ? 'vz-l vz-d' : lit ? 'vz-ch' : 'vz-g'}
              fill={ghost ? 'none' : undefined}
              strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={x} y={r1(y + 4.5)} className={clsx('vz-c', ghost && 'vz-m')}>
              {n.char}
            </text>
            {label ? (
              <text x={x} y={r1(y + TRIE.labelDy)} className={clsx('vz-c', n.mark === 'cleared' ? 'vz-u' : 'vz-m vz-12')} data-viz-part="node-label">
                {label}
              </text>
            ) : null}
          </g>
        )
      })}
      <g data-viz-part="results">
        {p.results.map((r, i) => {
          const y = r1(g.resultsTop + i * SIZE.line + 12)
          const call = r.call ? `${r.call}${r.value !== undefined ? ' → ' : ': '}` : ''
          const cw = monoWidth(call, SIZE.small)
          const vw = r.value !== undefined ? monoWidth(`${r.value} `, SIZE.small) : 0
          return (
            <g key={i}>
              {call ? (
                <text x={0} y={y} className="vz-u">
                  {call}
                </text>
              ) : null}
              {r.value !== undefined ? (
                <text x={r1(cw)} y={y} className="vz-r vz-12" data-viz-part="returned">
                  {r.value}
                </text>
              ) : null}
              {r.note ? (
                <text x={r1(cw + vw)} y={y} className="vz-m vz-12">
                  {r.note}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    </Svg>
  )
}

// ---------------------------------------------------------------------------

function SuffixSvg({ p, variant, className }: { p: SuffixPanel; variant: 'narrow' | 'wide'; className: string }) {
  const g = layoutSuffix(p, variant)
  const leafX = g.cols.leaf + SUFFIX.leaf.w / 2
  return (
    <Svg width={g.width} height={g.height} id={`${p.id}-${variant}`} heading={p.heading} className={className}>
      <g data-viz-part="columns">
        <text x={leafX} y={g.headerY} className="vz-m vz-12 vz-c">
          SA
        </text>
        {g.cols.suffix !== undefined ? (
          <text x={g.cols.suffix} y={g.headerY} className="vz-m vz-12">
            suffix
          </text>
        ) : null}
        <text x={g.cols.lcp} y={g.headerY} className="vz-m vz-12" textAnchor="end">
          LCP
        </text>
      </g>
      {g.edges.map((e) => {
        const n = p.nodes.find((x) => x.id === e.to)!
        const lit = Boolean(n.marked)
        return (
          <g key={e.to} data-edge={e.to} data-from={n.parent} data-to={e.to} data-changed={lit ? '' : undefined} className={lit ? 'vz-cm' : undefined} style={lit ? MARK_EDGE : undefined}>
            <path d={routePath(e.points, SUFFIX.corner)} className="vz-e" />
          </g>
        )
      })}
      {g.edges.map((e) => {
        const n = p.nodes.find((x) => x.id === e.to)!
        return (
          <g key={e.to} data-viz-part="edge-label" data-for={e.to}>
            <text x={r1(e.label.x)} y={r1(e.label.y + SUFFIX.above)} className="vz-c">
              {n.edge!.text}
            </text>
            <text x={r1(e.label.x)} y={r1(e.label.y + SUFFIX.below)} className="vz-m vz-12 vz-c">
              {`[${n.edge!.start},${n.edge!.end}]`}
            </text>
          </g>
        )
      })}
      {p.nodes.map((n) => {
        const a = g.at[n.id]
        if (n.parent === null)
          return (
            <g key={n.id} data-node="root">
              <circle cx={a.x} cy={a.y} r={SUFFIX.root} className="vz-g" strokeWidth={strokeWidth.outline} />
            </g>
          )
        if (n.leaf !== undefined)
          return (
            <g key={n.id} data-node={n.id} data-leaf={n.leaf}>
              <rect
                x={px(a.x - SUFFIX.leaf.w / 2)}
                y={px(a.y - SUFFIX.leaf.h / 2)}
                width={SUFFIX.leaf.w - 1}
                height={SUFFIX.leaf.h - 1}
                rx={radius.chip.px}
                className="vz-g"
                strokeWidth={strokeWidth.outline}
              />
              <text x={a.x} y={r1(a.y + 4.5)} className="vz-c">
                {n.leaf}
              </text>
            </g>
          )
        return (
          <g key={n.id} data-node={n.id} data-path={n.path} data-changed={n.marked ? '' : undefined}>
            <rect
              x={px(a.x - a.w / 2)}
              y={px(a.y - SUFFIX.pill / 2)}
              width={Math.round(a.w) - 1}
              height={SUFFIX.pill - 1}
              rx={radius.glyph.px}
              className={n.marked ? 'vz-ch' : 'vz-g'}
              strokeWidth={n.marked ? strokeWidth.mark : strokeWidth.outline}
            />
            <text x={a.x} y={r1(a.y + 4.5)} className="vz-c">
              {n.path}
            </text>
          </g>
        )
      })}
      <g data-viz-part="table">
        {p.rows.map((row, i) => {
          const y = g.rowY[i]
          const lit = i === p.maxRank
          return (
            <g key={i} data-rank={i} data-changed={lit ? '' : undefined}>
              {g.cols.suffix !== undefined ? (
                <text x={g.cols.suffix} y={r1(y + 4.5)}>
                  {row.suffix}
                </text>
              ) : null}
              {lit ? (
                <rect
                  x={px(g.cols.lcp - SUFFIX.leaf.w)}
                  y={px(y - SUFFIX.leaf.h / 2)}
                  width={SUFFIX.leaf.w - 1}
                  height={SUFFIX.leaf.h - 1}
                  rx={radius.chip.px}
                  className="vz-ch"
                  strokeWidth={strokeWidth.mark}
                />
              ) : null}
              <text x={g.cols.lcp - SUFFIX.leaf.w / 2} y={r1(y + 4.5)} className="vz-c" data-viz-part="lcp">
                {row.lcp}
              </text>
            </g>
          )
        })}
      </g>
      <Notes top={g.notesTop} lines={p.notes} />
    </Svg>
  )
}

export function AnnotatedTreeStage({ data }: StaticStageProps<TreeData>) {
  const scene = layoutTree(data)
  return (
    <div className="grid content-start vz-wide:grid-cols-2" style={{ rowGap: toRem(SIZE.panelGap), columnGap: toRem(SIZE.columnGap) }}>
      {data.panels.map((p, i) => (
        <div
          key={p.id}
          data-viz-section={p.id}
          className={clsx('min-w-0 print:break-inside-avoid', H_CLS, scene.full[i] && 'vz-wide:col-span-2')}
          style={heights(scene.blocks[i])}
        >
          {p.kind === 'gain' ? <GainSvg p={p} room={scene.gainRoom} legend={scene.gainLegend} /> : null}
          {p.kind === 'trie' ? <TrieSvg p={p} rows={scene.trieRows} /> : null}
          {p.kind === 'suffix' ? (
            <>
              <SuffixSvg p={p} variant="narrow" className="block vz-wide:hidden" />
              <SuffixSvg p={p} variant="wide" className="hidden vz-wide:block" />
            </>
          ) : null}
        </div>
      ))}
    </div>
  )
}
