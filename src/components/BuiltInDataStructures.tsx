import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  BUILT_IN_DATA_STRUCTURES_PREFIX,
  COURSES_PREFIX,
  DSA_TRACK_PREFIX,
} from '@/constants'
import { BUILT_IN_DATA_STRUCTURES_PROBLEMS } from '@/problems'
import { LessonConfig } from '@/types'
import { AccessOptions } from '@prisma/client'

export const builtInDataStructures: LessonConfig[] = [
  {
    id: '/strings',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/strings`,
    title: 'Strings',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.strings,
  },
  {
    id: '/numbers',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/numbers`,
    title: 'Numbers',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.numbers,
  },
  {
    id: '/arrays',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/arrays`,
    title: 'Arrays',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.arrays,
  },
  {
    id: '/objects',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/objects`,
    title: 'Objects',
    description:
      'Discover object properties and how to work with objects in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.objects,
  },
  {
    id: '/sets',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/sets`,
    title: 'Sets',
    description: 'Understand the Set object and its unique element storage.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.sets,
  },
  {
    id: '/maps',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/maps`,
    title: 'Maps',
    description: 'Learn about the Map object and key-value pair management.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.maps,
  },
  {
    id: '/remaining-primitives',
    href: `${COURSES_PREFIX}${DSA_TRACK_PREFIX}${BUILT_IN_DATA_STRUCTURES_PREFIX}/remaining-primitives`,
    title: 'Remaining Primitives',
    description:
      'Explore other JavaScript primitives such as boolean, null, and undefined.',
    access: AccessOptions.PREMIUM,
    problems: BUILT_IN_DATA_STRUCTURES_PROBLEMS.remainingPrimitives,
  },
]

export function BuiltInDataStructures() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="builtInDataStructures">
        Built-In Data Structures
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {builtInDataStructures.map((item) => (
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
