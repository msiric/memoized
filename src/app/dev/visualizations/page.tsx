import { notFound } from 'next/navigation'
import { Prose } from '@/components/Prose'
import { Viz } from '@/components/visualizations/Viz'
import { ClientOnly } from './ClientOnly'

/**
 * Dev-only internal gallery: every registered visualization through the real
 * `<Viz>` mount, inside the real lesson column, so visual drift is easy to
 * catch. A maintainer tool, not lesson content: gated out of production and
 * never shipped to readers. Add a specimen here whenever a visual lands. The
 * v1 components and the Mermaid SVG are retired (VIZ-H D20).
 */
type GalleryParams = { mount?: string; spacer?: string; preset?: string; static?: string; lk?: string }

export default function VisualizationGalleryPage({
  searchParams = {},
}: {
  searchParams?: GalleryParams
}) {
  // Production builds 404 unless explicitly built for end-to-end checks
  // (`VIZ_GALLERY=1 yarn build`); never set in deployed environments.
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1')
    notFound()

  const viz = <Viz id="event-loop" preset={searchParams.preset} />
  // Static figures: final server markup, no client JavaScript. `?static=1`
  // shows them alone (the e2e suite checks no visualization chunk loads).
  const statics = (
    <>
      <h2>Static diagrams</h2>
      <p>
        Environment records for the Closures lesson, rendered on the server as SVG. Every value drawn is checked
        against a real Node run by unit tests.
      </p>
      <Viz id="environment-records" preset="var-vs-let-loop" />
      <p>Between the two closures panels.</p>
      <Viz id="environment-records" preset="factory-calls-vs-aliases" />
      <p>Text after the static diagrams.</p>
    </>
  )
  const onlyStatic = searchParams.static === '1'

  return (
    <>
      {/* v2 specimens, inside the real lesson column (sidebar offset, gutters
          and Prose), so widths and breakout match a lesson page exactly. */}
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
        <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <Prose>
            <h1>{onlyStatic ? 'Static diagram specimens' : 'StepThrough v2 specimen'}</h1>
            {onlyStatic ? null : (
              <p>
                The event-loop step-through through the lazy <code>{'<Viz id preset>'}</code> mount. Its trace is
                recorded from a real Node run and re-verified by unit tests.
              </p>
            )}
            {searchParams.spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
            {onlyStatic ? null : searchParams.mount === 'client' ? <ClientOnly>{viz}</ClientOnly> : viz}
            {onlyStatic ? null : <p>Text after the visual, to show it never moves while stepping.</p>}
            {onlyStatic ? null : (
              <>
                <h2>List keys explorable</h2>
                <p>
                  Pick a key strategy and an action, predict, then see which instance React matched to each row.
                  Every outcome is recorded from real React 18 and 19 renders.
                </p>
                {/* `?mount=client` mounts it client-only too: the lazy placeholder under test (Q16). */}
                {searchParams.mount === 'client' ? (
                  <ClientOnly>
                    <Viz id="list-keys" preset={searchParams.lk} />
                  </ClientOnly>
                ) : (
                  <Viz id="list-keys" preset={searchParams.lk} />
                )}
                <p>Text after the explorable, to show it never moves while exploring.</p>
              </>
            )}
            {onlyStatic && searchParams.mount === 'client' ? <ClientOnly>{statics}</ClientOnly> : statics}
          </Prose>
        </div>
      </div>
    </>
  )
}
