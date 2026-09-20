'use client'

import { hydrate, HydrateProps } from 'next-mdx-remote-client/csr'
import { Problem, Prisma } from '@prisma/client'
import { useRef, ReactNode } from 'react'
import { useMDXComponents } from '../../mdx-components'
import { WrapperProps } from './mdx'
import { assertCompiledMdx } from '@/lib/mdx-result'

export type PreserializedMdxRendererProps = {
  serializedContent: Prisma.JsonValue | null | undefined
  lessonId?: string
  header?: ReactNode
  problems?: Problem[]
  groupPractice?: boolean
  withPadding?: boolean
  showNextPage?: boolean
  showFooter?: boolean
}

export const PreserializedMdxRenderer = ({
  serializedContent,
  lessonId,
  header,
  problems = [],
  groupPractice = false,
  withPadding = true,
  showNextPage = true,
  showFooter = true,
}: PreserializedMdxRendererProps) => {
  const { wrapper: WrapperComponent, ...baseComponents } = useMDXComponents({})
  
  // Cache ordinary renders without freezing the server's release selection.
  const hydratedContentRef = useRef<{ content: ReactNode; groupPractice: boolean } | null>(null)
  
  if (hydratedContentRef.current === null || hydratedContentRef.current.groupPractice !== groupPractice) {
    const components = {
      ...baseComponents,
      wrapper: (props: WrapperProps) => (
        <WrapperComponent
          {...props}
          lessonId={lessonId}
          header={header}
          problems={problems}
          groupPractice={groupPractice}
          withPadding={withPadding}
          showNextPage={showNextPage}
          showFooter={showFooter}
        />
      ),
    }
    
    assertCompiledMdx(serializedContent)
    const content = serializedContent as HydrateProps
    
    const { content: hydratedContent, error } = hydrate({
      compiledSource: content.compiledSource,
      frontmatter: content.frontmatter || {},
      scope: content.scope || {},
      components: components as any,
    })
    if (error) throw new Error('Content could not be rendered. The compiled content must be refreshed.')
    
    hydratedContentRef.current = { content: hydratedContent, groupPractice }
  }

  return hydratedContentRef.current.content
}
