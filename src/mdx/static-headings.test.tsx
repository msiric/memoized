import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as runtime from 'react/jsx-runtime'
import { serialize } from 'next-mdx-remote-client/serialize'
import { describe, expect, it, vi } from 'vitest'
import { mdxOptions } from './index.mjs'
import { staticHeading } from './static-headings.mjs'
import { extractSectionsFromCompiledSource } from '@/services/section'
import { assertCompiledMdx } from '@/lib/mdx-result'
import { G3C_HEADINGS } from '@/lib/g3c-task'

vi.mock('@/lib/prisma', () => ({ default: {} }))

describe('static legacy heading serialization', () => {
  it('exports the same literal IDs and new visible titles that the normal h2 renderer receives', async () => {
    const source = Object.entries(G3C_HEADINGS)
      .map(([id, title]) => `<h2 id="${id}">${title}</h2>\n\nVisible guidance.`).join('\n\n')
    const compiled = await serialize({ source, options: { mdxOptions } })
    assertCompiledMdx(compiled)
    expect(extractSectionsFromCompiledSource(compiled.compiledSource)).toEqual(
      Object.entries(G3C_HEADINGS).map(([id, title]) => ({ id, title })),
    )
    const renderedModule = new Function(compiled.compiledSource)({ ...runtime, useMDXComponents: () => ({}) })
    const markup = renderToStaticMarkup(createElement(renderedModule.default, {
      components: { h2: ({ children, ...props }: React.ComponentPropsWithoutRef<'h2'>) => <h2 data-reader-heading {...props}>{children}</h2> },
    }))
    for (const [id, title] of Object.entries(G3C_HEADINGS)) {
      expect(markup).toContain(`id="${id}"`)
      expect(markup).toContain(title.replaceAll("'", '&#x27;'))
    }
    expect(markup.match(/data-reader-heading/g)).toHaveLength(9)
  })

  it('keeps ordinary Markdown heading slugs and duplicate suffixes unchanged', async () => {
    const compiled = await serialize({ source: '## Existing title\n\nText.\n\n## Existing title', options: { mdxOptions } })
    assertCompiledMdx(compiled)
    expect(extractSectionsFromCompiledSource(compiled.compiledSource)).toEqual([
      { id: 'existing-title', title: 'Existing title' },
      { id: 'existing-title-2', title: 'Existing title' },
    ])
  })

  it.each([
    { attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: { type: 'mdxJsxAttributeValueExpression', value: 'dynamic' } }] },
    { attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: 'safe' }, { type: 'mdxJsxAttribute', name: 'onClick', value: 'unsafe' }] },
    { attributes: [{ type: 'mdxJsxExpressionAttribute', value: '...props' }] },
    { attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: '' }] },
    { children: [{ type: 'mdxTextExpression', value: 'dynamic' }] },
    { children: [{ type: 'text', value: '   ' }] },
  ])('does not normalize an unsupported literal shape', extra => {
    expect(staticHeading({
      type: 'mdxJsxFlowElement', name: 'h2',
      attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: 'legacy-id' }],
      children: [{ type: 'text', value: 'Visible heading' }],
      ...extra,
    })).toBeNull()
  })
})
