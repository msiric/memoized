import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { DynamicImage } from '@/components/DynamicImage'
import { Prose } from '@/components/Prose'
import { Viz } from '@/components/visualizations/Viz'
import { ClientOnly } from './ClientOnly'
import {
  ArrayVisualizer,
  SequenceStepper,
  StructureVisualizer,
  buildEventLoopSteps,
  buildInorderTraversalSteps,
} from '@/components/visualizations'

/**
 * Dev-only internal gallery: every visualization component rendered from the shared
 * primitives in one place, so visual drift is easy to catch as the system grows. This
 * is a maintainer tool, not lesson content — it is gated out of production and never
 * shipped to readers. Add a specimen here whenever a new component lands.
 */
type GalleryParams = { mount?: string; spacer?: string; preset?: string }

export default function VisualizationGalleryPage({ searchParams = {} }: { searchParams?: GalleryParams }) {
  // Production builds 404 unless explicitly built for end-to-end checks
  // (`VIZ_GALLERY=1 yarn build`); never set in deployed environments.
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1') notFound()

  const { frames, code } = buildEventLoopSteps()
  const inorder = buildInorderTraversalSteps()

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
    {
      name: 'StructureVisualizer',
      note: 'Hierarchical — binary trees, BSTs, heaps (D3 auto-layout).',
      node: (
        <StructureVisualizer
          tree={inorder.tree}
          frames={inorder.frames}
          label="Binary search tree · in-order traversal"
        />
      ),
    },
    {
      name: 'Mermaid → committed SVG',
      note: 'Static structural / flow / state diagrams, authored in diagrams/*.mmd and rendered by yarn render-diagrams.',
      node: <DynamicImage src="/images/visualizations/promise-lifecycle.svg" alt="Promise lifecycle state diagram" />,
    },
  ]

  const viz = <Viz id="event-loop" preset={searchParams.preset} />

  return (
    <>
      {/* v2 specimens, inside the real lesson column (sidebar offset, gutters
          and Prose), so widths and breakout match a lesson page exactly. */}
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
        <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <Prose>
            <h1>StepThrough v2 specimen</h1>
            <p>
              The event-loop step-through through the lazy <code>{'<Viz id preset>'}</code> mount. Its trace is recorded
              from a real Node run and re-verified by unit tests.
            </p>
            {searchParams.spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
            {searchParams.mount === 'client' ? <ClientOnly>{viz}</ClientOnly> : viz}
            <p>Text after the visual, to show it never moves while stepping.</p>
          </Prose>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Visualization gallery</h1>
        <p className="mb-10 text-slate-500 dark:text-slate-400">
          Every visualization component, rendered from the same shared primitives (frame, controls, stepper, tokens), in
          one place — so consistency and drift are easy to review. Dev-only; not shipped to lessons.
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
    </>
  )
}
