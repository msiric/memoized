import Link from 'next/link'
import type { AccessOptions } from '@prisma/client'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import clsx from 'clsx'

type CatalogItem = {
  title: string
  href: string
  description?: string | null
  access?: AccessOptions
  secondaryAction?: { href: string; label: string }
}

export function CatalogDirectory({
  title,
  items,
}: {
  title: string
  items: CatalogItem[]
}) {
  if (items.length === 0) return null
  return (
    <section aria-label={title} className={`${CONTENT_COLUMN_CLASSES} mb-10`}>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href} className={clsx('min-w-0', item.secondaryAction && 'flex flex-col gap-2')}>
            <Link
              href={item.href}
              prefetch={false}
              className={clsx('block rounded-xl border border-zinc-200 p-4 hover:border-lime-500 dark:border-zinc-700 dark:hover:border-lime-500',
                item.secondaryAction ? 'flex-1' : 'h-full')}
            >
              <span className="block break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {item.title}
              </span>
              {item.access && (
                <span className="mt-1 block text-xs text-lime-700 dark:text-lime-300">
                  {item.access === 'FREE' ? 'Free' : 'Premium depth'}
                </span>
              )}
              {item.description && (
                <span className="mt-2 block text-xs leading-6 text-zinc-600 dark:text-zinc-400">
                  {item.description}
                </span>
              )}
            </Link>
            {item.secondaryAction && (
              <Link href={item.secondaryAction.href} prefetch={false}
                className="rounded-md px-1 py-2 text-sm font-medium text-lime-700 underline underline-offset-4 dark:text-lime-300">
                {item.secondaryAction.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
