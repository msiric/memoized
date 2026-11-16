import { notFound } from 'next/navigation'
import { Prose } from '@/components/Prose'
import { Viz } from '@/components/visualizations/Viz'
import { resolveVizCode } from '@/components/visualizations/step-log/resolve-code'
import { framesVizFor } from '@/components/visualizations/engines/frames/gallery'
import { ClientOnly } from './ClientOnly'

/**
 * Dev-only internal gallery: every registered visualization through the real
 * `<Viz>` mount, inside the real lesson column, so visual drift is easy to
 * catch. A maintainer tool, not lesson content: gated out of production and
 * never shipped to readers. Add a specimen here whenever a visual lands. The
 * v1 components and the Mermaid SVG are retired (VIZ-H D20).
 */
type GalleryParams = { mount?: string; spacer?: string; preset?: string; static?: string; lk?: string; fr?: string; ll?: string; sw?: string; at?: string; fx?: string }

export default function VisualizationGalleryPage({
  searchParams = {},
}: {
  searchParams?: GalleryParams
}) {
  // Production builds 404 unless explicitly built for end-to-end checks
  // (`VIZ_GALLERY=1 yarn build`); never set in deployed environments.
  if (process.env.NODE_ENV === 'production' && process.env.VIZ_GALLERY !== '1')
    notFound()

  // `?fr=<preset>`: the frontier step-through alone (wave 2A), one lesson group per page.
  if (searchParams.fr) return <FrontierGallery preset={searchParams.fr} mount={searchParams.mount} spacer={searchParams.spacer} />
  // `?sw=<preset>`: the sliding-window step-through alone (wave 2C), one lesson group per page.
  if (searchParams.sw) return <SlidingWindowGallery preset={searchParams.sw} mount={searchParams.mount} spacer={searchParams.spacer} />
  // `?fx=<preset>`: a frames step-through alone (wave 3C: generators, mapLimit, reentrant emit), its own lesson's presets.
  if (searchParams.fx) return <FramesGallery preset={searchParams.fx} mount={searchParams.mount} spacer={searchParams.spacer} />

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
      <p>
        The same records with a call stack beside them, for the Scope Chain lesson: lookup follows outer links, not
        the stack. Each call&apos;s chain is checked against inspector pauses in a real run.
      </p>
      <Viz id="environment-records" preset="caller-is-not-lexical-parent" />
      <p>Between the two scope-chain panels.</p>
      <Viz id="environment-records" preset="tdz-stops-lookup" />
      <p>
        Heap graphs for the Data Types and Objects lessons: names on the left, the objects their values identify on
        the right, built from a recorded Node run.
      </p>
      <Viz id="heap-graph" preset="identity-alias-rebind-spread" />
      <p>Between the two heap graphs.</p>
      <Viz id="heap-graph" preset="spread-vs-nested-vs-deep" />
      <p>Text after the static diagrams.</p>
    </>
  )
  const onlyStatic = searchParams.static === '1'
  // `?ll=<preset>`: the linked-list pointer-rewiring step-through alone;
  // `?ll=static`: its static frames alone (wave 2B).
  if (searchParams.ll === 'static') {
    const frames = (
      <>
        <Viz id="linked-list-frames" preset="floyd-rho" />
        <p>Between the two pointer frames.</p>
        <Viz id="linked-list-frames" preset="full-reversal-strip" />
      </>
    )
    return (
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
        <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <Prose>
            <h1>Linked list pointer frames</h1>
            <p>Snapshots of recorded pointer states, drawn on the server as SVG.</p>
            {searchParams.mount === 'client' ? <ClientOnly>{frames}</ClientOnly> : frames}
            <p>Text after the static frames.</p>
          </Prose>
        </div>
      </div>
    )
  }
  // `?at=static`: the annotated-tree figures alone (wave 2D).
  if (searchParams.at === 'static') {
    const trees = (
      <>
        <Viz id="annotated-tree" preset="max-path-gain-vs-through" />
        <p>Between the annotated trees.</p>
        <Viz id="annotated-tree" preset="trie-end-markers" />
        <p>Between the annotated trees.</p>
        <Viz id="annotated-tree" preset="suffix-tree-banana" />
      </>
    )
    return (
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
        <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <Prose>
            <h1>Annotated trees</h1>
            <p>Trees whose nodes and edges carry values recorded from a real Node run, drawn on the server as SVG.</p>
            {searchParams.mount === 'client' ? <ClientOnly>{trees}</ClientOnly> : trees}
            <p>Text after the annotated trees.</p>
          </Prose>
        </div>
      </div>
    )
  }
  if (searchParams.ll)
    return (
      <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
        <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
          <Prose>
            <h1>Linked list pointer rewiring</h1>
            <p>
              Next pointers rewired one assignment at a time. Every pointer state is recorded from a real Node run of
              the lesson&apos;s code and re-verified by unit tests.
            </p>
            {searchParams.spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
            <PremiumViz id="linked-list-pointer-rewiring" preset={searchParams.ll} mount={searchParams.mount} />
            <p>Text after the visual, to show it never moves while stepping.</p>
          </Prose>
        </div>
      </div>
    )

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

/** The frontier step-through (graphs, grids, trees) through the lazy mount, between lesson text. */
function FrontierGallery({ preset, mount, spacer }: { preset: string; mount?: string; spacer?: string }) {
  return (
    <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
      <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <Prose>
          <h1>Frontier step-through</h1>
          <p>
            Which vertex is expanded next: a queue, a heap or a stack decides. Every drawn queue, distance and stack is
            recorded from a real Node run of the lesson&apos;s code and re-verified by unit tests.
          </p>
          {spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
          <PremiumViz id="bfs-dfs-frontier" preset={preset} mount={mount} />
          <p>Text after the visual, to show it never moves while stepping.</p>
        </Prose>
      </div>
    </div>
  )
}

/** The sliding-window step-through (a lesson example, or a practice answer from the checkout), between lesson text. */
function SlidingWindowGallery({ preset, mount, spacer }: { preset: string; mount?: string; spacer?: string }) {
  return (
    <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
      <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <Prose>
          <h1>Sliding window step-through</h1>
          <p>
            How far the left edge moves when the window breaks its rule. Every edge, count and length is recorded from a
            real Node run of the lesson&apos;s code and re-verified by unit tests.
          </p>
          {spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
          <PremiumViz id="sliding-window" preset={preset} mount={mount} />
          <p>Text after the visual, to show it never moves while stepping.</p>
        </Prose>
      </div>
    </div>
  )
}

/** A frames step-through (practice answers from the checkout), between lesson text: the visual is found by its preset. */
function FramesGallery({ preset, mount, spacer }: { preset: string; mount?: string; spacer?: string }) {
  const id = framesVizFor(preset)
  if (!id) notFound()
  return (
    <div className="lg:ml-sidebar-lg xl:ml-sidebar-xl">
      <div className="px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <Prose>
          <h1>Frames step-through</h1>
          <p>
            Code that runs in pieces over time: suspended generator frames, worker slots, nested emits. Every state is
            recorded from a real Node run and re-verified by unit tests.
          </p>
          {spacer ? <div data-testid="spacer" style={{ height: 3000 }} /> : null}
          <PremiumViz id={id} preset={preset} mount={mount} />
          <p>Text after the visual, to show it never moves while stepping.</p>
        </Prose>
      </div>
    </div>
  )
}

/**
 * A step-through whose frame may show a practice answer (premium-code
 * policy): its pane is resolved here, on the server, from the local content
 * checkout, as `sync-content.ts` does for a lesson. Without the content (CI)
 * the frame is local-only, like a premium lesson fixture: a note stands in.
 */
async function PremiumViz({ id, preset, mount }: { id: string; preset: string; mount?: string }) {
  const r = await resolveVizCode(id, preset)
  if (r.kind === 'missing')
    return (
      <p data-viz-local-only={`${id}/${preset}`} className="text-sm text-zinc-300">
        This frame shows a practice answer, which is premium and never committed. It renders from a local content
        checkout (<code>src/content</code>) only.
      </p>
    )
  const viz = <Viz id={id} preset={preset} code={r.kind === 'resolved' ? r.code : undefined} />
  return mount === 'client' ? <ClientOnly>{viz}</ClientOnly> : viz
}
