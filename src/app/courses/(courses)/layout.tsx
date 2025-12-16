import { APP_NAME, COURSES_PREFIX } from '@/constants'
import { Metadata } from 'next'
import { ReactNode } from 'react'
import { CoursesProviders } from './providers'

export const metadata: Metadata = {
  title: 'JavaScript & Algorithm Courses - Interactive Learning Tracks',
  description: 'Explore comprehensive JavaScript and Data Structures & Algorithms courses. Master 450+ interview problems with detailed explanations and JavaScript-specific implementation patterns.',
  keywords: [
    'javascript courses',
    'algorithm courses',
    'data structures course',
    'javascript training',
    'coding bootcamp',
    'programming courses',
    'interview preparation course',
    'online coding course'
  ].join(', '),
  openGraph: {
    title: 'JavaScript & Algorithm Courses - Interactive Learning Tracks',
    description: 'Explore comprehensive JavaScript and Data Structures & Algorithms courses with 450+ interview problems.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}${COURSES_PREFIX}`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Courses - JavaScript and Algorithm Learning Tracks`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JavaScript & Algorithm Courses - Interactive Learning Tracks',
    description: 'Explore comprehensive JavaScript and Data Structures & Algorithms courses with 450+ interview problems.',
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: `${COURSES_PREFIX}`,
  },
}

export type CoursesLayoutProps = {
  header: ReactNode
  children: ReactNode
}

export default async function CoursesLayout({
  header,
  children,
}: CoursesLayoutProps) {
  return <CoursesProviders header={header}>{children}</CoursesProviders>
}
