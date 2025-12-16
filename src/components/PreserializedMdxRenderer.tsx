'use client'

import { hydrate, HydrateProps } from 'next-mdx-remote-client/csr'
import { Problem, Prisma } from '@prisma/client'
import { useRef, ReactNode } from 'react'
import { useMDXComponents } from '../../mdx-components'
import { WrapperProps } from './mdx'

export type PreserializedMdxRendererProps = {
  serializedContent: Prisma.JsonValue | null | undefined
  lessonId?: string
  problems?: Problem[]
  withPadding?: boolean
  showNextPage?: boolean
  showFooter?: boolean
}

export const PreserializedMdxRenderer = ({
  serializedContent,
  lessonId,
  problems = [],
  withPadding = true,
  showNextPage = true,
  showFooter = true,
}: PreserializedMdxRendererProps) => {
  const { wrapper: WrapperComponent, ...baseComponents } = useMDXComponents({})
  
  // Store hydrated content in a ref so it only hydrates once and persists across re-renders
  const hydratedContentRef = useRef<ReactNode | null>(null)
  
  if (hydratedContentRef.current === null) {
    const components = {
      ...baseComponents,
      wrapper: (props: WrapperProps) => (
        <WrapperComponent
          {...props}
          lessonId={lessonId}
          problems={problems}
          withPadding={withPadding}
          showNextPage={showNextPage}
          showFooter={showFooter}
        />
      ),
    }
    
    const content = serializedContent as HydrateProps
    
    const { content: hydratedContent } = hydrate({
      compiledSource: content.compiledSource,
      frontmatter: content.frontmatter || {},
      scope: content.scope || {},
      components: components as any,
    })
    
    hydratedContentRef.current = hydratedContent
  }

  return hydratedContentRef.current
}
