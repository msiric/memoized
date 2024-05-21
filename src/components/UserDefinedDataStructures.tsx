import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const userDefinedDataStructures = [
  {
    href: '/linked-lists',
    title: 'Linked Lists',
    description:
      'Read about the different types of errors returned by the API.',
  },
  {
    href: '/stacks',
    title: 'Stacks',
    description:
      'Read about the different types of errors returned by the API.',
  },
  {
    href: '/queues',
    title: 'Queues',
    description: 'Learn how to authenticate your API requests.',
  },
  {
    href: '/heaps',
    title: 'Heaps',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/trees',
    title: 'Trees',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/graphs',
    title: 'Graphs',
    description: 'Understand how to work with paginated responses.',
  },
  {
    href: '/tries',
    title: 'Tries',
    description:
      'Learn how to programmatically configure webhooks for your app.',
  },
]

export function UserDefinedDataStructures() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="userDefinedDataStructures">
        User-Defined Data Structures
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {userDefinedDataStructures.map((dataStructure) => (
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
