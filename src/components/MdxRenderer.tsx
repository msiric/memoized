import { mdxOptions } from '@/mdx/index.mjs'
import { MDXComponents } from 'mdx/types'
import { hydrate } from 'next-mdx-remote-client/csr'
import { serialize } from 'next-mdx-remote-client/serialize'
import { useEffect, useState } from 'react'
import { useMDXComponents } from '../../mdx-components'

export type MdxRendererProps = {
  content: string
  withPadding?: boolean
  showNextPage?: boolean
  showFooter?: boolean
}

export const MdxRenderer = ({
  content,
  withPadding = false,
  showNextPage = false,
  showFooter = false,
}: MdxRendererProps) => {
  const [renderedContent, setRenderedContent] = useState<React.JSX.Element | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const components = useMDXComponents({})

  useEffect(() => {
    const compileMdx = async () => {
      try {
        const serialized = await serialize({
          source: content,
          options: { mdxOptions }
        })

        if ('error' in serialized) {
          setError(serialized.error)
          return
        }

        const { content: hydratedContent, error: hydrateError } = hydrate({
          compiledSource: serialized.compiledSource,
          frontmatter: serialized.frontmatter || {},
          scope: serialized.scope || {},
          components: {
            ...components,
            wrapper: (props) => (
              <components.wrapper
                {...props}
                withPadding={withPadding}
                showNextPage={showNextPage}
                showFooter={showFooter}
              />
            ),
          } as Readonly<MDXComponents>
        })

        if (hydrateError) {
          setError(hydrateError)
          return
        }

        setRenderedContent(hydratedContent)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }
    }

    compileMdx()
  }, [content, withPadding, showNextPage, showFooter, components])

  if (error) {
    console.error('MDX compilation/hydration error:', error)
    return <p>Error rendering content</p>
  }

  if (!renderedContent) return <p>Loading...</p>

  return renderedContent
}
