import clsx from 'clsx'
import { useId } from 'react'
import {
  focusRing,
  ink,
  surface,
  type as typeScale,
} from '../primitives/tokens-v2'
import { FRAME } from './footprint'
import { staticMetrics } from './static-footprint'
import type { StaticDefinition, StaticTextAlternative } from './static-types'
import { runtimeName } from './StepsAsText'
import { H_CLS, heights } from './vars'

/**
 * StaticFigure: the shell for every static diagram (spec §3.3, §6.4).
 *
 * Pure markup with no state, effects or event handlers, so it costs nothing
 * to hydrate: on a hard load the `<Viz>` mount keeps this server HTML and
 * never requests the engine. Anatomy, top to bottom: title, stage (the
 * engine's SVG, `role="img"`, described by the full text alternative),
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
    <figure
      data-viz-frame={def.id}
      data-viz-kind="static"
      data-viz-preset={p.id}
      className={clsx(
        'not-prose relative m-0 -mx-4 border-y border-zinc-700/60 p-4 sm:mx-0 sm:rounded-xl sm:border-x print:break-inside-avoid print:border-zinc-300',
        surface.frame,
      )}
      style={{ paddingTop: FRAME.padding, paddingBottom: FRAME.padding }}
    >
      <p
        id={titleId}
        className={clsx('m-0 truncate', typeScale.title.cls, ink.base)}
      >
        {p.title}
      </p>

      <div
        data-viz-region="stage"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={clsx('relative', H_CLS)}
        style={heights(
          { narrow: m.narrow.stage, wide: m.wide.stage },
          { marginTop: FRAME.headerGap },
        )}
      >
        <Stage data={p.data} uid={uid} />
      </div>

      <figcaption
        data-viz-part="viz-caption"
        className={clsx('m-0', typeScale.caption.cls, ink.base, H_CLS)}
        style={heights(
          { narrow: m.narrow.caption, wide: m.wide.caption },
          { marginTop: FRAME.headerGap },
        )}
      >
        {p.caption}
      </figcaption>

      {/* A div, not <footer>: inside a figure a footer is a page-level contentinfo landmark. */}
      <div
        className="relative print:hidden"
        style={{ marginTop: FRAME.footerGap }}
      >
        <details className="group">
          <summary
            className={clsx(
              'flex h-11 w-max cursor-pointer list-none items-center gap-2 rounded-[10px] pr-2 text-[14px] font-semibold leading-5 [&::-webkit-details-marker]:hidden',
              ink.base,
              focusRing,
            )}
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 16 16"
              className="shrink-0 group-open:rotate-90"
            >
              <path
                d="m6 4 4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Diagram as text
          </summary>
          <DiagramAsText id={descId} alt={alt} runtime={runtime} />
        </details>
        <p
          className={clsx(
            'm-0 md:absolute md:right-0 md:top-0 md:flex md:h-11 md:items-center',
            typeScale.index.cls,
            'font-sans font-normal',
            ink.muted,
          )}
        >
          {`Output verified in ${runtime}`}
        </p>
      </div>

      {/* Print: the text alternative is always on paper (§3.5). */}
      <div className="hidden print:mt-4 print:block">
        <DiagramAsText alt={alt} runtime={runtime} />
      </div>
    </figure>
  )
}

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
    <div
      id={id}
      className="pb-2 pt-1 text-[14px] leading-6 text-zinc-100 print:text-zinc-900"
    >
      {alt.parts.map((part, i) => (
        <div key={i} className={i > 0 ? 'mt-3' : undefined}>
          <p className="m-0 font-semibold">{part.heading}</p>
          <ul className="m-0 list-disc space-y-1 pl-5">
            {part.lines.map((line, k) => (
              <li key={k} className="m-0 p-0">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {alt.outputs.map((o, i) => (
        <p key={i} className={clsx('m-0', i === 0 && 'mt-3')}>
          <span className="font-semibold">{`Verified output, ${o.label} (${runtime}):`}</span>{' '}
          <span className="font-mono text-[13px]">{o.text}</span>
        </p>
      ))}
      {alt.model ? (
        <p className={clsx('m-0 mt-3', ink.muted, 'print:text-zinc-600')}>
          {alt.model}
        </p>
      ) : null}
    </div>
  )
}
