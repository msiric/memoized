import colors from 'tailwindcss/colors'
import { notFound } from 'next/navigation'
import { Prose } from '@/components/Prose'
import {
  MIN_GRAPHIC_CONTRAST,
  MIN_TEXT_CONTRAST,
  contrastRatio,
  over,
  parseHex,
  type RGB,
} from '@/components/visualizations/primitives/contrast'
import {
  contrastPairs,
  roles,
  surfaces,
  type Layer,
  type PaletteRef,
} from '@/components/visualizations/primitives/tokens-v3'
import { SystemSpecimen, type PairRow, type RoleRow } from './SystemSpecimen'

/**
 * Dev-only specimen of the Visualization Design System (VIZ-H WS1): every
 * primitive in every state, the type ramp, the color roles with their
 * contrast ratios, the shapes and strokes, and focus beside now, at real
 * size. This page is the visual contract. Gated out of production exactly
 * like `/dev/visualizations`.
 */

const palette = colors as unknown as Record<string, Record<string, string>>

function hexOf(ref: PaletteRef | 'white'): string {
  if (ref === 'white') return '#ffffff'
  const [name, shade] = ref.split('.')
  return palette[name][shade]
}

function composite(layers: Layer[]): RGB {
  const [base, ...rest] = layers
  return rest.reduce<RGB>((acc, l) => over(parseHex(hexOf(l.color)), l.alpha ?? 1, acc), parseHex(hexOf(base.color)))
}

export default function VisualizationSystemPage() {
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1') notFound()

  const frame = composite(surfaces.frame.dark)
  const roleRows: RoleRow[] = Object.entries(roles).map(([name, r]) => ({
    name,
    meaning: r.meaning,
    dark: r.dark,
    hex: hexOf(r.dark),
    source: r.source,
    onFrame: contrastRatio(parseHex(hexOf(r.dark)), frame),
  }))
  const pairRows: PairRow[] = contrastPairs.map((p) => ({
    use: p.use,
    kind: p.kind,
    fg: p.fg.dark,
    bg: p.bg,
    ratio: contrastRatio(parseHex(hexOf(p.fg.dark)), composite(surfaces[p.bg].dark)),
    min: p.kind === 'text' ? MIN_TEXT_CONTRAST : MIN_GRAPHIC_CONTRAST,
  }))

  return (
    <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
      <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <Prose>
          <h1>Visualization design system</h1>
          <p>
            Tokens v3 and the primitives every visual is built from, in every state, at real size. Values come from{' '}
            <code>primitives/tokens-v3.ts</code>; each traces to a platform file or an H1 decision.
          </p>
        </Prose>
        <div className="mx-auto mt-8 max-w-2xl lg:max-w-3xl">
          <SystemSpecimen roles={roleRows} pairs={pairRows} />
        </div>
      </div>
    </div>
  )
}
