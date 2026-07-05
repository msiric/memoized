import { APP_NAME } from '@/constants'
import { CONTENT_STATS } from '@/constants/content-stats'
import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import { ReactNode } from 'react'
import { ProblemProviders } from './providers'

const problemsPageTitle = `JavaScript Interview Problems - ${CONTENT_STATS.problems} Coding Challenges`

export const metadata: Metadata = {
  title: problemsPageTitle,
  description: `Practice ${CONTENT_STATS.problems} JavaScript interview problems with detailed solutions. Covers arrays, strings, trees, graphs, dynamic programming, and async patterns. LeetCode-style problems with JS focus.`,
  keywords: [
    'javascript interview problems',
    'coding challenges javascript',
    'leetcode javascript solutions',
    'javascript practice problems',
    'algorithm problems js',
    'coding interview questions',
    'javascript coding challenges',
    'programming problems javascript'
  ].join(', '),
  openGraph: {
    title: problemsPageTitle,
    description: `Practice ${CONTENT_STATS.problems} JavaScript interview problems with detailed solutions and language-specific insights.`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/problems`,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} Problems - JavaScript Interview Coding Challenges`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: problemsPageTitle,
    description: `Practice ${CONTENT_STATS.problems} JavaScript interview problems with detailed solutions.`,
    images: ['/twitter-image.png'],
  },
  alternates: {
    canonical: '/problems',
  },
}

export type ProblemLayoutProps = {
  header: ReactNode
  navigation: ReactNode
  table: ReactNode
}

export default async function ProblemLayout({
  header,
  navigation,
  table,
}: ProblemLayoutProps) {
  return (
    <ProblemProviders header={header} navigation={navigation} table={table} />
  )
}
