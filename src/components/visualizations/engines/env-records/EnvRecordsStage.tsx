import clsx from 'clsx'
import { ink, radius, type as typeScale } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import {
  HEADING,
  SECTION_GAP,
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
import { pathCss, pathLabel } from './paths'

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

/** Role classes (`src/styles/tailwind.css`, `.vz-*`): §2.1 roles with print twins, kept short for the markup budget. */
const C = {
  glyph: 'vz-g',
  hairline: 'vz-hl',
  header: 'vz-h',
  ink: 'vz-i',
  muted: 'vz-m',
  line: 'vz-l',
  lineFill: 'vz-lf',
  now: 'vz-n',
  nowFill: 'vz-nf',
  result: 'vz-r',
  hatch: 'vz-x',
} as const

const r1 = (n: number) => Math.round(n * 10) / 10

const px = (n: number) => Math.round(n) + 0.5

/**
 * Each box group carries `data-node` (its id), which the stress harness
 * reads. A function box is focusable and named (`label`): hovering or
 * focusing it brings its `[[Environment]]` path forward (`paths.ts`).
 */
function Box({ box, hatch, label }: { box: LaidBox; hatch: string; label?: string }) {
  const { x, y, w, h } = box.rect
  const X = px(x)
  const Y = px(y)
  const W = Math.round(w) - 1
  const H = Math.round(h) - 1
  if (box.kind === 'function' || box.kind === 'slot') {
    const slot = box.kind === 'slot'
    return (
      <g data-node={box.id} tabIndex={label ? 0 : undefined} role={label ? 'img' : undefined} aria-label={label}>
        <rect
          x={X}
          y={Y}
          width={W}
          height={H}
          rx={radius.glyph.px}
          className={slot ? clsx('vz-d fill-none', C.line) : C.glyph}
        />
        <text
          x={r1(x + w / 2)}
          y={r1(y + h / 2 + 4)}
          // `vz-f`: 12 px medium, centred (tailwind.css, the markup budget).
          className={slot ? clsx('vz-12 vz-c italic', C.muted) : 'vz-f'}
        >
          {slot ? (
            box.title[0]
          ) : (
            <>
              <tspan className={C.muted}>ƒ</tspan>
              {` ${box.title[0]}`}
            </>
          )}
        </text>
      </g>
    )
  }
  const headerH = 2 * SIZE.headerPad + box.title.length * SIZE.headerLine
  return (
    // Row text inherits 13 px ink from the svg (markup budget); unused records mute it.
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
        <rect x={X} y={Y} width={W} height={H} rx={radius.glyph.px} fill={`url(#${hatch})`} />
      ) : null}
      {box.title.map((line, i) => (
        <text
          key={i}
          x={r1(x + SIZE.cellPad)}
          y={r1(y + SIZE.headerPad + 12 + i * SIZE.headerLine)}
          // `vz-t`: the header role, 12 px medium (tailwind.css).
          className={box.unused ? clsx('vz-t italic', C.muted) : 'vz-t'}
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
        <g key={row.name}>
          <text
            x={r1(x + SIZE.cellPad)}
            y={r1(row.top + 18.5)}
          >
            {row.name}
          </text>
          {row.value !== null ? (
            <text
              x={r1(x + row.nameWidth + SIZE.cellPad)}
              y={r1(row.top + 18.5)}
              className={row.uninitialized ? clsx('vz-12 italic', C.muted) : undefined}
            >
              {row.value}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  )
}

function Edge({ edge, section }: { edge: LaidEdge; section: EnvSection }) {
  const ends = edgeEnds(section, edge.id)
  return (
    <g
      data-edge={edge.id}
      data-from={ends.from}
      data-to={ends.to}
      data-now={edge.now ? '' : undefined}
    >
      <path
        d={edge.d}
        className={clsx(
          'vz-e',
          edge.now ? C.now : C.line,
          edge.dashed && 'vz-d',
        )}
      />
      <path d={edge.head} className={edge.now ? C.nowFill : C.lineFill} />
      {edge.dot ? (
        <circle
          cx={r1(edge.dot.x)}
          cy={r1(edge.dot.y)}
          r={SIZE.dot}
          className={edge.now ? C.nowFill : C.lineFill}
        />
      ) : null}
    </g>
  )
}

function Text({ t }: { t: LaidText }) {
  // The note is a legend: upright sans, not italic mono (D22).
  const cls =
    t.kind === 'output'
      ? clsx(C.result, 'vz-c')
      : t.kind === 'label'
        ? clsx('vz-12', C.muted)
        : clsx('vz-12 font-sans', C.muted)
  return (
    <text
      x={r1(t.x)}
      y={r1(t.y)}
      data-o={t.node}
      className={clsx(cls, t.kind !== 'output' && t.anchor === 'middle' && 'vz-c')}
    >
      {t.text}
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
  // Quiet links first, the highlight on top. References start at a dot inside
  // their record, so they are drawn over the boxes.
  const order = (es: LaidEdge[]) =>
    [...es].sort((a, b) => Number(a.now) - Number(b.now))
  const links = order(scene.edges.filter((e) => e.kind !== 'ref'))
  const refs = order(scene.edges.filter((e) => e.kind === 'ref'))
  const fns = scene.boxes.filter((b) => b.kind === 'function')
  return (
    // Only the function objects are exposed (focusable, named); the rest of
    // the picture is described by "Diagram as text". `vz-s`: 13 px mono ink,
    // overflow visible, centred, never wider than its column (tailwind.css).
    <svg
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      data-viz-width={scene.width}
      // Sized in rem so the figure follows the reader's text size (D19), and
      // never wider than its column: then it scales down as one picture.
      className={clsx('vz-s', className)}
      style={{ width: `${scene.width / 16}rem` }}
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
              strokeWidth="1.5"
              className={C.hatch}
            />
          </pattern>
        </defs>
      ) : null}
      <g aria-hidden>
        {links.map((e) => (
          <Edge key={e.id} edge={e} section={section} />
        ))}
        {scene.boxes
          .filter((b) => b.kind !== 'function')
          .map((b) => (
            <Box key={b.id} box={b} hatch={hatch} />
          ))}
      </g>
      {fns.map((b) => {
        const fn = section.nodes.find((n) => n.id === b.id)
        return (
          <Box key={b.id} box={b} hatch={hatch} label={fn && isFunction(fn) ? pathLabel(section, fn) : undefined} />
        )
      })}
      <g aria-hidden>
      {refs.map((e) => (
        <Edge key={e.id} edge={e} section={section} />
      ))}
      {scene.noteMark === 'hatch' && note ? (
        <rect
          data-viz-part="legend-swatch"
          x={0.5}
          y={r1(note.rect.y + 2) + 0.5}
          width={SIZE.swatch - 1}
          height={SIZE.swatch - 1}
          rx={2}
          fill={`url(#${hatch})`}
          className={C.line}
        />
      ) : null}
      {scene.texts.map((t, i) => (
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

function VariantStage({ scene, uid }: { scene: DiagramScene; uid: string }) {
  const wide = scene.variant === 'wide'
  return (
    <div
      data-viz-variant={scene.variant}
      className={clsx(
        wide ? 'hidden vz-wide:grid' : 'grid vz-wide:hidden',
        wide && scene.columns === 2 && 'grid-cols-2',
      )}
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
            // The heading is code (a loop header, a declaration), so it is mono (D3).
            // The lint keeps it within the section width; truncation is the guard.
            className={clsx('m-0 truncate', typeScale.value.cls, ink.muted)}
            style={{ marginBottom: HEADING.gap }}
            title={section.heading}
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
  return <VariantStage scene={scene} uid={uid} />
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
