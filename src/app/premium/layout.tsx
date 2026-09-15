import { APP_NAME } from '@/constants'
import { getCatalogStatsSnapshot } from '@/lib/catalog-request'
import { Metadata } from 'next'
import { ReactNode } from 'react'
import { PremiumProviders } from './providers'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await getCatalogStatsSnapshot()
  const problemCount =
    catalog.status === 'available' ? `${catalog.stats.problems} ` : ''
  return {
    title: 'Premium Access - Unlock Advanced JavaScript Interview Prep',
    description: `Get premium access to ${problemCount}JavaScript interview problems, detailed solutions, and exclusive content. Advanced algorithms, system design, and JavaScript-specific patterns. Student discounts available.`,
    keywords: [
      'javascript interview premium',
      'coding interview course',
      'premium algorithm course',
      'javascript bootcamp',
      'interview prep subscription',
      'coding interview training',
      'technical interview course',
    ].join(', '),
    openGraph: {
      title: 'Premium Access - Unlock Advanced JavaScript Interview Prep',
      description: `Get premium access to ${problemCount}JavaScript interview problems with detailed solutions and exclusive content.`,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/premium`,
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${APP_NAME} Premium - Advanced JavaScript Interview Preparation`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Premium Access - Unlock Advanced JavaScript Interview Prep',
      description: `Get premium access to ${problemCount}JavaScript interview problems with detailed solutions.`,
      images: ['/twitter-image.png'],
    },
    alternates: {
      canonical: '/premium',
    },
  }
}

export type PremiumLayoutProps = {
  children: ReactNode
}

export default async function PremiumLayout({ children }: PremiumLayoutProps) {
  return <PremiumProviders>{children}</PremiumProviders>
}
