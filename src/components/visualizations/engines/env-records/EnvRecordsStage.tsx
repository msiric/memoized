import clsx from 'clsx'
import { Fragment } from 'react'
import { ink, radius, strokeWidth, type as typeScale } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import {
  HEADING,
  HINT,
  SECTION_GAP,
  hasHint,
  SIZE,
  edgeEnds,
  layoutDiagramSafe,
  type DiagramScene,
  type LaidBox,
  type LaidEdge,
  type LaidText,
  type SectionScene,
} from './layout'
import { isFunction, type EnvDiagram, type EnvSection } from './model'
import { platesPath, textWidth, type TextRun } from '../../substrates/box-arrow'
import { litRows, pathCss, pathLabel } from './paths'

/**
 * The environment-records stage: one SVG per section per sub-width, chosen by
 * CSS alone (the frame's `vz-wide` container query picks the variant, D19, a container query on
 * the section picks the width), so the server markup is final and no script
 * ever measures anything. Colors come from §2.1 roles as classes, with
 * `print:` twins for the light print roles.
 */

/**
 * Container-query classes per sub-width. Literal strings, so Tailwind emits
 * them; `stage.test.ts` fails if a layout asks for a width missing here.
 */
export const CONTAINER: Record<number, { show: string; hide: string }> = {
  // In rem (width / 16), so at a larger root font size a narrower layout is
  // picked and drawn larger (D19): the SVG is sized in rem too.
  343: {
    show: '[@container(min-width:21.4375rem)]:block',
    hide: '[@container(min-width:21.4375rem)]:hidden',
  },
  359: {
    show: '[@container(min-width:22.4375rem)]:block',
    hide: '[@container(min-width:22.4375rem)]:hidden',
  },
  734: {
    show: '[@container(min-width:45.875rem)]:block',
    hide: '[@container(min-width:45.875rem)]:hidden',
  },
}

/**
 * Role classes (`src/styles/tailwind.css`, `.vz-*`): §2.1 roles with print
 * twins, kept short for the markup budget. Links and glyph outlines draw in
 * `currentColor`, which is `line` grey at rest; the hover path sets it to
 * the `now` lime on what a function remembers (R1, R11, `paths.ts`).
 */
const C = {
  glyph: 'vz-g',
  /** A function object: its fill takes the traced tint. */
  fnGlyph: 'vz-fb',
  /** The 44 px touch target around a function object (R11). */
  hit: 'vz-hit',
  hairline: 'vz-hl',
  muted: 'vz-m',
  line: 'vz-l',
  /** Arrowheads and reference dots: filled in the link's colour. */
  head: 'vz-ah',
  /** A binding row's tint: clear until the row is traced. */
  rowTint: 'vz-rt',
  /** The clear ground under an unused record's text: the hatch never runs through it (R16). */
  plate: 'vz-p',
  /** A link's label: muted at rest, lit with its link (R2M-14, `data-o` names the path's owner). */
  edgeLabel: 'vz-el',
  result: 'vz-r',
  hatch: 'vz-x',
} as const

const r1 = (n: number) => Math.round(n * 10) / 10

/** The touch band around a function object: 31 + 2 x 7 = 45 px (R11, WCAG 2.5.5). */
export const HIT = 7

export type Band = { l: number; r: number; t: number; b: number }

/**
 * Each function's band, per side: HIT, or half the gap to a neighbouring
 * function on that side, so two targets never overlap (the tighter rows of
 * the narrow layouts are a few px apart sideways; boxes are 44 px wide or
 * more, so the target still meets 44 px).
 */
export function hitBands(boxes: LaidBox[]): Map<string, Band> {
  const fns = boxes.filter((b) => b.kind === 'function')
  const out = new Map<string, Band>()
  for (const f of fns) {
    const a = f.rect
    const band: Band = { l: HIT, r: HIT, t: HIT, b: HIT }
    for (const g of fns) {
      if (g === f) continue
      const o = g.rect
      const rows = a.y - 2 * HIT < o.y + o.h && o.y < a.y + a.h + 2 * HIT
      const cols = a.x - 2 * HIT < o.x + o.w && o.x < a.x + a.w + 2 * HIT
      const half = (gap: number) => Math.max(0, Math.floor(gap / 2))
      if (rows && o.x >= a.x + a.w) band.r = Math.min(band.r, half(o.x - a.x - a.w))
      if (rows && o.x + o.w <= a.x) band.l = Math.min(band.l, half(a.x - o.x - o.w))
      if (cols && o.y >= a.y + a.h) band.b = Math.min(band.b, half(o.y - a.y - a.h))
      if (cols && o.y + o.h <= a.y) band.t = Math.min(band.t, half(a.y - o.y - o.h))
    }
    out.set(f.id, band)
  }
  return out
}

const px = (n: number) => Math.round(n) + 0.5

/**
 * Each box group carries `data-node` (its id), which the stress harness
 * reads. A function box is focusable and named (`label`): hovering,
 * focusing or tapping it traces its `[[Environment]]` path (`paths.ts`).
 * Rows a function can read carry a tint (`data-b`, the binding name).
 */
function Box({
  box,
  hatch,
  label,
  tints,
  band,
}: {
  box: LaidBox
  hatch: string
  label?: string
  tints?: Set<string>
  band?: Band
}) {
  const { x, y, w, h } = box.rect
  const X = px(x)
  const Y = px(y)
  const W = Math.round(w) - 1
  const H = Math.round(h) - 1
  if (box.kind === 'function' || box.kind === 'slot') {
    const slot = box.kind === 'slot'
    return (
      <g data-node={box.id} tabIndex={label ? 0 : undefined} role={label ? 'img' : undefined} aria-label={label}>
        {slot || !band ? null : (
          // A transparent band around the box: a 45 px target on touch (R11).
          // The focus ring is drawn on the box itself (tailwind.css), not the group.
          <rect
            x={X - band.l}
            y={Y - band.t}
            width={W + band.l + band.r}
            height={H + band.t + band.b}
            className={C.hit}
          />
        )}
        <rect
          x={X}
          y={Y}
          width={W}
          height={H}
          rx={radius.glyph.px}
          className={slot ? clsx('vz-d fill-none', C.line) : C.fnGlyph}
        />
        <text
          x={r1(x + w / 2)}
          y={r1(y + h / 2 + 4)}
          // `vz-f`: the 12 px medium title, centred (tailwind.css, the markup budget).
          className={slot ? clsx('vz-12 vz-c', C.muted) : 'vz-f'}
        >
          {slot ? (
            box.title[0]
          ) : (
            <>
              {/* `.vz-f > tspan`: the ƒ glyph in the muted role. */}
              <tspan>ƒ</tspan>
              {` ${box.title[0]}`}
            </>
          )}
        </text>
      </g>
    )
  }
  const headerH = 2 * SIZE.headerPad + box.title.length * SIZE.headerLine
  const headerBase = (i: number) => r1(y + SIZE.headerPad + 12 + i * SIZE.headerLine)
  const rowBase = (top: number) => r1(top + 18.5)
  return (
    // Row text inherits 13 px ink from the svg (markup budget); unused records
    // mute it, upright (no italic as a state, N10).
    <g data-node={box.id} className={box.unused ? C.muted : undefined}>
      <rect
        x={X}
        y={Y}
        width={W}
        height={H}
        rx={radius.glyph.px}
        className={clsx(C.glyph, box.unused && 'vz-d')}
      />
      {box.unused ? (
        <>
          <rect x={X} y={Y} width={W} height={H} rx={radius.glyph.px} fill={`url(#${hatch})`} />
          {/* R16: a clear plate under every run of text, so the hatch never runs through it. */}
          <path d={unusedPlates(box, headerBase, rowBase)} className={C.plate} />
        </>
      ) : null}
      {box.title.map((line, i) => (
        <text
          key={i}
          x={r1(x + SIZE.cellPad)}
          y={headerBase(i)}
          // `vz-t`: the header role, 12 px medium (tailwind.css).
          className="vz-t"
        >
          {line}
        </text>
      ))}
      {box.rows.length ? (
        // Every divider of the record in one path (the markup budget, §6.5).
        <path
          d={box.rows
            .map((row, i) => {
              const sep = i === 0 ? y + headerH : row.top
              const bottomY = row.top + SIZE.row - (i === box.rows.length - 1 ? 1 : 0)
              return `M${r1(x + 1)} ${px(sep)}H${r1(x + w - 1)}M${px(x + row.nameWidth)} ${row.top + 1}V${bottomY}`
            })
            .join('')}
          className={C.hairline}
        />
      ) : null}
      {box.rows.map((row) => (
        <Fragment key={row.name}>
          {tints?.has(row.name) ? (
            // Inset inside the row's dividers, chip radius, so it never
            // fights the record's rounded corners.
            <rect
              data-b={row.name}
              x={X + 3}
              y={row.top + 3.5}
              width={W - 6}
              height={SIZE.row - 6}
              rx={radius.chip.px}
              className={C.rowTint}
            />
          ) : null}
          <text x={r1(x + SIZE.cellPad)} y={rowBase(row.top)}>
            {row.name}
          </text>
          {row.value !== null ? (
            <text
              x={r1(x + row.nameWidth + SIZE.cellPad)}
              y={rowBase(row.top)}
              className={row.uninitialized ? clsx('vz-12', C.muted) : undefined}
            >
              {row.value}
            </text>
          ) : null}
        </Fragment>
      ))}
    </g>
  )
}

/** The text runs of an unused record (header lines, names, values) as clear plates. */
function unusedPlates(box: LaidBox, headerBase: (i: number) => number, rowBase: (top: number) => number): string {
  const { x } = box.rect
  const runs: TextRun[] = box.title.map((line, i) => ({
    x: x + SIZE.cellPad,
    baseline: headerBase(i),
    w: textWidth(line, SIZE.header),
    size: SIZE.header,
  }))
  for (const row of box.rows) {
    runs.push({ x: x + SIZE.cellPad, baseline: rowBase(row.top), w: textWidth(row.name, SIZE.value), size: SIZE.value })
    if (row.value !== null) {
      const size = row.uninitialized ? SIZE.header : SIZE.value
      runs.push({ x: x + row.nameWidth + SIZE.cellPad, baseline: rowBase(row.top), w: textWidth(row.value, size), size })
    }
  }
  return platesPath(runs)
}

/** A link and the label that names its kind: the label rides the link's hover path. */
function Edge({ edge, section, labels }: { edge: LaidEdge; section: EnvSection; labels: LaidText[] }) {
  const ends = edgeEnds(section, edge.id)
  return (
    <g data-edge={edge.id} data-from={ends.from} data-to={ends.to}>
      <path d={edge.d} className={clsx('vz-e', edge.dashed && 'vz-d')} />
      <path d={edge.head} className={C.head} />
      {edge.dot ? <circle cx={r1(edge.dot.x)} cy={r1(edge.dot.y)} r={SIZE.dot} className={C.head} /> : null}
      {labels.map((t, i) => (
        <Text key={i} t={t} />
      ))}
    </g>
  )
}

function Text({ t }: { t: LaidText }) {
  // The note is a legend: upright sans, not italic mono (D22).
  const cls =
    t.kind === 'output'
      ? clsx(C.result, 'vz-c')
      : t.kind === 'label'
        ? C.edgeLabel
        : clsx('vz-12 font-sans', C.muted)
  return (
    <text
      x={r1(t.x)}
      y={r1(t.y)}
      data-o={t.node}
      className={clsx(cls, t.kind !== 'output' && t.anchor === 'middle' && 'vz-c')}
    >
      {t.kind === 'output' && t.text.startsWith('› ') ? (
        // One output glyph across visuals (N12): a muted prompt (`.vz-r > tspan`), the value in amber.
        <>
          <tspan>›</tspan>
          {t.text.slice(1)}
        </>
      ) : (
        t.text
      )}
    </text>
  )
}

function SectionSvg({
  scene,
  section,
  hatch,
  className,
}: {
  scene: SectionScene
  section: EnvSection
  hatch: string
  className: string
}) {
  const note = scene.texts.find((t) => t.kind === 'note')
  const hatched = scene.boxes.some((b) => b.unused) || (scene.noteMark === 'hatch' && note)
  // Every link rests in the line role (R1). References start at a dot inside
  // their record, so they are drawn over the boxes.
  const links = scene.edges.filter((e) => e.kind !== 'ref')
  const refs = scene.edges.filter((e) => e.kind === 'ref')
  const fns = scene.boxes.filter((b) => b.kind === 'function')
  const labelsOf = (e: LaidEdge) => scene.texts.filter((t) => t.kind === 'label' && t.edge === e.id)
  const tints = litRows(section)
  const bands = hitBands(scene.boxes)
  return (
    // Only the function objects are exposed (focusable, named); the rest of
    // the picture is described by "Diagram as text". `vz-s`: mono ink,
    // overflow visible, centred, never wider than its column (tailwind.css).
    <svg
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      data-viz-width={scene.width}
      // Sized in rem so the figure follows the reader's text size (D19), and
      // never wider than its column: then it scales down as one picture.
      // Type is in user units like the geometry it was laid out with
      // (`SIZE.value`), and the classes are in em of it: one user unit is
      // 1/16 rem, so the text follows text zoom with the drawing.
      className={clsx('vz-s', className)}
      style={{ width: `${scene.width / 16}rem` }}
      fontSize={SIZE.value}
    >
      {hatched ? (
        <defs>
          <pattern
            id={hatch}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              strokeWidth={strokeWidth.connector}
              className={C.hatch}
            />
          </pattern>
        </defs>
      ) : null}
      <g aria-hidden>
        {links.map((e) => (
          <Edge key={e.id} edge={e} section={section} labels={labelsOf(e)} />
        ))}
        {scene.boxes
          .filter((b) => b.kind !== 'function')
          .map((b) => (
            <Box key={b.id} box={b} hatch={hatch} tints={tints.get(b.id)} />
          ))}
      </g>
      {fns.map((b) => {
        const fn = section.nodes.find((n) => n.id === b.id)
        return (
          <Box
            key={b.id}
            box={b}
            hatch={hatch}
            band={bands.get(b.id)}
            label={fn && isFunction(fn) ? pathLabel(section, fn) : undefined}
          />
        )
      })}
      <g aria-hidden>
      {refs.map((e) => (
        <Edge key={e.id} edge={e} section={section} labels={labelsOf(e)} />
      ))}
      {scene.noteMark === 'hatch' && note ? (
        <rect
          data-viz-part="legend-swatch"
          x={r1(note.rect.x - SIZE.swatch - SIZE.swatchGap) + 0.5}
          y={r1(note.rect.y + 2) + 0.5}
          width={SIZE.swatch - 1}
          height={SIZE.swatch - 1}
          rx={radius.chip.px}
          fill={`url(#${hatch})`}
          className={C.line}
        />
      ) : null}
      {scene.texts
        .filter((t) => t.kind !== 'label')
        .map((t, i) => (
          <Text key={i} t={t} />
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

function VariantStage({ data, scene, uid }: { data: EnvDiagram; scene: DiagramScene; uid: string }) {
  const wide = scene.variant === 'wide'
  return (
    <div data-viz-variant={scene.variant} className={wide ? 'hidden vz-wide:block' : 'vz-wide:hidden'}>
      {hasHint(data) ? (
        // The figure's only instruction (R11), worded for the reader's input.
        // Paper cannot be hovered: print keeps the space, not the words.
        <p
          data-viz-part="hint"
          className={clsx('m-0 font-sans text-2xs leading-5 print:invisible', ink.muted)}
          style={{ marginBottom: HINT.gap }}
        >
          <span className="[@media(hover:none)]:hidden">{HINT.hover}</span>
          <span className="hidden [@media(hover:none)]:inline">{HINT.tap}</span>
        </p>
      ) : null}
      <div
        className={clsx('grid', wide && scene.columns === 2 && 'grid-cols-2')}
        style={{
          columnGap: SECTION_GAP.wide,
          rowGap: SECTION_GAP[scene.variant],
        }}
      >
        {scene.sections.map(({ section, scenes }) => (
          <div
            key={section.id}
            data-viz-section={section.id}
            className="min-w-0 [container-type:inline-size]"
          >
            <p
              // The heading is code (a loop header, a declaration), so it is
              // mono (D3), in the label role (T11). The lint keeps it on one
              // line at 1:1; under large text it wraps instead of truncating
              // (R9, R17): the svg below is then capped by its column, which
              // frees more height than the extra line takes.
              className={clsx('m-0 break-words', typeScale.value.cls, ink.secondary)}
              style={{ marginBottom: HEADING.gap }}
            >
              <Heading text={section.heading} emphasis={section.emphasis} />
            </p>
            {scenes.map((s, i) => (
              <SectionSvg
                key={s.width}
                scene={s}
                section={section}
                hatch={`${uid}-${scene.variant}-${section.id}-${s.width}-hatch`}
                className={visibility(scene.widths, i)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Variant({ data, variant, uid }: { data: EnvDiagram; variant: 'narrow' | 'wide'; uid: string }) {
  const scene = layoutDiagramSafe(data, variant)
  if ('failed' in scene)
    return (
      <p
        data-viz-variant={variant}
        data-viz-layout-failed={scene.failed}
        className={clsx('m-0', variant === 'wide' ? 'hidden vz-wide:block' : 'vz-wide:hidden', typeScale.item.cls, ink.muted)}
      >
        Too wide to draw at this size. “Diagram as text” below describes it.
      </p>
    )
  return <VariantStage data={data} scene={scene} uid={uid} />
}

export function EnvRecordsStage({ data, uid }: StaticStageProps<EnvDiagram>) {
  return (
    <>
      {/* The hover and focus paths (D21): server CSS, no script. */}
      <style dangerouslySetInnerHTML={{ __html: pathCss(data) }} />
      <Variant data={data} variant="narrow" uid={uid} />
      <Variant data={data} variant="wide" uid={uid} />
    </>
  )
}
