import { Footer } from '@/components/Footer'
import { Logo } from '@/components/Logo'
import '@/styles/tailwind.css'
import Link from 'next/link'
import { COURSES_PREFIX, PROBLEMS_PREFIX, RESOURCES_PREFIX } from '../constants'

export const MinimalLayout = ({
  children,
  centered = false,
}: {
  children: React.ReactNode
  centered?: boolean
}) => {
  return (
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-6 mt-4 flex flex-col items-center justify-between gap-4 xs:flex-row">
        <div>
          <Link href="/" aria-label="Home">
            <Logo className="h-6" />
          </Link>
        </div>
        <div className="flex gap-8">
          <Link
            href={COURSES_PREFIX}
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Courses
          </Link>
          <Link
            href={PROBLEMS_PREFIX}
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Problems
          </Link>
          <Link
            href={RESOURCES_PREFIX}
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Resources
          </Link>
        </div>
      </div>
      <div
        className={`mx-auto -mb-16 -mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6${centered ? ' flex justify-center' : ''}`}
      >
        {children}
      </div>
      <div className="mx-auto -mb-16 -mt-6 max-w-screen-xl px-4 lg:px-6">
        <Footer />
      </div>
    </section>
  )
}
