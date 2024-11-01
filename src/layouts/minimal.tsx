import { Footer } from '@/components/Footer'
import { Logo } from '@/components/Logo'
import '@/styles/tailwind.css'
import Link from 'next/link'

export const MinimalLayout = ({ children }: { children: React.ReactNode }) => {
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
            href="/courses"
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Courses
          </Link>
          <Link
            href="/problems"
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Problems
          </Link>
        </div>
      </div>
      <div className="mx-auto -mb-16 -mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6">
        {children}
      </div>
      <div className="mx-auto -mb-16 -mt-6 max-w-screen-xl px-4 lg:px-6">
        <Footer />
      </div>
    </section>
  )
}
