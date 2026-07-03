import { ReactNode } from 'react'
import { Logo } from '@/components/Logo'
import { BLOG_PREFIX } from '@/constants'
import Link from 'next/link'

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Blog Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          {/* Logo with Blog label */}
          <Link
            href={BLOG_PREFIX}
            className="group flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo className="h-5" />
            <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
              Blog
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Home
            </Link>
            <Link
              href={`${BLOG_PREFIX}/rss.xml`}
              className="flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              title="RSS Feed"
              aria-label="Subscribe to RSS feed"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20 5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
              </svg>
              <span className="hidden sm:inline">RSS</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Blog Footer - Minimal */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800/50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                Home
              </Link>
              <Link
                href="/courses"
                className="transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                Courses
              </Link>
              <Link
                href="/problems"
                className="transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                Problems
              </Link>
              <Link
                href="/resources"
                className="transition-colors hover:text-zinc-900 dark:hover:text-white"
              >
                Resources
              </Link>
            </div>
            <span>
              © {new Date().getFullYear()} Memoized
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
