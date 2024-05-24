import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

export const userDefinedDataStructures = [
  {
    href: '/linked-lists',
    title: 'Linked Lists',
    description:
      'Learn about the various types of linked lists and their operations.',
  },
  {
    href: '/stacks',
    title: 'Stacks',
    description:
      'Explore stack operations and their applications in computer science.',
  },
  {
    href: '/queues',
    title: 'Queues',
    description:
      'Understand the FIFO principle and how queues are implemented.',
  },
  {
    href: '/heaps',
    title: 'Heaps',
    description: 'Discover heap structures and their use in priority queues.',
  },
  {
    href: '/trees',
    title: 'Trees',
    description: 'Study tree structures and their traversal algorithms.',
  },
  {
    href: '/graphs',
    title: 'Graphs',
    description:
      'Learn about graph representations and graph traversal methods.',
  },
  {
    href: '/tries',
    title: 'Tries',
    description:
      'Understand trie data structures and their use in efficient searching.',
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
