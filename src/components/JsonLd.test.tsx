import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { JsonLd } from './JsonLd'

describe('JSON-LD serialization', () => {
  it('preserves structured data without allowing script termination', () => {
    const data = {
      '@type': 'WebPage',
      name: '</script><script>alert(1)</script>',
    }
    const html = renderToStaticMarkup(<JsonLd data={data} />)
    expect(html.match(/<script/g)).toHaveLength(1)
    const encoded = html.match(/>(.*)<\/script>/)?.[1]
    expect(JSON.parse(encoded!)).toEqual(data)
    expect(html).toContain('\\u003c/script>')
  })
})
