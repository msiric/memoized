'use client'

import { AnimatePresence, m } from 'framer-motion'
import { useMemo, useRef, type CSSProperties } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { changed, ink, radius, strokeWidth, surface, svgInk, type as typeScale } from '../../primitives/tokens-v3'
import { useFlip } from '../../shell/flip'
import { presence } from '../../shell/motion'
import type { StageProps } from '../../shell/types'
import { H_CLS } from '../../shell/vars'
import { arrowHead } from '../../substrates/box-arrow'
import { fade, r1, useFades, useMoves, type Place } from '../../substrates/svg-motion'
import { remHeights, toRem } from '../../substrates/units'
import { G, ROW_LABELS, TABLE, arcPath, headingItems, headingLabel, tagBox, tagNames, type DpTableMetrics } from './layout'
import { ITEM_ID, J_ID, OUTPUT_ID, READ_ID, cellId, type DPState } from './model'

/**
 * dp-table renderer (R4 shared visual 6): state -> table, tags, arc, heading.
 *
 * The table is one svg: the cells never move; each holds T or F (true or
 * false, muted). The step's write is the `changed` glyph (doubled neutral
 * edge on the white/5 tint, H3 R2 Q9, never lime) and its dependency is an
 * arrow over the indices from the cell read (`j - x`) to the cell written,
 * landing with the cell. Under the cells a bar marks every cell written for
 * the current item, the row labelled "this item" in the gutter, so an arrow
 * leaving a barred cell reads as the item used twice. Two tags name the
 * written index and the read one, each in its own lane; the index tag
 * slides on the `move` spring on the glyph beat and the read tag moves with
 * it. The heading names the items and the current one (tinted when it
 * writes nothing) and, at the end, what the program printed.
 */

/** A tag at its own origin (the caller translates it): the panel fill, a 1 px `line` edge, the name in mono 12. */
function TagBody({ name, w, changed }: { name: string; w: number; changed?: boolean }) {
  return (
    <>
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={TABLE.tag - 1}
        rx={radius.chip.px}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
        className={changed ? 'vz-ch' : 'vz-p vz-l'}
      />
      <text x={r1(w / 2)} y={r1(TABLE.tag / 2 + 4)} className="vz-12 vz-c">
        {name}
      </text>
    </>
  )
}

export function DpTableStage({ step, codePane, layout, motion: gate, label, index }: StageProps<DPState>) {
  const metrics = layout.detail as DpTableMetrics
  const g = metrics.table
  const state = step.state
  const tags = tagNames(state.names)
  const focus = useMemo(() => new Set(step.focus), [step.focus])
  const svg = useRef<SVGSVGElement>(null)
  const root = useRef<HTMLDivElement>(null)
  useFlip(root, gate, step)

  // The state shown before this step (Back included), held for the whole step so a re-render during its beats
  // keeps what is leaving.
  const held = useRef<{ step: typeof step; from: DPState; shown: DPState }>({
    step,
    from: state,
    shown: state,
  })
  if (held.current.step !== step) {
    const shown = held.current.shown
    held.current = {
      step,
      from: shown.f.length === state.f.length ? shown : state,
      shown: state,
    }
  }
  const from = held.current.from

  const jBox = state.j === null ? null : tagBox(g, tags.j, state.j, 'j')
  const readBox = state.read === null ? null : tagBox(g, tags.read, state.read, 'read')
  const places = useMemo(() => {
    const out = new Map<string, Place>()
    if (jBox) out.set(J_ID, { x: jBox.x, y: jBox.y })
    if (readBox) out.set(READ_ID, { x: readBox.x, y: readBox.y })
    return out
    // A function of the step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])
  useMoves(svg, gate, step, places)
  useFades(svg, gate, step)

  const jAppears = from.j === null && state.j !== null
  const jLeaves = from.j !== null && state.j === null ? from : null
  const arc = state.j !== null && state.read !== null ? arcPath(g, state.read, state.j) : null
  const reused = state.read !== null && state.pass.includes(state.read)
  const newBar = state.j !== null && !from.pass.includes(state.j) ? state.j : null
  const out = state.output.join(' ')
  const itemLit = focus.has(ITEM_ID)

  return (
    <div
      ref={root}
      className={clsx(
        'relative flex h-full flex-col',
        'vz-wide:grid vz-wide:items-center vz-wide:[grid-template-columns:var(--vz-cols-md)] vz-wide:[grid-template-rows:minmax(0,1fr)] vz-col:[grid-template-columns:var(--vz-cols-xl)]',
      )}
      style={
        {
          gap: toRem(G.gap),
          columnGap: toRem(G.columnGap),
          '--vz-cols-md': `${toRem(metrics.codeColumn.md)} minmax(0, 1fr)`,
          '--vz-cols-xl': `${toRem(metrics.codeColumn.xl)} minmax(0, 1fr)`,
        } as CSSProperties
      }
    >
      <div className="flex min-w-0 flex-col vz-wide:col-start-1 vz-wide:row-start-1 vz-wide:self-start vz-wide:[&>*]:!w-full vz-wide:[&>*]:self-stretch">
        {codePane}
      </div>

      {/* The machine: the table. Its accessible name spells every cell, the item and the write's source. */}
      <div role="img" aria-label={label} className="flex min-w-0 flex-col vz-wide:col-start-2 vz-wide:row-start-1">
        <div
          data-viz-region="table"
          className={clsx(
            'relative flex min-w-0 flex-col border-y border-transparent px-1.5 py-1.5 vz-wide:py-2 vz-tight:px-1',
            radius.row.cls,
            surface.panel,
            H_CLS,
          )}
          style={remHeights(metrics.panel, { gap: toRem(G.labelGap) })}
        >
          <div className="flex h-4 min-w-0 shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap">
            <span className={clsx(typeScale.label.cls, ink.secondary)}>{headingLabel(state)}</span>
            {headingItems(state).map((v) => {
              const isItem = v.name === state.names.item
              return (
                <span key={v.name} data-var={v.name} className="inline-flex min-w-0 items-center gap-1">
                  <span className={clsx(typeScale.tag.cls, ink.muted)}>{v.name}</span>
                  {isItem ? (
                    // The item is a readout: it takes its new value with the step, tinted on the step where it writes nothing.
                    <span
                      data-glyph={ITEM_ID}
                      data-focus={itemLit || undefined}
                      className={clsx(typeScale.meta.cls, ink.base, radius.chip.cls, 'px-0.5', itemLit && changed.neutral)}
                    >
                      {v.value}
                    </span>
                  ) : (
                    <span className={clsx(typeScale.meta.cls, ink.base)}>{v.value}</span>
                  )}
                </span>
              )
            })}
            {/* What the program printed (the observed trace), landing on the third beat. */}
            <span data-viz-region="console" className="ml-auto inline-flex min-w-0 items-center">
              <AnimatePresence key={gate.epoch} initial={false} mode="popLayout" custom={{ gate }}>
                {out ? (
                  <m.span
                    key={`out:${gate.epoch}`}
                    data-out={0}
                    data-focus={focus.has(OUTPUT_ID) || undefined}
                    className={clsx('inline-flex items-center whitespace-pre', typeScale.meta.cls)}
                    {...presence(OUTPUT_ID, gate, { from: { y: 1 }, to: { y: 1 } }, { beat: 'land' })}
                  >
                    <span aria-hidden className={ink.muted}>
                      {'› '}
                    </span>
                    <span className={clsx(ink.result, radius.chip.cls, 'px-0.5', focus.has(OUTPUT_ID) && surface.resultTint)}>{out}</span>
                  </m.span>
                ) : null}
              </AnimatePresence>
            </span>
          </div>
          <div className="flex min-h-0 shrink-0 items-start justify-center" style={{ height: toRem(g.height) }}>
            <svg
              ref={svg}
              aria-hidden
              data-viz-part="dp-table"
              viewBox={`0 0 ${g.width} ${g.height}`}
              width="100%"
              data-viz-width={g.width}
              className="vz-s block"
              style={{ maxWidth: toRem(g.width), height: toRem(g.height) }}
              fontSize={G.text}
            >
              {/* Row labels in the gutter: the table's name by its cells, and what the bars mark. */}
              <g data-row-labels className="vz-12 vz-m">
                <text x={0} y={r1(g.cellTop + TABLE.cell / 2 + 4)}>
                  {ROW_LABELS.cells}
                </text>
                <text x={0} y={r1(g.barY + TABLE.bar / 2 + 4)} data-viz-part="bar-label">
                  {ROW_LABELS.bar}
                </text>
              </g>
              {/* The write's dependency: from the cell read to the cell written, landing with the write. */}
              {arc ? (
                <g
                  key={`arc-${index}`}
                  data-viz-part="arc"
                  data-from={cellId(state.read!)}
                  data-to={cellId(state.j!)}
                  data-reused={reused || undefined}
                  data-follows={J_ID}
                  data-fade={fade('in', 'enter', 'glyph')}
                  // The changed role's connector (zinc-300 at 2.5 px, `.vz-cm`), never lime.
                  data-edge=""
                  className="vz-cm"
                  style={
                    {
                      '--vz-sw': `${strokeWidth.nowConnector}px`,
                    } as CSSProperties
                  }
                >
                  <path d={arc.d} className="vz-e" />
                  <path d={arrowHead([arc.tail, arc.head])} className="vz-ah" />
                </g>
              ) : null}
              <g data-indices className="vz-12 vz-m">
                {g.x.map((x, i) => (
                  <text key={i} x={r1(x + TABLE.cell / 2)} y={g.indexY + 11} className="vz-c">
                    {i}
                  </text>
                ))}
              </g>
              {state.f.map((v, i) => {
                const lit = state.j === i
                return (
                  <g
                    key={i}
                    data-node={cellId(i)}
                    data-cell={cellId(i)}
                    data-value={String(v)}
                    data-changed={lit || undefined}
                    data-read={state.read === i || undefined}
                    className={svgInk.line}
                  >
                    <rect
                      x={r1(g.x[i]) + 0.5}
                      y={g.cellTop + 0.5}
                      width={TABLE.cell - 1}
                      height={TABLE.cell - 1}
                      rx={radius.glyph.px}
                      strokeWidth={lit ? strokeWidth.mark : strokeWidth.outline}
                      className={lit ? 'vz-ch' : 'vz-g'}
                    />
                    <text x={r1(g.x[i] + TABLE.cell / 2)} y={g.cellTop + TABLE.cell / 2 + 4.5} className={clsx('vz-c', !v && 'vz-m')}>
                      {v ? 'T' : 'F'}
                    </text>
                  </g>
                )
              })}
              {/* "This item": a bar under every cell written for the current item; the new one lands with its write. */}
              <g data-viz-part="pass">
                {state.pass.map((i) => (
                  <rect
                    key={`bar-${i}-${state.x}`}
                    data-bar={cellId(i)}
                    data-follows={i === newBar ? cellId(i) : undefined}
                    data-fade={i === newBar ? fade('in', 'enter', 'glyph') : undefined}
                    x={r1(g.x[i])}
                    y={g.barY}
                    width={TABLE.cell}
                    height={TABLE.bar}
                    className="vz-nd"
                  />
                ))}
              </g>
              {/* The tags: the written index and the read one, each in its lane; both leave at the end and return with Back. */}
              {jLeaves && jLeaves.j !== null ? (
                <g key={`ghost-j-${index}`} data-ghost="" data-glyph={J_ID} data-fade={fade('out', 'exit', 'glyph')} style={{ opacity: 0 }}>
                  <g transform={`translate(${tagBox(g, tags.j, jLeaves.j, 'j').x} ${g.lanes.j})`}>
                    <TagBody name={tags.j} w={tagBox(g, tags.j, jLeaves.j, 'j').w} />
                  </g>
                  {jLeaves.read !== null ? (
                    <g transform={`translate(${tagBox(g, tags.read, jLeaves.read, 'read').x} ${g.lanes.read})`}>
                      <TagBody name={tags.read} w={tagBox(g, tags.read, jLeaves.read, 'read').w} />
                    </g>
                  ) : null}
                </g>
              ) : null}
              {jBox ? (
                <g
                  key="j"
                  data-tag=""
                  data-move={J_ID}
                  data-glyph={J_ID}
                  data-tag-name={tags.j}
                  data-at={cellId(state.j!)}
                  data-fade={jAppears ? fade('in', 'enter', 'glyph') : undefined}
                  transform={`translate(${jBox.x} ${jBox.y})`}
                >
                  <TagBody name={tags.j} w={jBox.w} changed={focus.has(J_ID)} />
                </g>
              ) : null}
              {readBox ? (
                <g
                  key="read"
                  data-tag=""
                  data-move={READ_ID}
                  data-follows={J_ID}
                  data-tag-name={tags.read}
                  data-at={cellId(state.read!)}
                  data-fade={jAppears ? fade('in', 'enter', 'glyph') : undefined}
                  transform={`translate(${readBox.x} ${readBox.y})`}
                >
                  <TagBody name={tags.read} w={readBox.w} />
                </g>
              ) : null}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
