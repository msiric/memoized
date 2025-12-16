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

    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|next|@next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          ui: {
            name: 'ui-components',
            test: /[\\/]node_modules[\\/](@headlessui|notistack|framer-motion)[\\/]/,
            chunks: 'async',
            priority: 30,
            enforce: true,
          },
          mdx: {
            name: 'mdx-related',
            test: /[\\/]node_modules[\\/](@mdx-js|remark|unist|mdast|micromark|shiki)[\\/]/,
            chunks: 'async',
            priority: 25,
            enforce: true,
          },
          utils: {
            name: 'utils',
            test: /[\\/]node_modules[\\/](date-fns|lodash|clsx)[\\/]/,
            chunks: 'async',
            priority: 20,
            enforce: true,
          },
          commons: {
            name: 'commons',
            minChunks: 3,
            priority: 15,
            reuseExistingChunk: true,
          },
          largeChunks: {
            name: 'large-chunks',
            test: (module) => {
              return (
                module.resource &&
                (module.resource.includes('6577-f35813091d1b0c22.js') ||
                  module.resource.includes('5715-bc3de2c505c87d72.js') ||
                  module.resource.includes('9790-777668a2459600ad.js'))
              )
            },
            chunks: 'async',
            priority: 50,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            chunks: 'async',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      }

      config.optimization.minimize = true
      config.optimization.usedExports = true
    }

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
