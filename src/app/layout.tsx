import { Providers } from '@/app/providers'
import '@/styles/tailwind.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { type Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'

export const metadata: Metadata = {
  title: {
    template: 'Memoized',
    default: 'Memoized',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
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
        <meta
          name="title"
          content="Memoized: Master Technical Interviews the JavaScript Way"
        />
        <meta
          name="description"
          content="Unlock in-depth skills to ace JavaScript and TypeScript interviews with Memoized. Tailored lessons, practice problems, and expert tips"
        />
        <meta
          name="keywords"
          content="JavaScript, TypeScript, algorithms, data structures, coding interviews, LeetCode, interview questions, technical interviews, Memoized, practice problems, coding patterns, interview prep"
        />
        <meta name="robots" content="index, follow" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="language" content="English" />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="8573b390-8d88-4b52-b4b1-63ff2a5df61d"
        ></script>
      </head>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <NextTopLoader color="#84cc16" showSpinner={false} />
        <Providers>
          <div className="w-full">{children}</div>
          <SpeedInsights />
          <Analytics />
        </Providers>
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </body>
    </html>
  )
}
