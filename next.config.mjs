import withBundleAnalyzer from '@next/bundle-analyzer'
import nextMDX from '@next/mdx'
import { withSentryConfig } from '@sentry/nextjs'
import { mdxOptions } from './src/mdx/index.mjs'

const withMDX = nextMDX({
  options: mdxOptions,
})

const analyzeBundles = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  optimizeFonts: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  modularizeImports: {
    'react-icons': {
      transform: 'react-icons/{{member}}',
    },
  },
  experimental: {
    esmExternals: 'loose',
    optimizePackageImports: [
      'shiki',
      'react-icons',
      'date-fns',
      'framer-motion',
      '@mdx-js/react',
      'next-mdx-remote',
      'zustand',
      'notistack',
      '@headlessui/react',
      'react-highlight-words',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'next-themes',
    ],
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FCP'],
    largePageDataBytes: 128 * 1000,
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
  transpilePackages: ['next-mdx-remote', 'shiki'],
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
    reactRemoveProperties:
      process.env.NODE_ENV === 'production'
        ? {
            properties: ['^data-testid$'],
          }
        : false,
  },
  productionBrowserSourceMaps: false,
  swcMinify: true,
  webpack(config, { isServer, dev }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    // Client chunking is left to Next's defaults, which are tuned for the App
    // Router. A custom splitChunks here pulled every lazily-loaded Shiki grammar
    // (~2 MB) into shared chunks loaded on every page.
    config.ignoreWarnings = [
      {
        module: /picocolors/,
      },
      // Ignore OpenTelemetry dynamic require warnings from Sentry
      {
        module: /require-in-the-middle/,
        message: /Critical dependency.*require function is used in a way in which dependencies cannot be statically extracted/,
      },
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency.*the request of a dependency is an expression/,
      },
    ]
    return config
  },
  headers: async () => {
    return [
      {
        // CORS header for Giscus custom theme
        source: '/giscus-theme.css',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*.(ico|png|jpg|jpeg|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=31536000',
          },
        ],
      },
    ]
  },
  redirects: async () => {
    return [
      // The two "Security" lessons were renamed for clarity (Browser Security /
      // Web Application Security), which changes their premium URL slug. Keep the
      // old URLs working for existing bookmarks and links.
      {
        source: '/courses/js-track/advanced-concepts/security',
        destination: '/courses/js-track/advanced-concepts/browser-security',
        permanent: true,
      },
      {
        source: '/courses/js-track/frontend-development/security',
        destination:
          '/courses/js-track/frontend-development/web-application-security',
        permanent: true,
      },
    ]
  },
  poweredByHeader: false,
}

// Only wrap with Sentry in production to reduce development bundle size
const config = analyzeBundles(withMDX(nextConfig))

export default process.env.NODE_ENV === 'production' && !process.env.SENTRY_DISABLE
  ? withSentryConfig(config, {
      org: 'memoized',
      project: 'memoized_nextjs',
      sourcemaps: {
        disable: true,
      },
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : config
