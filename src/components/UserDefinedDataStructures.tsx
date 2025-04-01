import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  COURSES_PREFIX,
  DSA_TRACK_PREFIX,
  USER_DEFINED_DATA_STRUCTURES_PREFIX,
} from '@/constants'
import { USER_DEFINED_DATA_STRUCTURES_PROBLEMS } from '@/problems'
import { LessonConfig } from '@/types'
import { AccessOptions } from '@prisma/client'
import { DSA_TRACK_RESOURCES } from '../resources'

export const userDefinedDataStructures: LessonConfig[] = [
  {
    id: '/linked-lists',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/linked-lists`,
    title: 'Linked Lists',
    description:
      'Learn about the various types of linked lists and their operations.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.linkedLists,
    resources: DSA_TRACK_RESOURCES.linkedLists,
  },
  {
    id: '/stacks',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/stacks`,
    title: 'Stacks',
    description:
      'Explore stack operations and their applications in computer science.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.stacks,
    resources: DSA_TRACK_RESOURCES.stacks,
  },
  {
    id: '/queues',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/queues`,
    title: 'Queues',
    description:
      'Understand the FIFO principle and how queues are implemented.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.queues,
    resources: DSA_TRACK_RESOURCES.queues,
  },
  {
    id: '/hash-tables',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/hash-tables`,
    title: 'Hash Tables',
    description:
      'Delve into hash table implementation and its various use cases.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.hashTables,
    resources: DSA_TRACK_RESOURCES.hashTables,
  },
  {
    id: '/trees',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/trees`,
    title: 'Trees',
    description: 'Study tree structures and their traversal algorithms.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.trees,
    resources: DSA_TRACK_RESOURCES.trees,
  },
  {
    id: '/graphs',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/graphs`,
    title: 'Graphs',
    description:
      'Learn about graph representations and graph traversal methods.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.graphs,
    resources: DSA_TRACK_RESOURCES.graphs,
  },
  {
    id: '/heaps',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/heaps`,
    title: 'Heaps',
    description: 'Discover heap structures and their use in priority queues.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.heaps,
    resources: DSA_TRACK_RESOURCES.heaps,
  },
  {
    id: '/tries',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${USER_DEFINED_DATA_STRUCTURES_PREFIX}/tries`,
    title: 'Tries',
    description:
      'Understand trie data structures and their use in efficient searching.',
    access: AccessOptions.PREMIUM,
    problems: USER_DEFINED_DATA_STRUCTURES_PROBLEMS.tries,
    resources: DSA_TRACK_RESOURCES.tries,
  },
]

export function UserDefinedDataStructures() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="userDefinedDataStructures">
        User-Defined Data Structures
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {userDefinedDataStructures.map((item) => (
          <div key={item.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
            <p className="mt-4">
              <Button href={item.href} variant="text" arrow="right">
                Read more
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
