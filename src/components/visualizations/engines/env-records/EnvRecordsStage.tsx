import clsx from 'clsx'
import { ink, radius, type as typeScale } from '../../primitives/tokens-v3'
import type { StaticStageProps } from '../../shell/static-types'
import {
  HEADING,
  SECTION_GAP,
  SIZE,
  layoutDiagram,
  type DiagramScene,
  type LaidBox,
  type LaidEdge,
  type LaidText,
  type SectionScene,
} from './layout'
import type { EnvDiagram } from './model'

/**
 * The environment-records stage: one SVG per section per sub-width, chosen by
 * CSS alone (the 768 px breakpoint picks the variant, a container query on
 * the section picks the width), so the server markup is final and no script
 * ever measures anything. Colors come from §2.1 roles as classes, with
 * `print:` twins for the light print roles.
 */

/**
 * Container-query classes per sub-width. Literal strings, so Tailwind emits
 * them; `stage.test.ts` fails if a layout asks for a width missing here.
 */
export const CONTAINER: Record<number, { show: string; hide: string }> = {
  343: {
    show: '[@container(min-width:343px)]:block',
    hide: '[@container(min-width:343px)]:hidden',
  },
  359: {
    show: '[@container(min-width:359px)]:block',
    hide: '[@container(min-width:359px)]:hidden',
  },
  734: {
    show: '[@container(min-width:734px)]:block',
    hide: '[@container(min-width:734px)]:hidden',
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

function Box({ box, hatch }: { box: LaidBox; hatch: string }) {
  const { x, y, w, h } = box.rect
  const X = px(x)
  const Y = px(y)
  const W = Math.round(w) - 1
  const H = Math.round(h) - 1
  if (box.kind === 'function' || box.kind === 'slot') {
    const slot = box.kind === 'slot'
    return (
      <g>
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
          textAnchor="middle"
          className={clsx(
            'vz-12',
            slot ? clsx('italic', C.muted) : clsx('font-medium', C.ink),
          )}
        >
          {slot ? (
            box.title[0]
          ) : (
            <>
              <tspan className={C.muted}>ƒ</tspan> {box.title[0]}
            </>
          )}
        </text>
      </g>
    )
  }
  const headerH = 2 * SIZE.headerPad + box.title.length * SIZE.headerLine
  return (
    <g>
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
          className={clsx(
            'vz-12 font-medium',
            box.unused ? clsx('italic', C.muted) : C.header,
          )}
        >
          {line}
        </text>
      ))}
      {box.rows.length ? (
        <line
          x1={r1(x + 1)}
          x2={r1(x + w - 1)}
          y1={px(y + headerH)}
          y2={px(y + headerH)}
          className={C.hairline}
        />
      ) : null}
      {box.rows.map((row, i) => (
        <g key={row.name}>
          {i > 0 ? (
            <line
              x1={r1(x + 1)}
              x2={r1(x + w - 1)}
              y1={px(row.top)}
              y2={px(row.top)}
              className={C.hairline}
            />
          ) : null}
          <line
            x1={px(x + row.nameWidth)}
            x2={px(x + row.nameWidth)}
            y1={row.top + 1}
            y2={row.top + SIZE.row - (i === box.rows.length - 1 ? 1 : 0)}
            className={C.hairline}
          />
          <text
            x={r1(x + SIZE.cellPad)}
            y={r1(row.top + 18.5)}
            className={clsx('vz-13', box.unused ? C.muted : C.ink)}
          >
            {row.name}
          </text>
          {row.value !== null ? (
            <text
              x={r1(x + row.nameWidth + SIZE.cellPad)}
              y={r1(row.top + 18.5)}
              className={clsx(
                row.uninitialized ? clsx('vz-12 italic', C.muted) : 'vz-13',
                box.unused ? C.muted : C.ink,
              )}
            >
              {row.value}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  )
}

function Edge({ edge }: { edge: LaidEdge }) {
  return (
    <g data-edge={edge.id} data-now={edge.now ? '' : undefined}>
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
  const cls =
    t.kind === 'output'
      ? clsx('vz-13', C.result)
      : t.kind === 'label'
        ? clsx('vz-12', C.muted)
        : clsx('vz-12 italic', C.muted)
  return (
    <text
      x={r1(t.x)}
      y={r1(t.y)}
      textAnchor={t.anchor === 'middle' ? 'middle' : undefined}
      className={cls}
    >
      {t.text}
    </text>
  )
}

function SectionSvg({
  scene,
  hatch,
  className,
}: {
  scene: SectionScene
  hatch: string
  className: string
}) {
  // Quiet links first, the highlight on top. References start at a dot inside
  // their record, so they are drawn over the boxes.
  const order = (es: LaidEdge[]) =>
    [...es].sort((a, b) => Number(a.now) - Number(b.now))
  const links = order(scene.edges.filter((e) => e.kind !== 'ref'))
  const refs = order(scene.edges.filter((e) => e.kind === 'ref'))
  return (
    <svg
      aria-hidden
      focusable="false"
      width={scene.width}
      height={scene.height}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      overflow="visible"
      data-viz-width={scene.width}
      className={clsx('mx-auto font-mono', className)}
    >
      {scene.boxes.some((b) => b.unused) ? (
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
      {links.map((e) => (
        <Edge key={e.id} edge={e} />
      ))}
      {scene.boxes.map((b) => (
        <Box key={b.id} box={b} hatch={hatch} />
      ))}
      {refs.map((e) => (
        <Edge key={e.id} edge={e} />
      ))}
      {scene.texts.map((t, i) => (
        <Text key={i} t={t} />
      ))}
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
        wide ? 'hidden md:grid' : 'grid md:hidden',
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
            className={clsx('m-0 truncate', typeScale.value.cls, ink.muted)}
            style={{ marginBottom: HEADING.gap }}
          >
            <Heading text={section.heading} emphasis={section.emphasis} />
          </p>
          {scenes.map((s, i) => (
            <SectionSvg
              key={s.width}
              scene={s}
              hatch={`${uid}-${scene.variant}-${section.id}-${s.width}-hatch`}
              className={visibility(scene.widths, i)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EnvRecordsStage({ data, uid }: StaticStageProps<EnvDiagram>) {
  return (
    <>
      <VariantStage scene={layoutDiagram(data, 'narrow')} uid={uid} />
      <VariantStage scene={layoutDiagram(data, 'wide')} uid={uid} />
    </>
  )
}
