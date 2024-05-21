import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const builtInDataStructures = [
  {
    href: '/strings',
    title: 'Strings',
    description:
      'Read about the different types of errors returned by the API.',
  },
  {
    href: '/numbers',
    title: 'Numbers',
    description:
      'Read about the different types of errors returned by the API.',
  },
  {
    href: '/arrays',
    title: 'Arrays',
    description: 'Learn how to authenticate your API requests.',
  },
  {
    href: '/objects',
    title: 'Objects',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/sets',
    title: 'Sets',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/maps',
    title: 'Maps',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/remaining-primitives',
    title: 'Remaining Primitives',
    description:
      'Learn how to programmatically configure webhooks for your app.',
  },
]

export function BuiltInDataStructures() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="builtInDataStructures">
        Built-In Data Structures
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {builtInDataStructures.map((dataStructure) => (
          <div key={dataStructure.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {dataStructure.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {dataStructure.description}
            </p>
            <p className="mt-4">
              <Button href={dataStructure.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
