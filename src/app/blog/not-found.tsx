import Link from 'next/link'
import { BLOG_PREFIX } from '@/constants'

export default function BlogNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
        404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
        Post not found
      </h1>
      <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
        Sorry, the article you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        href={BLOG_PREFIX}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 transition-colors hover:text-lime-600 dark:text-white dark:hover:text-lime-400"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to all posts
      </Link>
    </div>
  )
}
