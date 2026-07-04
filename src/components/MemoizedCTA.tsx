import Link from 'next/link'

const MEMOIZED_APP_URL = 'https://www.memoized.io'

export function MemoizedCTA() {
  return (
    <aside className="border-t border-zinc-100 py-8 dark:border-zinc-800/50">
      <p className="text-center text-base text-zinc-600 dark:text-zinc-400">
        Enjoyed this post? You might like{' '}
        <Link
          href={MEMOIZED_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-lime-600 hover:decoration-lime-500 dark:text-white dark:decoration-zinc-600 dark:hover:text-lime-400 dark:hover:decoration-lime-400"
        >
          Memoized
        </Link>
        {' '}— an interview prep platform I&apos;m working on, built specifically for JavaScript engineers.
      </p>
    </aside>
  )
}
