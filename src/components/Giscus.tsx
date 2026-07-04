'use client'

import GiscusComponent from '@giscus/react'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { getSiteUrl } from '@/config/env'

type GiscusProps = {
  /**
   * The term to use for mapping (usually the blog post slug or URL path)
   */
  term: string
}

/**
 * Giscus comments component using the official @giscus/react package
 *
 * To set up Giscus:
 * 1. Install the Giscus GitHub App: https://github.com/apps/giscus
 * 2. Enable GitHub Discussions on your repository
 * 3. Go to https://giscus.app to configure and get your settings
 * 4. Set the following environment variables:
 *    - NEXT_PUBLIC_GISCUS_REPO (e.g., "username/repo")
 *    - NEXT_PUBLIC_GISCUS_REPO_ID
 *    - NEXT_PUBLIC_GISCUS_CATEGORY
 *    - NEXT_PUBLIC_GISCUS_CATEGORY_ID
 */
export function Giscus({ term }: GiscusProps) {
  const { resolvedTheme } = useTheme()
  const siteUrl = getSiteUrl()

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO as `${string}/${string}` | undefined
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID

  // Check if Giscus is configured
  const isConfigured = !!(repo && repoId && category && categoryId)

  // Custom theme URLs
  // - Development: Use gist.githack.com which serves files with correct MIME type (text/css)
  //   (GitHub Gist raw serves CSS as text/plain which gets blocked by x-content-type-options: nosniff)
  // - Production: Use the local /giscus-theme.css file
  const isProduction = !siteUrl.includes('localhost') && !siteUrl.includes('ngrok')
  const devThemeUrl = `https://gist.githack.com/msiric/6a6d9a7a2315099af936e6058f1956c0/raw/giscus-theme.css`
  const prodThemeUrl = `${siteUrl}/giscus-theme.css`
  const customThemeUrl = isProduction ? prodThemeUrl : devThemeUrl
  
  const theme = resolvedTheme === 'dark' ? customThemeUrl : 'light'

  // Send theme via postMessage after iframe loads as backup
  // This ensures the custom theme is applied even if there are caching issues
  useEffect(() => {
    // Skip if not configured or not dark theme
    if (!isConfigured || resolvedTheme !== 'dark') return

    const sendThemeToGiscus = () => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { giscus: { setConfig: { theme: customThemeUrl } } },
          'https://giscus.app'
        )
      }
    }

    // Listen for messages from Giscus to know when it's ready
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://giscus.app') return
      sendThemeToGiscus()
    }

    window.addEventListener('message', handleMessage)
    const timeout = setTimeout(sendThemeToGiscus, 1000)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearTimeout(timeout)
    }
  }, [isConfigured, resolvedTheme, customThemeUrl])

  // Show placeholder if not configured
  if (!isConfigured) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-600 dark:text-zinc-400">
          Comments will be available once Giscus is configured.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Visit{' '}
          <a
            href="https://giscus.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-lime-600 hover:underline dark:text-lime-400"
          >
            giscus.app
          </a>{' '}
          to set up comments.
        </p>
      </div>
    )
  }

  return (
    <GiscusComponent
      id="comments"
      repo={repo}
      repoId={repoId}
      category={category}
      categoryId={categoryId}
      mapping="specific"
      term={term}
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme}
      lang="en"
      loading="eager"
    />
  )
}
