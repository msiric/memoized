// @vitest-environment node
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { register } from 'tsx/cjs/api'
import { beforeAll, describe, expect, it } from 'vitest'

// `<Viz>` requires its server renderers with a plain `require` that only runs
// when `window` is undefined (webpack resolves it in Next). Teach Node's
// require to load TSX so the same code path runs here.
// tsx compiles JSX with the classic runtime, which expects a React global.
register()
Object.assign(globalThis, { React })
let Viz: typeof import('./Viz').Viz
beforeAll(async () => {
  Viz = (await import('./Viz')).Viz
})

/**
 * Server render (spec §3.5): the static Start frame is real HTML, with the
 * steps-as-text list, and the controls keep their space but stay hidden and
 * aria-disabled until the engine loads.
 */
describe('<Viz> on the server', () => {
  let html = ''
  beforeAll(() => {
    html = renderToString(<Viz id="event-loop" />)
  })

  it('renders the static Start frame inside the lazy mount', () => {
    expect(html).toContain('data-viz="event-loop"')
    expect(html).toContain('data-viz-ssr=""')
    expect(html).toContain('data-viz-interactive="false"')
    expect(html).toContain('Event loop: sync, microtasks, tasks')
    expect(html).toContain('data-viz-step="0"')
  })

  it('includes the full text alternative and provenance without JavaScript', () => {
    expect(html).toContain('<details')
    expect(html).toContain('Steps as text')
    expect(html).toContain('Verified output (Node 24.x)')
    expect(html).toContain('A, D, C, B')
    expect(html).toContain('Recorded from a real run in Node 24.x')
  })

  it('reserves the controls but hides them and marks them aria-disabled', () => {
    expect(html).toMatch(/data-viz-region="bar"[^>]*class="[^"]*invisible/)
    expect(html).toMatch(/role="slider"[^>]*tabindex="-1"[^>]*aria-disabled="true"/)
  })

  it('renders the requested preset and nothing for an unknown id', () => {
    expect(renderToString(<Viz id="event-loop" preset="microtask-queued-during-drain" />)).toContain('micro 1')
    expect(renderToString(<Viz id="nope" />)).toBe('')
  })
})

/**
 * Practice-answer presets (premium-code policy): the page brings the pane's
 * text as `code`; a frame missing any it needs renders nothing at all, never
 * a pane of placeholders.
 */
describe('<Viz> with a practice-answer preset', () => {
  it('renders nothing without the resolved pane, for the answer and for a lesson preset sharing its group', () => {
    expect(renderToString(<Viz id="bfs-dfs-frontier" preset="bst-iterator-stack" />)).toBe('')
    expect(renderToString(<Viz id="bfs-dfs-frontier" preset="bfs-levels" />)).toBe('')
    expect(renderToString(<Viz id="linked-list-pointer-rewiring" preset="palindrome-1221" />)).toBe('')
    // A group with no answer is unaffected.
    expect(renderToString(<Viz id="linked-list-pointer-rewiring" preset="reverse-between-m2-n4" />)).toContain('data-viz-ssr=""')
  })

  it('shows the pane the page brings (a JSON string from MDX), at the committed widths', async () => {
    const { VIZ_DESCRIPTORS } = await import('./registry')
    const log = VIZ_DESCRIPTORS['bfs-dfs-frontier'].presets.find((p) => p.id === 'bst-iterator-stack')!.log
    // Stand-in text of the same widths (no answer text in the repo).
    const lines = log.code!.lines.map((l) => l.replace(/\u00b7/g, 'q'))
    const html = renderToString(<Viz id="bfs-dfs-frontier" preset="bst-iterator-stack" code={JSON.stringify({ 'bst-iterator-stack': { lines } })} />)
    expect(html).toContain('data-viz-ssr=""')
    expect(html).toContain(lines[0].trim())
    expect(html).not.toContain('\u00b7')
  })
})

/**
 * Static figures (spec §3.3, §6.4): final server markup, an image role named
 * by the title and described by the full text alternative, and nothing that
 * needs JavaScript.
 */
describe('<Viz> static figure on the server', () => {
  let html = ''
  beforeAll(() => {
    html = renderToString(<Viz id="environment-records" preset="factory-calls-vs-aliases" />)
  })

  it('renders the figure with title, caption and "Diagram as text"', () => {
    expect(html).toContain('data-viz-kind="static"')
    expect(html).toContain('data-viz-preset="factory-calls-vs-aliases"')
    expect(html).toContain('Factory calls vs aliases')
    expect(html).toMatch(/<figcaption[^>]*>Each factory call creates a new record/)
    expect(html).toContain('Diagram as text')
    expect(html).toContain('Recorded from a real run in Node 24.x')
    expect(html).not.toContain('data-viz-interactive')
    expect(html).not.toContain('xl:max-w-[960px]')
  })

  it('names the stage group by the title and describes it with the text alternative', () => {
    const stage = html.match(/<div data-viz-region="stage" role="group" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/)
    expect(stage).not.toBeNull()
    const [, title, desc] = stage!
    expect(html).toContain(`id="${title}"`)
    expect(html).toMatch(new RegExp(`<div id="${desc}"[^>]*>.*sameCounter → ƒ A`))
    expect(html).toContain('Verified output, counters (Node 24.x):')
    // Only the function objects are exposed: focusable and named (D21).
    // Everything else in each of the 8 SVGs sits in two decorative groups.
    expect(html.match(/<svg [^>]*data-viz-width/g)?.length).toBe(8)
    expect(html.match(/<g aria-hidden="true">/g)?.length).toBe(16)
    expect(html.match(/<g data-node="[^"]+" tabindex="0" role="img" aria-label="ƒ [^"]+"/g)?.length).toBe(4 * (2 + 3))
    expect(html).toContain('aria-label="ƒ A, named counter1 and sameCounter, created in createCounter() call A; it reads count = 2"')
  })

  it('defaults to the first preset and renders the SVG for both layout variants', () => {
    const d = renderToString(<Viz id="environment-records" />)
    expect(d).toContain('data-viz-preset="var-vs-let-loop"')
    expect(d).toContain('data-viz-variant="narrow"')
    expect(d).toContain('data-viz-variant="wide"')
  })
})
