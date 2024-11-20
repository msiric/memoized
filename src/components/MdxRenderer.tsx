import { mdxOptions } from '@/mdx/index.mjs'
import { MDXComponents } from 'mdx/types'
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
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
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(
    null,
  )
  const components = useMDXComponents({})

  useEffect(() => {
    const compileMdx = async () => {
      const serialized = await serialize(content, { mdxOptions })
      setMdxSource(serialized)
    }

    compileMdx()
  }, [content])

  if (!mdxSource) return <p>Loading...</p>

  return (
    <MDXRemote
      {...mdxSource}
      components={
        {
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
      }
    />
  )
}
