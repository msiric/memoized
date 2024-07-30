import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { ResourcesProviders } from './providers'

export const metadata: Metadata = {
  title: {
    template: 'Resources',
    default: 'Resources',
  },
}

export type ResourcesLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  section: ReactNode
}

export default async function ResourcesLayout({
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
