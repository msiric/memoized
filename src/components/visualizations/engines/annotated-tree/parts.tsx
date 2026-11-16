import type { CSSProperties, ReactNode } from 'react'
import { cn as clsx } from '../../primitives/cn'
import { strokeWidth } from '../../primitives/tokens-v3'
import { toRem } from '../../substrates/units'
import { SIZE } from './layout'

/** Shared svg parts of the annotated-tree panels: the panel svg with its heading, note lines, the mark edge's width. */

export const r1 = (n: number) => Math.round(n * 10) / 10
export const px = (n: number) => Math.round(n) + 0.5
/** The legend's baseline: the line under the heading. */
export const HEAD_LEGEND = 14 + SIZE.line
export const MARK_EDGE = {
  '--vz-sw': `${strokeWidth.nowConnector}px`,
} as CSSProperties

export function Svg({
  width,
  height,
  id,
  heading,
  className,
  children,
}: {
  width: number
  height: number
  id: string
  heading: string
  className?: string
  children: ReactNode
}) {
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

export function Notes({ top, lines }: { top: number; lines: string[] }) {
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
