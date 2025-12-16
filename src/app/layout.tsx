import { Providers } from '@/app/providers'
import { APP_NAME } from '@/constants'
import '@/styles/tailwind.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { type Metadata } from 'next'
import Script from 'next/script'
import NextTopLoader from 'nextjs-toploader'
import ErrorBoundary from '@/components/ErrorBoundary'
import { WebVitals } from '@/components/WebVitals'

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `JavaScript Interview Prep | ${APP_NAME}`,
  },
  description: 'Master JavaScript interview questions with 450+ problems focused on JS-specific patterns. Learn async algorithms, closure gotchas, and performance optimization. Created by Microsoft Senior SWE.',
  keywords: [
    'javascript interview questions',
    'javascript algorithms', 
    'typescript interview prep',
    'coding interview preparation',
    'frontend developer interview',
    'javascript coding challenges',
    'async javascript patterns',
    'javascript closure interview',
    'js leetcode solutions',
    'frontend interview prep',
    'react interview questions',
    'javascript data structures',
    'web developer interview prep',
    'senior frontend engineer interview',
    'javascript technical interview'
  ].join(', '),
  authors: [{ name: 'Mario Siric', url: `${process.env.NEXT_PUBLIC_SITE_URL}` }],
  creator: APP_NAME,
  publisher: APP_NAME,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'JavaScript Interview Prep - Master Algorithms & JS Patterns',
    description: 'Master JavaScript interview questions with 450+ problems focused on JS-specific patterns. Created by Microsoft Senior SWE.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}`,
    siteName: APP_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - JavaScript Interview Preparation Platform`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JavaScript Interview Prep - Master Algorithms & JS Patterns',
    description: 'Master JavaScript interview questions with 450+ problems focused on JS-specific patterns.',
    images: ['/twitter-image.png'], 
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${process.env.NEXT_PUBLIC_SITE_URL}/#website`,
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}`,
        "name": APP_NAME,
        "alternateName": "Memoized.io",
        "description": "JavaScript interview preparation platform with 450+ coding problems",
        "publisher": {
          "@id": `${process.env.NEXT_PUBLIC_SITE_URL}/#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        },
        "mainEntity": [
          {
            "@type": "ItemList",
            "name": "Main Navigation",
            "itemListElement": [
              {
                "@type": "SiteNavigationElement",
                "position": 1,
                "name": "JavaScript Track",
                "description": "Core JavaScript fundamentals and advanced concepts",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL}/courses/js-track`
              },
              {
                "@type": "SiteNavigationElement", 
                "position": 2,
                "name": "TypeScript Introduction",
                "description": "TypeScript basics and advanced type system",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL}/courses/js-track/typescript-introduction`
              },
              {
                "@type": "SiteNavigationElement",
                "position": 3,
                "name": "Data Structures & Algorithms",
                "description": "Essential DSA concepts with JavaScript implementations",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL}/courses/dsa-track`
              },
              {
                "@type": "SiteNavigationElement",
                "position": 4,
                "name": "Interview Problems",
                "description": "450+ coding interview problems with solutions",
                "url": `${process.env.NEXT_PUBLIC_SITE_URL}/courses`
              }
            ]
          }
        ]
      },
      {
        "@type": "Organization",
        "@id": `${process.env.NEXT_PUBLIC_SITE_URL}/#organization`,
        "name": APP_NAME,
        "alternateName": "Memoized.io",
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}`,
        "description": "JavaScript interview preparation platform created by Microsoft Senior SWE",
        "foundingDate": "2025",
        "founder": {
          "@type": "Person",
          "name": "Mario Siric",
          "jobTitle": "Senior Software Engineer",
          "worksFor": "Microsoft"
        },
        "sameAs": [
          `${process.env.NEXT_PUBLIC_SITE_URL}`,
          "https://www.memoized.io"
        ],
        "knowsAbout": [
          "JavaScript Interview Preparation",
          "Algorithm Optimization", 
          "TypeScript",
          "Async JavaScript Patterns",
          "Frontend Development",
          "Coding Interview Preparation",
          "Software Engineering Education"
        ],
        "offers": {
          "@type": "EducationalOccupationalProgram",
          "name": "JavaScript Interview Preparation Course",
          "description": "Comprehensive coding interview preparation with 450+ problems",
          "provider": {
            "@type": "Organization",
            "name": APP_NAME
          }
        }
      },
      {
        "@type": "EducationalOrganization",
        "name": APP_NAME,
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}`,
        "description": "Learn JavaScript algorithms and interview patterns",
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "JavaScript Interview Courses",
          "itemListElement": [
            {
              "@type": "Course",
              "name": "JavaScript Interview Preparation",
              "description": "Comprehensive JavaScript interview prep with 450+ problems",
              "provider": {
                "@type": "Organization",
                "name": APP_NAME
              },
              "courseMode": "online",
              "educationalLevel": "Intermediate",
              "programmingLanguage": ["JavaScript", "TypeScript"]
            }
          ]
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What makes Memoized different from other coding interview platforms?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Memoized focuses specifically on JavaScript and TypeScript interview patterns with 450+ problems designed by a Microsoft Senior Software Engineer. We emphasize JS-specific concepts like closures, async patterns, and engine internals."
            }
          },
          {
            "@type": "Question", 
            "name": "How many JavaScript interview problems are included?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Memoized includes over 450 carefully curated JavaScript interview problems covering data structures, algorithms, and language-specific patterns."
            }
          },
          {
            "@type": "Question",
            "name": "Is TypeScript covered in the interview preparation?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we have a dedicated TypeScript section covering fundamentals, advanced types, generics, and common interview questions about TypeScript."
            }
          },
          {
            "@type": "Question",
            "name": "Are the problems suitable for frontend developer interviews?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely! Our problems cover frontend-specific concepts like DOM manipulation, event handling, React patterns, and performance optimization."
            }
          }
        ]
      }
    ]
  }

  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      strategy="beforeInteractive"
    />
  )
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <StructuredData />
        <link
          rel="preload"
          as="style"
          href="/_next/static/css/app/layout.css"
          crossOrigin="anonymous"
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
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <NextTopLoader color="#84cc16" showSpinner={false} />
        <Providers>
          <ErrorBoundary>
            <div className="w-full">{children}</div>
          </ErrorBoundary>
        </Providers>
        <WebVitals />
        <SpeedInsights />
        <Analytics />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="8573b390-8d88-4b52-b4b1-63ff2a5df61d"
          strategy="lazyOnload"
        />
        <GoogleAnalytics gaId="AW-16659115277" />
        <Script
          src="https://js.stripe.com/v3/pricing-table.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}