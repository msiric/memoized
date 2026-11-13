import { useId } from 'react'
import { captionCls } from '../primitives/Caption'
import { cn as clsx } from '../primitives/cn'
import { Disclosure, disclosureBodyCls } from '../primitives/Disclosure'
import { Frame } from '../primitives/Frame'
import { Provenance } from '../primitives/Provenance'
import { ink, type as typeScale } from '../primitives/tokens-v3'
import { FRAME } from './footprint'
import { staticMetrics } from './static-footprint'
import type { StaticDefinition, StaticTextAlternative } from './static-types'
import { runtimeName } from './StepsAsText'
import { H_CLS, MIN_H_CLS, heights } from './vars'

/**
 * StaticFigure: the shell for every static diagram (spec §3.3, §6.4).
 *
 * Pure markup with no state, effects or event handlers, so it costs nothing
 * to hydrate: on a hard load the `<Viz>` mount keeps this server HTML and
 * never requests the engine. Anatomy, top to bottom: title, stage (the
 * engine's SVG in a `role="group"`, described by the full text alternative),
 * figcaption with the why-sentence, then "Diagram as text" and provenance.
 * Every region has a fixed height per layout variant (`static-footprint`).
 */

export type StaticFigureProps<D> = { def: StaticDefinition<D>; preset?: string }

export function StaticFigure<D>({ def, preset }: StaticFigureProps<D>) {
  const uid = useId().replace(/:/g, '')
  const p =
    def.presets.find((x) => x.id === (preset ?? def.defaultPreset)) ??
    def.presets[0]
  const m = staticMetrics(def, p)
  const alt: StaticTextAlternative = {
    ...def.engine.describe(p.data),
    outputs: p.programs.map((pr) => ({
      label: pr.id,
      text: pr.observed.join(', '),
    })),
  }
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`
  const Stage = def.engine.Stage
  const runtime = runtimeName(p.programs[0]?.runtime ?? 'node@24.x')

  return (
    <Frame as="figure" data-viz-frame={def.id} data-viz-kind="static" data-viz-preset={p.id}>
      {/* The title wraps (INTEG 5: it truncated under 200 % text on a phone);
          each tier reserves the lines it takes at its narrowest width, as a
          floor: under very large text it may take one more, and a static
          figure never re-renders, so that is growth, not a shift. */}
      <p
        id={titleId}
        className={clsx('m-0 break-words', typeScale.title.cls, ink.base, MIN_H_CLS)}
        style={heights({ narrow: m.narrow.title, wide: m.wide.title, col: m.col.title })}
      >
        {p.title}
      </p>

      {/* A group, not an image: its function objects are focusable and
          named (the closures hover path, D21); the rest is decorative and
          described by the text alternative. */}
      <div
        data-viz-region="stage"
        role="group"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={clsx('relative', H_CLS)}
        style={heights({ narrow: m.narrow.stage, wide: m.wide.stage, col: m.col.stage }, { marginTop: FRAME.headerGap })}
      >
        <Stage data={p.data} uid={uid} />
      </div>

      <figcaption
        data-viz-part="viz-caption"
        // A floor, like the title: under 200 % text on a phone the caption may
        // need a line more than its model, and must push "Diagram as text"
        // down rather than print over it (a static figure never re-renders).
        className={clsx(captionCls, MIN_H_CLS)}
        style={heights({ narrow: m.narrow.caption, wide: m.wide.caption, col: m.col.caption }, { marginTop: FRAME.headerGap })}
      >
        {p.caption}
      </figcaption>

      {/* A div, not <footer>: inside a figure a footer is a page-level contentinfo landmark. */}
      <div className="relative print:hidden" style={{ marginTop: FRAME.footerGap }}>
        <Disclosure summary="Diagram as text">
          <DiagramAsText id={descId} alt={alt} runtime={runtime} />
        </Disclosure>
        <Provenance runtimes={[runtime]} />
      </div>

      {/* Print: the text alternative is always on paper (§3.5). */}
      <div className="hidden print:mt-4 print:block">
        <DiagramAsText alt={alt} runtime={runtime} />
      </div>
    </Frame>
  )
}

/**
 * One text-alternative layout across visuals (DESIGN X12), the list-keys
 * `OutcomesAsText` pattern: a list of groups, each headed by its code in
 * mono 600 with a bulleted list under it; then the verified output lines as
 * in `StepsAsText`, and the modelled-not-observed note as the muted footnote.
 */
export function DiagramAsText({
  id,
  alt,
  runtime,
}: {
  id?: string
  alt: StaticTextAlternative
  runtime: string
}) {
  return (
    <div id={id} className={disclosureBodyCls}>
      <ul className="m-0 list-none space-y-3 p-0">
        {alt.parts.map((part, i) => (
          <li key={i} className="m-0 p-0">
            <p className={clsx('m-0 font-mono text-xs font-semibold', ink.base)}>{part.heading}</p>
            <ul className="m-0 list-disc pl-5">
              {part.lines.map((line, k) => (
                <li key={k} className="m-0">
                  {line}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {alt.outputs.map((o, i) => (
        <p key={i} className={clsx('m-0', i === 0 && 'mt-3')}>
          <span className={clsx('font-semibold', ink.base)}>{`Verified output, ${o.label} (${runtime}):`}</span>{' '}
          <span className="font-mono text-xs">{o.text}</span>
        </p>
      ))}
      {alt.model ? <p className={clsx('m-0 mt-3 text-xs', ink.muted)}>{alt.model}</p> : null}
    </div>
  )
}
