// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ListKeysViz from '.'

/** Server render (spec §3.5): the static start frame, with the full text alternative, works without JavaScript. */
describe('list-keys on the server', () => {
  const html = renderToString(<ListKeysViz interactive={false} />)

  it('renders the default preset at its prediction, controls reserved but hidden', () => {
    expect(html).toContain('data-viz-frame="list-keys"')
    expect(html).toContain('data-viz-preset="index-insert-top"')
    expect(html).toContain('data-viz-mode="ask"')
    expect(html).toContain('data-viz-interactive="false"')
    expect(html).toMatch(/data-viz-region="dock"[^>]*class="[^"]*invisible/)
  })

  it('includes every outcome as text and the provenance', () => {
    expect(html).toContain('Outcomes as text')
    expect(html).toContain('moves to Wake up (wrong item)')
    expect(html).toContain('lost (Buy milk remounts unchecked)')
    expect(html).toContain('Verified in React 18.3.1 and 19.3.1')
  })

  it('renders each preset', () => {
    expect(
      renderToString(
        <ListKeysViz preset="parent-type-change" interactive={false} />,
      ),
    ).toContain('data-viz-scene="wrapper"')
  })
})
