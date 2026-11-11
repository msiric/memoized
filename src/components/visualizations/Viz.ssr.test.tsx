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
