import type { CSSProperties, ReactNode } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { DOT_R, radius, strokeWidth } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import { arrowHead, routePath, type Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { toRem } from '../../substrates/units'
import {
  DP,
  GAP,
  SIZE,
  ST,
  TL,
  layoutDispatch,
  layoutSequence,
  layoutSets,
  layoutTimeline,
  pack,
  panelHeight,
  panelWidth,
  type Variant,
} from './layout'
import type { DispatchPanel, LanesData, LanesPanel, SequencePanel, SetsPanel, TimelinePanel } from './model'

/**
 * The lanes stage: server markup only, in the static figures' svg
 * vocabulary (`.vz-*`): glyphs in the glyph fill with the `line` outline,
 * connectors at 1.5 px, labels mono 12 in the secondary ink inside the
 * lanes, what a run printed or invoked in the result amber, the one mark per
 * panel in the neutral `changed` role (never lime). Each variant packs its
 * panels into rows (`pack`); CSS shows the variant the frame is wide enough
 * for. Paper keeps every panel whole.
 */

const r1 = (n: number) => Math.round(n * 10) / 10
const px = (n: number) => Math.round(n) + 0.5
const MARK = { '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties
const tw = (t: string) => monoWidth(t, SIZE.small)

function Svg({ width, height, id, heading, children }: { width: number; height: number; id: string; heading: string; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      data-viz-panel={id}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className="vz-s block"
      style={{ maxWidth: toRem(width), height: toRem(height) }}
      fontSize={SIZE.value}
    >
      <text x={0} y={14} className="vz-u" data-viz-part="panel-heading">
        {heading}
      </text>
      {children}
    </svg>
  )
}

function Arrow({ pts, id, className, marked, dashed }: { pts: Point[]; id: string; className?: string; marked?: boolean; dashed?: boolean }) {
  return (
    <g data-edge={id} data-changed={marked ? '' : undefined} className={clsx(marked && 'vz-cm', className)} style={marked ? MARK : undefined}>
      <path d={routePath(pts, 8, 2)} className={clsx('vz-e', dashed && 'vz-d')} />
      <path d={arrowHead(pts)} className="vz-ah" />
    </g>
  )
}

const Lines = ({ x, y, lines, className = 'vz-u', anchor }: { x: number; y: number; lines: string[]; className?: string; anchor?: 'start' | 'middle' | 'end' }) => (
  <>
    {lines.map((l, i) => (
      <text key={i} x={r1(x)} y={r1(y + i * SIZE.line)} className={className} textAnchor={anchor}>
        {l}
      </text>
    ))}
  </>
)

// --- timeline ----------------------------------------------------------------

function TimelineSvg({ p, width }: { p: TimelinePanel; width: number }) {
  const g = layoutTimeline(p, width)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {p.rows.map((row, i) => {
        const top = g.rowTop(i)
        const y = top + TL.track
        const ghosts = row.marks.some((m) => m.kind === 'ghost')
        return (
          <g key={row.id} data-viz-row={row.id}>
            {i ? <path d={`M0 ${px(top)}H${width}`} className="vz-hl" /> : null}
            <text x={TL.x0} y={top + TL.label} className="vz-u" data-viz-part="lane-label">
              {row.label}
            </text>
            {row.bands.map((b, k) => {
              const label = g.bandLabel(b.from, b.to)
              return (
                <g key={k} data-viz-part="band" data-from={b.from} data-to={b.to}>
                  <rect x={g.x(b.from)} y={y - 9} width={r1(g.x(b.to) - g.x(b.from))} height={18} rx={radius.chip.px} className="vz-p" />
                  {label ? (
                    <text x={r1((g.x(b.from) + g.x(b.to)) / 2)} y={top + TL.below} className="vz-m vz-12 vz-c">
                      {label}
                    </text>
                  ) : null}
                </g>
              )
            })}
            <path d={`M${TL.x0} ${y}H${width - TL.right}`} className="vz-hl" />
            {row.marks.map((m, k) => {
              const x = g.x(m.t)
              const key = `${m.kind}-${m.t}-${k}`
              if (m.kind === 'call')
                return (
                  <g key={key} data-mark="call" data-t={m.t}>
                    <path d={`M${x} ${y - TL.tick}V${y + TL.tick}`} className="vz-e vz-l" strokeWidth={strokeWidth.connector} />
                    <text x={x} y={top + TL.below} className="vz-u vz-c">
                      {m.label}
                    </text>
                  </g>
                )
              if (m.kind === 'ghost')
                return (
                  <g key={key} data-mark="ghost" data-t={m.t}>
                    <path d={`M${x} ${y - TL.tick}V${y + TL.tick}`} className="vz-e vz-l vz-d" strokeWidth={strokeWidth.outline} />
                  </g>
                )
              if (m.kind === 'drop')
                return (
                  <g key={key} data-mark="drop" data-t={m.t}>
                    <circle cx={x} cy={y} r={TL.drop} className="vz-l" fill="none" strokeWidth={strokeWidth.outline} />
                  </g>
                )
              if (m.kind === 'release')
                return (
                  <g key={key} data-mark="release" data-t={m.t}>
                    <circle cx={x} cy={y} r={TL.release} className="vz-g vz-l" strokeWidth={strokeWidth.connector} />
                    <text x={x} y={top + TL.below} className="vz-m vz-12 vz-c">
                      opens
                    </text>
                  </g>
                )
              return (
                <g key={key} data-mark="invoke" data-t={m.t} data-arg={m.label}>
                  {ghosts ? <path d={`M${x} ${y - TL.tick - 2}V${y + TL.tick + 2}`} className="vz-e vz-l" strokeWidth={strokeWidth.connector} /> : null}
                  <circle cx={x} cy={y} r={TL.run} className="vz-r" />
                  <text x={x} y={top + TL.below} className="vz-r vz-12 vz-c">
                    {m.label}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
      <g data-viz-part="axis">
        <path d={`M${TL.x0} ${px(g.axisY)}H${width - TL.right}`} className="vz-e vz-l" strokeWidth={strokeWidth.outline} />
        {p.ticks.map((t) => (
          <g key={t}>
            <path d={`M${g.x(t)} ${g.axisY}V${g.axisY + 4}`} className="vz-e vz-l" strokeWidth={strokeWidth.outline} />
            <text x={g.x(t)} y={g.axisY + 17} className="vz-m vz-12 vz-c">
              {t === p.ticks[p.ticks.length - 1] ? `${t} ms` : t}
            </text>
          </g>
        ))}
      </g>
      <Lines x={0} y={g.notesTop + 12} lines={g.notes} />
    </Svg>
  )
}

// --- dispatch ------------------------------------------------------------------

function DispatchSvg({ p }: { p: DispatchPanel }) {
  const g = layoutDispatch(p)
  const pillL = g.cx - g.pillW / 2
  const pillR = g.cx + g.pillW / 2
  const listeners = new Set(p.steps.map((s) => s.at))
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {!p.compact ? (
        <g data-viz-part="lane-labels">
          <text x={g.lx} y={g.firstY - 20} className="vz-u vz-c">
            capture · 1
          </text>
          <text x={g.rx} y={g.firstY - 20} className="vz-u vz-c">
            bubble · 3
          </text>
        </g>
      ) : null}
      <Arrow id="capture" pts={[{ x: g.lx, y: g.firstY - (p.compact ? 22 : 12) }, { x: g.lx, y: g.targetY }, { x: pillL, y: g.targetY }]} />
      <Arrow id="bubble" pts={[{ x: pillR, y: g.targetY }, { x: g.rx, y: g.targetY }, { x: g.rx, y: g.firstY - (p.compact ? 24 : 12) }]} />
      {p.path.map((at) => {
        const y = g.rowY(at)
        const quiet = !listeners.has(at)
        return (
          <g key={at} data-node={at}>
            <rect x={px(pillL)} y={px(y - DP.pill / 2)} width={Math.round(g.pillW) - 1} height={DP.pill - 1} rx={radius.chip.px} className="vz-g" strokeWidth={strokeWidth.outline} />
            <text x={g.cx} y={r1(y + 4.5)} className={clsx('vz-c', quiet && 'vz-m')}>
              {at}
            </text>
          </g>
        )
      })}
      {!p.compact ? (
        <text x={g.cx} y={r1(g.targetY + DP.pill / 2 + 4 + 2 * DP.badge + 14)} className="vz-u vz-c" data-viz-part="target-label">
          target · 2
        </text>
      ) : null}
      {g.cut ? (
        <g data-viz-part="cut" data-changed="" className="vz-cm" style={MARK} data-edge="cut">
          <path
            d={g.cut.vertical ? `M${g.cut.x} ${g.cut.y - 9}V${g.cut.y + 9}` : `M${g.cut.x - 11} ${g.cut.y}H${g.cut.x + 11}`}
            className="vz-e"
          />
        </g>
      ) : null}
      {p.steps.map((s, i) => {
        const b = g.badges[i]
        const skipped = p.cutAfter !== undefined && s.n > p.cutAfter
        return (
          <g key={s.n} data-badge={s.n} data-phase={s.phase} data-at={s.at} data-ran={s.ran ? '' : undefined}>
            <circle cx={b.x} cy={b.y} r={DP.badge} className={skipped ? 'vz-g vz-l vz-d' : 'vz-g'} strokeWidth={strokeWidth.outline} />
            <text x={b.x} y={r1(b.y + 4)} className={clsx('vz-c vz-12', skipped && 'vz-m')}>
              {s.n}
            </text>
          </g>
        )
      })}
      <g data-viz-part="logs">
        {p.steps.map((s, i) => (
          <text key={s.n} x={0} y={r1(g.logsTop + 12 + i * SIZE.line)} className={clsx('vz-12', s.ran ? 'vz-r' : 'vz-m')}>
            {`${s.n} ${s.log}`}
          </text>
        ))}
      </g>
    </Svg>
  )
}

// --- sequence ------------------------------------------------------------------

function SequenceSvg({ p, width }: { p: SequencePanel; width: number }) {
  const g = layoutSequence(p, width)
  return (
    <Svg width={g.width} height={g.height} id={p.id} heading={p.heading}>
      {/* The browser's lane, shaded: everything in it is seen by the browser (the front channel). */}
      <rect x={0} y={g.linesTop - 22} width={r1(g.laneW)} height={g.linesBottom - g.linesTop + 26} rx={radius.glyph.px} className="vz-p" data-viz-part="front-lane" />
      {p.parties.map((x) => (
        <g key={x.id} data-party={x.id}>
          <text x={g.col[x.id]} y={g.linesTop - 6} className="vz-t vz-c">
            {x.label}
          </text>
          <path d={g.lifelines[x.id].map(([a, b]) => `M${px(g.col[x.id])} ${r1(a)}V${r1(b)}`).join('')} className="vz-hl" />
        </g>
      ))}
      {g.messages.map((m) => {
        const msg = p.messages.find((x) => x.n === m.n)!
        const self = msg.channel === 'self'
        return (
          <g key={m.n} data-message={m.n} data-channel={msg.channel} data-from={msg.from} data-to={msg.to}>
            {m.lines.map((l, i) => (
              <text key={i} x={r1(m.labelX)} y={r1(m.top + 11 + i * 14)} textAnchor={m.anchor} className={i === 0 ? 'vz-u' : 'vz-m vz-12'}>
                {l}
              </text>
            ))}
            {self ? (
              <circle cx={m.x1} cy={m.y} r={DOT_R} className="vz-ah vz-l" />
            ) : (
              <Arrow id={`m${m.n}`} pts={[{ x: m.x1, y: m.y }, { x: m.x2, y: m.y }]} />
            )}
          </g>
        )
      })}
      {g.holds.map((h) => (
        <g key={h.party} data-holds={h.party}>
          <Lines x={0} y={h.y + 12} lines={h.lines} />
        </g>
      ))}
      <Lines x={0} y={g.notes.y + 12} lines={g.notes.lines} className="vz-m vz-12" />
    </Svg>
  )
}

// --- sets ----------------------------------------------------------------------

function SetsSvg({ p }: { p: SetsPanel }) {
  const g = layoutSets(p)
  const W = g.width
  const t = g.top
  const notes = <Lines x={0} y={g.notesTop + 12} lines={g.notes} />
  if (p.mode === 'values') {
    const aR = (W + ST.overlap) / 2
    const bL = (W - ST.overlap) / 2
    const bracket = (x1: number, x2: number, y: number, label: string, part: string, marked?: boolean) => (
      <g data-viz-part={part} data-changed={marked ? '' : undefined} data-edge={part} className={marked ? 'vz-cm' : undefined} style={marked ? MARK : undefined}>
        <path d={`M${x1 + 1} ${y - 5}V${y}H${x2 - 1}V${y - 5}`} className="vz-e" />
        <text x={r1((x1 + x2) / 2)} y={y + 15} className="vz-u vz-c">
          {label}
        </text>
      </g>
    )
    return (
      <Svg width={W} height={g.height} id={p.id} heading={p.heading}>
        <g data-node="A">
          <rect x={0.5} y={px(t)} width={aR - 1} height={ST.band} rx={radius.glyph.px} className="vz-l" fill="none" strokeWidth={strokeWidth.outline} />
        </g>
        <g data-node="B">
          <rect x={px(bL)} y={px(t + ST.offset)} width={W - bL - 1} height={ST.band} rx={radius.glyph.px} className="vz-l" fill="none" strokeWidth={strokeWidth.outline} />
        </g>
        <rect data-changed="" data-node="both" x={px(bL) + 2} y={px(t + ST.offset) + 2} width={aR - bL - 5} height={ST.band - ST.offset - 5} rx={radius.chip.px} className="vz-ch" strokeWidth={strokeWidth.mark} />
        <text x={8} y={t + 16} className="vz-t">
          {p.left.label}
        </text>
        <text x={8} y={t + 40} data-viz-part="sample">
          {p.left.sample}
        </text>
        <text x={W - 8} y={t + ST.offset + ST.band - 8} className="vz-t" textAnchor="end">
          {p.right.label}
        </text>
        <text x={W - 8} y={t + ST.offset + 20} textAnchor="end" data-viz-part="sample">
          {p.right.sample}
        </text>
        {p.both.sample.map((l, i) => (
          <text key={i} x={r1(W / 2)} y={t + ST.offset + 15 + i * 15} className="vz-c" data-viz-part="sample">
            {l}
          </text>
        ))}
        {bracket(bL, aR, t + ST.band + ST.offset + 12, p.both.label, 'both-span', true)}
        {bracket(0, W, t + ST.band + ST.offset + 12 + ST.bracket, p.union, 'union-span')}
        {notes}
      </Svg>
    )
  }
  if (p.mode === 'members') {
    const cw = (W - ST.cardGap) / 2
    return (
      <Svg width={W} height={g.height} id={p.id} heading={p.heading}>
        {p.cards.map((c, i) => {
          const x = i * (cw + ST.cardGap)
          const h = ST.card * (1 + c.members.length)
          return (
            <g key={c.label} data-node={c.label} data-changed={c.marked ? '' : undefined}>
              <rect x={px(x)} y={px(t)} width={Math.round(cw) - 1} height={h - 1} rx={radius.glyph.px} className={c.marked ? 'vz-ch' : 'vz-g'} strokeWidth={c.marked ? strokeWidth.mark : strokeWidth.outline} />
              <text x={x + 8} y={t + 18} className="vz-t">
                {c.label}
              </text>
              <path d={c.members.map((_, k) => `M${r1(x + 1)} ${px(t + ST.card * (k + 1))}H${r1(x + cw - 1)}`).join('')} className="vz-hl" />
              {c.members.map((m, k) => {
                const [name, why] = m.split(' ')
                return (
                  <g key={m}>
                    <text x={x + 8} y={t + ST.card * (k + 1) + 18.5} className={why ? 'vz-m' : undefined} data-member={name}>
                      {name}
                    </text>
                    {why ? (
                      <text x={x + cw - 8} y={t + ST.card * (k + 1) + 18.5} className="vz-m vz-12" textAnchor="end">
                        {why}
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </g>
          )
        })}
        {notes}
      </Svg>
    )
  }
  return (
    <Svg width={W} height={g.height} id={p.id} heading={p.heading}>
      {p.pairs.map((pair, i) => {
        const y = t + i * ST.pair
        const w1 = tw(pair.left) + 2 * ST.pillPad
        const w2 = tw(pair.right) + 2 * ST.pillPad
        const x2 = w1 + 8
        return (
          <g key={i} data-pair={i}>
            <rect x={0.5} y={px(y)} width={Math.round(w1) - 1} height={23} rx={radius.chip.px} className="vz-g" strokeWidth={strokeWidth.outline} />
            <text x={ST.pillPad} y={y + 16} className="vz-12">
              {pair.left}
            </text>
            <rect x={px(x2)} y={px(y)} width={Math.round(w2) - 1} height={23} rx={radius.chip.px} className="vz-g" strokeWidth={strokeWidth.outline} />
            <text x={r1(x2 + ST.pillPad)} y={y + 16} className="vz-12">
              {pair.right}
            </text>
            <text x={r1(x2 + w2 + 10)} y={y + 16} className={clsx('vz-12', pair.result === 'never' ? 'vz-r' : 'vz-m')} data-viz-part="result">
              {pair.result}
            </text>
          </g>
        )
      })}
      {notes}
    </Svg>
  )
}

function Panel({ p, v }: { p: LanesPanel; v: Variant }) {
  if (p.kind === 'timeline') return <TimelineSvg p={p} width={panelWidth(p, v)} />
  if (p.kind === 'dispatch') return <DispatchSvg p={p} />
  if (p.kind === 'sequence') return <SequenceSvg p={p} width={panelWidth(p, v)} />
  return <SetsSvg p={p} />
}

function VariantStage({ data, v }: { data: LanesData; v: Variant }) {
  return (
    <div data-viz-variant={v} className={clsx('grid content-start', v === 'wide' ? 'hidden vz-wide:grid' : 'vz-wide:hidden')} style={{ rowGap: toRem(GAP.row) }}>
      {pack(data, v).map((row, r) => (
        <div key={r} className="flex items-start" style={{ columnGap: toRem(GAP.column), height: toRem(row.height) }}>
          {row.panels.map((i) => {
            const p = data.panels[i]
            return (
              <div
                key={p.id}
                data-viz-section={p.id}
                className="min-w-0 print:break-inside-avoid"
                style={{ flex: `0 1 ${toRem(panelWidth(p, v))}`, height: toRem(panelHeight(p, v)) }}
              >
                <Panel p={p} v={v} />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function LanesStage({ data }: StaticStageProps<LanesData>) {
  return (
    <>
      <VariantStage data={data} v="narrow" />
      <VariantStage data={data} v="wide" />
    </>
  )
}
