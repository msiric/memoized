import Link from 'next/link'
import { JsonLd } from './JsonLd'
import { siteUrl } from '@/lib/seo'

export function Breadcrumbs({
  items,
}: {
  items: { title: string; href: string }[]
}) {
  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs text-zinc-500 dark:text-zinc-400"
      >
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={item.href} className="flex min-w-0 items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              <Link
                href={item.href}
                aria-current={index === items.length - 1 ? 'page' : undefined}
                className="break-words hover:text-lime-600 dark:hover:text-lime-300"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.title,
            item: siteUrl(item.href),
          })),
        }}
      />
    </>
  )
}
