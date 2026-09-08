import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { table as MdxTable } from './mdx'

describe('MDX comparison tables', () => {
  it('provides a keyboard-focusable horizontal scroll region without changing table semantics', () => {
    const html = renderToStaticMarkup(
      <MdxTable>
        <tbody>
          <tr>
            <td>Value</td>
          </tr>
        </tbody>
      </MdxTable>,
    )
    expect(html).toContain('overflow-x-auto')
    expect(html).toContain('tabindex="0"')
    expect(html).toContain('aria-label="Scrollable data table"')
    expect(html).toContain('<table')
    expect(html).toContain('<td>Value</td>')
  })
})
