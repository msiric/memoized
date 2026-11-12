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

  it('names the stage image by the title and describes it with the text alternative', () => {
    const stage = html.match(/<div data-viz-region="stage" role="img" aria-labelledby="([^"]+)" aria-describedby="([^"]+)"/)
    expect(stage).not.toBeNull()
    const [, title, desc] = stage!
    expect(html).toContain(`id="${title}"`)
    expect(html).toMatch(new RegExp(`<div id="${desc}"[^>]*>.*sameCounter → ƒ A`))
    expect(html).toContain('Verified output, counters (Node 24.x):')
    // Every SVG is decorative inside the image role.
    expect(html.match(/<svg aria-hidden="true" focusable="false"/g)?.length).toBe(8)
  })

  it('defaults to the first preset and renders the SVG for both layout variants', () => {
    const d = renderToString(<Viz id="environment-records" />)
    expect(d).toContain('data-viz-preset="var-vs-let-loop"')
    expect(d).toContain('data-viz-variant="narrow"')
    expect(d).toContain('data-viz-variant="wide"')
  })
})
