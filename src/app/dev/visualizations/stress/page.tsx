import { notFound } from 'next/navigation'
import { DynamicImage } from '@/components/DynamicImage'
import { Prose } from '@/components/Prose'
import { EnvRecordsStage } from '@/components/visualizations/engines/env-records/EnvRecordsStage'
import { StaticFigure } from '@/components/visualizations/shell/StaticFigure'
import type { StaticDefinition } from '@/components/visualizations/shell/static-types'
import type { EnvDiagram } from '@/components/visualizations/engines/env-records/model'
import { ENV_PRESETS, envFixture } from '@/components/visualizations/__stress__/env-records.fixtures'
import { EVENT_LOOP_FIXTURES } from '@/components/visualizations/__stress__/event-loop.fixtures'
import { staticLint, stepThroughLint } from '@/components/visualizations/__stress__/lint'
import { StressStepThrough } from '@/components/visualizations/__stress__/StressStepThrough'

/**
 * Dev-only stress page (VIZ-H H0-B): renders adversarial fixtures through the
 * real StepThrough / StaticFigure shells and the real stages, inside the real
 * lesson column, so `e2e/stress/` can run its detectors on them. Gated out of
 * production exactly like `/dev/visualizations`.
 *
 * `?f=<fixture id>` renders one fixture (what the harness uses); no query
 * lists every fixture with its lint verdict. `?f=mermaid` renders the old
 * Mermaid SVG the way a lesson does (an <img> in Prose).
 */

type Params = { f?: string }

const STEP_IDS = Object.keys(EVENT_LOOP_FIXTURES) as (keyof typeof EVENT_LOOP_FIXTURES)[]

function Step({ id }: { id: keyof typeof EVENT_LOOP_FIXTURES }) {
  const lint = stepThroughLint(EVENT_LOOP_FIXTURES[id])
  return (
    <section data-stress-fixture={id} data-stress-lint={JSON.stringify(lint)}>
      <h2>{id}</h2>
      <p>Lint: {lint.length ? `${lint.length} error(s)` : 'accepted'}</p>
      <div data-viz={`stress-${id}`} className="my-8 xl:max-w-[960px]">
        <StressStepThrough fixture={id} />
      </div>
      <p data-stress-after="">Text after the visual.</p>
    </section>
  )
}

function Static({ index }: { index: number }) {
  const p = ENV_PRESETS[index]
  const lint = staticLint(p)
  const throws = lint.some((l) => l.startsWith('layout'))
  const d = envFixture(p)
  const def: StaticDefinition<EnvDiagram> = { ...d, engine: { ...d.engine, Stage: EnvRecordsStage } }
  return (
    <section data-stress-fixture={p.id} data-stress-lint={JSON.stringify(lint)}>
      <h2>{p.id}</h2>
      <p>Lint: {lint.length ? `${lint.length} error(s)` : 'accepted'}</p>
      <div data-viz={`stress-${p.id}`} className="my-8">
        {throws ? (
          <p data-stress-error="">{lint.join('; ')}</p>
        ) : (
          <StaticFigure def={def} preset={p.id} />
        )}
      </div>
      <p data-stress-after="">Text after the visual.</p>
    </section>
  )
}

export default function StressPage({ searchParams = {} }: { searchParams?: Params }) {
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1') notFound()
  const f = searchParams.f
  const envIndex = ENV_PRESETS.findIndex((p) => p.id === f)

  let body
  if (f === 'mermaid') {
    body = (
      <section data-stress-fixture="mermaid">
        <h2>Promise lifecycle (Mermaid, as a lesson renders it)</h2>
        <p>Paragraph before the diagram.</p>
        <DynamicImage src="/images/visualizations/promise-lifecycle.svg" alt="Promise lifecycle state diagram" />
        <p data-stress-after="">Text after the visual.</p>
      </section>
    )
  } else if (f && f in EVENT_LOOP_FIXTURES) {
    body = <Step id={f as keyof typeof EVENT_LOOP_FIXTURES} />
  } else if (envIndex >= 0) {
    body = <Static index={envIndex} />
  } else {
    body = (
      <>
        {STEP_IDS.map((id) => (
          <Step key={id} id={id} />
        ))}
        {ENV_PRESETS.map((p, i) => (
          <Static key={p.id} index={i} />
        ))}
      </>
    )
  }

  return (
    <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
      <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <Prose>
          <h1>Visualization stress fixtures</h1>
          {body}
        </Prose>
      </div>
    </div>
  )
}
