'use client'

import { hydrate, HydrateProps } from 'next-mdx-remote-client/csr'
import { Prisma } from '@prisma/client'
import { useRef, ReactNode } from 'react'
import { useMDXComponents } from '../../mdx-components'
import { BlogImage } from './BlogImage'
import { BlogH1, BlogH2, BlogH3, BlogH4 } from './BlogHeading'

export type BlogMdxRendererProps = {
  serializedContent: Prisma.JsonValue | null | undefined
}

// Blog-specific wrapper - optimized for reading
// Larger text, better line-height, comfortable reading width
const BlogWrapper = ({ children }: { children?: ReactNode }) => (
  <div className="prose prose-lg prose-zinc max-w-none dark:prose-invert
    prose-p:text-[1.125rem] prose-p:leading-[1.8] prose-p:text-zinc-700 dark:prose-p:text-zinc-300
    prose-headings:font-semibold prose-headings:tracking-tight
    prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-2xl
    prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-xl
    prose-a:text-lime-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-lime-400
    prose-blockquote:border-l-lime-500 prose-blockquote:bg-zinc-50 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:rounded-r-lg dark:prose-blockquote:bg-zinc-900/50
    prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.9em] prose-code:font-normal dark:prose-code:bg-zinc-800
    prose-img:rounded-xl prose-img:shadow-sm
    prose-li:text-[1.0625rem] prose-li:leading-[1.75]
    prose-ul:my-6 prose-ol:my-6
    prose-hr:my-12 prose-hr:border-zinc-100 prose-hr:mx-0 dark:prose-hr:border-zinc-800/50
    [&>:first-child]:mt-0
    [&>p:first-of-type]:text-[1.25rem] [&>p:first-of-type]:leading-[1.7] [&>p:first-of-type]:text-zinc-600 dark:[&>p:first-of-type]:text-zinc-400
  ">
    {children}
  </div>
)

// Blog-specific heading components with anchor links
const blogHeadings = {
  h1: BlogH1,
  h2: BlogH2,
  h3: BlogH3,
  h4: BlogH4,
}

export const BlogMdxRenderer = ({ serializedContent }: BlogMdxRendererProps) => {
  // Get shared MDX components (code, img, links, etc.)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { wrapper: _unusedWrapper, h2: _h2, img: _img, ...baseComponents } = useMDXComponents({})

  // Store hydrated content in a ref so it only hydrates once
  const hydratedContentRef = useRef<ReactNode | null>(null)

  if (!serializedContent) {
    return null
  }

  if (hydratedContentRef.current === null) {
    const content = serializedContent as HydrateProps

    // Use shared components (code, links) but override:
    // - wrapper: blog-specific wrapper without lesson components
    // - headings: simple headings that don't require SectionProvider
    // - img: BlogImage with lightbox support
    const components = {
      ...baseComponents,
      ...blogHeadings,
      img: BlogImage,
      wrapper: BlogWrapper,
    }

    const { content: hydratedContent } = hydrate({
      compiledSource: content.compiledSource,
      frontmatter: content.frontmatter || {},
      scope: content.scope || {},
      components: components as Parameters<typeof hydrate>[0]['components'],
    })

    hydratedContentRef.current = hydratedContent
  }

  return <div className="blog-content">{hydratedContentRef.current}</div>
}
