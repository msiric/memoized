import { Providers } from '@/app/providers'
import '@/styles/tailwind.css'
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
      </head>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <NextTopLoader color="#84cc16" showSpinner={false} />
        <Providers>
          <div className="w-full">{children}</div>
          <SpeedInsights />
        </Providers>
        <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
      </body>
    </html>
  )
}
