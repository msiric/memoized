import Link from 'next/link'
import type { AccessOptions } from '@prisma/client'

type CatalogItem = {
  title: string
  href: string
  description?: string | null
  access?: AccessOptions
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
    <section aria-label={title} className="mx-auto my-10 max-w-3xl px-4">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href} className="min-w-0">
            <Link
              href={item.href}
              prefetch={false}
              className="block h-full rounded-xl border border-zinc-200 p-4 hover:border-lime-500 dark:border-zinc-700 dark:hover:border-lime-500"
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
          </li>
        ))}
      </ul>
    </section>
  )
}
