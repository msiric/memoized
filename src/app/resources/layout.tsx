import { APP_NAME } from '@/constants'
import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { ResourcesProviders } from './providers'

export const metadata: Metadata = {
  title: 'JavaScript Interview Resources - Curated Learning Materials',
  description: 'Curated collection of JavaScript interview resources, study guides, and reference materials. External links to valuable content for algorithm practice, system design, and JavaScript fundamentals.',
  keywords: [
    'javascript interview resources',
    'coding interview study guide',
    'javascript reference materials',
    'algorithm study resources',
    'interview prep resources',
    'javascript learning materials',
    'coding interview links',
    'programming resources javascript'
  ].join(', '),
  openGraph: {
    title: 'JavaScript Interview Resources - Curated Learning Materials',
    description: 'Curated collection of JavaScript interview resources and study guides for comprehensive preparation.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/resources`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Resources - JavaScript Interview Study Materials`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JavaScript Interview Resources - Curated Learning Materials',
    description: 'Curated collection of JavaScript interview resources and study guides.',
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: '/resources',
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
