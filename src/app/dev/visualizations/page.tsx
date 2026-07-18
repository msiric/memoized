import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ArrayVisualizer, SequenceStepper, buildEventLoopSteps } from '@/components/visualizations'

/**
 * Dev-only internal gallery: every visualization component rendered from the shared
 * primitives in one place, so visual drift is easy to catch as the system grows. This
 * is a maintainer tool, not lesson content — it is gated out of production and never
 * shipped to readers. Add a specimen here whenever a new component lands.
 */
export default function VisualizationGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  const { frames, code } = buildEventLoopSteps()

  const specimens: { name: string; note: string; node: ReactNode }[] = [
    {
      name: 'ArrayVisualizer',
      note: 'Arrays and strings — sliding window, two-pointer.',
      node: (
        <ArrayVisualizer
          data={[2, 1, 5, 1, 3, 2]}
          windowSize={3}
          label="Sliding window · maxSumSubarray([2, 1, 5, 1, 3, 2], K = 3)"
        />
      ),
    },
    {
      name: 'SequenceStepper',
      note: 'Temporal — event loop, call stack, async ordering.',
      node: <SequenceStepper frames={frames} code={code} label="Event loop · setTimeout vs Promise ordering" />,
    },
  ]

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Visualization gallery</h1>
      <p className="mb-10 text-slate-500 dark:text-slate-400">
        Every visualization component, rendered from the same shared primitives (frame, controls, stepper,
        tokens), in one place — so consistency and drift are easy to review. Dev-only; not shipped to lessons.
      </p>

      <div className="space-y-12">
        {specimens.map((specimen) => (
          <section key={specimen.name}>
            <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{specimen.name}</h2>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{specimen.note}</p>
            {specimen.node}
          </section>
        ))}
      </div>
    </div>
  )
}
