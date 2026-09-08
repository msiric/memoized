import '@/styles/tailwind.css'
import { ReactNode } from 'react'
import { ResourcesProviders } from './providers'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'JavaScript & TypeScript Implementation References',
  description:
    'Browse implementation references for JavaScript concepts, TypeScript patterns and data structures. See what each reference covers and which require Premium.',
  path: '/resources',
})

export type ResourcesLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  section: ReactNode
}

export default function ResourcesLayout({
  header,
  navigation,
  section,
}: ResourcesLayoutProps) {
  return (
    <ResourcesProviders
      header={header}
      navigation={navigation}
      section={section}
    />
  )
}
