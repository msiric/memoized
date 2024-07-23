import Link from 'next/link'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export const MinimalHeader = () => {
  return (
    <div className="mx-6 mt-4 flex flex-col items-center justify-between gap-4 xs:flex-row">
      <div>
        <Link href="/" aria-label="Home">
          <Logo className="h-6" />
        </Link>
      </div>
      <div className="flex items-center gap-8">
        <ThemeToggle />
        <Link
          href="/course"
          className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          Course
        </Link>
        <Link
          href="/problems"
          className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          Problems
        </Link>
      </div>
    </div>
  )
}
