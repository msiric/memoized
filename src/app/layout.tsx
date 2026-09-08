import { Providers } from '@/app/providers'
import { APP_NAME } from '@/constants'
import { CONTENT_STATS } from '@/constants/content-stats'
import '@/styles/tailwind.css'
import { type Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import ErrorBoundary from '@/components/ErrorBoundary'
import { JsonLd } from '@/components/JsonLd'
import { SiteAnalytics } from '@/components/SiteAnalytics'
import { getSiteUrl } from '@/config/env'
import { isPreviewDeployment } from '@/lib/seo'

const description = `Prepare for JavaScript and TypeScript interviews with ${CONTENT_STATS.problems} theory and coding problems, worked explanations, and data-structure practice.`

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    template: `%s | ${APP_NAME}`,
    default: `JavaScript & TypeScript Interview Prep | ${APP_NAME}`,
  },
  description,
  authors: [{ name: 'Mario Siric' }],
  creator: APP_NAME,
  publisher: APP_NAME,
  openGraph: {
    title: `JavaScript & TypeScript Interview Prep | ${APP_NAME}`,
    description,
    siteName: APP_NAME,
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} interview preparation`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `JavaScript & TypeScript Interview Prep | ${APP_NAME}`,
    description,
    images: ['/twitter-image.png'],
  },
  robots: { index: !isPreviewDeployment(), follow: true },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const url = getSiteUrl()
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebSite',
                '@id': `${url}/#website`,
                url,
                name: APP_NAME,
                description,
                publisher: { '@id': `${url}/#organization` },
              },
              {
                '@type': 'Organization',
                '@id': `${url}/#organization`,
                url,
                name: APP_NAME,
                logo: `${url}/images/brand/logo-dark.png`,
                founder: { '@type': 'Person', name: 'Mario Siric' },
              },
            ],
          }}
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#18181b" />
      </head>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <NextTopLoader color="#84cc16" showSpinner={false} />
        <Providers>
          <ErrorBoundary>
            <div className="w-full">{children}</div>
          </ErrorBoundary>
        </Providers>
        <SiteAnalytics />
      </body>
    </html>
  )
}
