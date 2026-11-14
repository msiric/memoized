import type { CSSProperties } from 'react'
import { radius, strokeWidth } from '../../primitives/tokens-v3'
import { SIZE } from './geometry'

/**
 * The pointer-rewiring glyphs, shared by the step stage and the static
 * frames (plain markup, no client code), in the static figures' svg
 * vocabulary (`.vz-*`, `src/styles/tailwind.css`): a node is the glyph
 * fill with the `line` outline (as a heap-graph name), its value in mono
 * 13; a tag is the panel fill with a 1 px `line` edge and the name in mono
 * 12; an arrow is the 1.5 px connector with a filled head. The one rest mark
 * (H3 R2 Q9 "changed", never lime) doubles an edge on the white/5 tint
 * (`.vz-ch`) or draws an arrow in zinc-300 at 2.5 px (`.vz-cm`).
 */

export const r1 = (n: number) => Math.round(n * 10) / 10

export function NodeBox({ id, x, y, label, changed }: { id: string; x: number; y: number; label: string; changed?: boolean }) {
  return (
    <g data-node={id} data-changed={changed ? '' : undefined}>
      <rect
        x={r1(x) + 0.5}
        y={r1(y) + 0.5}
        width={SIZE.node - 1}
        height={SIZE.node - 1}
        rx={radius.glyph.px}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
        className={changed ? 'vz-ch' : 'vz-g'}
      />
      <text x={r1(x + SIZE.node / 2)} y={r1(y + SIZE.node / 2 + 4.5)} className="vz-c">
        {label}
      </text>
    </g>
  )
}

/** A tag's box and name at its own origin (the caller translates it). */
export function TagBody({ name, w, changed }: { name: string; w: number; changed?: boolean }) {
  return (
    <>
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={SIZE.tag - 1}
        rx={radius.chip.px}
        strokeWidth={changed ? strokeWidth.mark : strokeWidth.outline}
        className={changed ? 'vz-ch' : 'vz-p vz-l'}
      />
      <text x={r1(w / 2)} y={r1(SIZE.tag / 2 + 4)} className="vz-12 vz-c">
        {name}
      </text>
    </>
  )
}

export function Arrow({ d, head, changed }: { d: string; head: string; changed?: boolean }) {
  return (
    <>
      <path d={d} className="vz-e" style={changed ? ({ '--vz-sw': `${strokeWidth.nowConnector}px` } as CSSProperties) : undefined} />
      {head ? <path d={head} className="vz-ah" /> : null}
    </>
  )
}
