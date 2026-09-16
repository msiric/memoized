import Link from 'next/link'
import clsx from 'clsx'
import { Button } from '@/components/Button'
import type { NavigationPage } from '@/lib/lesson-navigation'

function PageLink({ page, previous = false }: {
  page: NavigationPage
  previous?: boolean
}) {
  const label = previous ? 'Previous' : 'Next'
  return (
    <>
      <Button href={page.href} aria-label={`${label}: ${page.title}`}
        variant="secondary" arrow={previous ? 'left' : 'right'}>
        {label}
      </Button>
      <Link href={page.href} tabIndex={-1} aria-hidden="true"
        className={clsx(
          'max-w-full break-words text-base font-semibold text-zinc-900 transition hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300',
          previous ? 'text-left' : 'text-right',
        )}>
        {page.title}
      </Link>
    </>
  )
}

export function PageNavigation({ previousPage, nextPage, label = 'Page navigation' }: {
  previousPage?: NavigationPage | null
  nextPage?: NavigationPage | null
  label?: string
}) {
  if (!previousPage && !nextPage) return null

  return (
    <nav aria-label={label} className="grid grid-cols-2 gap-6">
      {previousPage && (
        <div className="flex min-w-0 flex-col items-start gap-3">
          <PageLink page={previousPage} previous />
        </div>
      )}
      {nextPage && (
        <div className="col-start-2 flex min-w-0 flex-col items-end gap-3">
          <PageLink page={nextPage} />
        </div>
      )}
    </nav>
  )
}
