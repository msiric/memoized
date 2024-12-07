import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  COURSES_PREFIX,
  FRONTEND_TRACK_PREFIX,
  TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX,
} from '@/constants'
import { AccessOptions } from '@prisma/client'
import { LessonConfig } from '../types'

export const typescriptAdvancedConcepts: LessonConfig[] = [
  {
    id: '/type-system',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/type-system`,
    title: 'Type System',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.FREE,
    problems: [],
  },
  {
    id: '/type-manipulation',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/type-manipulation`,
    title: 'Type Manipulation',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/declaration-files',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/declaration-files`,
    title: 'Declaration Files',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/advanced-types',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/advanced-types`,
    title: 'Advanced Types',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/mapped-and-conditional-types',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/mapped-and-conditional-types`,
    title: 'Conditional Types',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/utility-types-deep-dive',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/utility-types-deep-dive`,
    title: 'Utility Types Deep Dive',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/type-guards-and-type-narrowing',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/type-guards-and-type-narrowing`,
    title: 'Type Guards and Type Narrowing',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/declaration-files-and-ambient-declarations',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/declaration-files-and-ambient-declarations`,
    title: 'Declaration Files and Ambient Declarations',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/decorators-and-metadata',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/decorators-and-metadata`,
    title: 'Decorators and Metadata',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/type-level-programming',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/type-level-programming`,
    title: 'Type-Level Programming',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/compiler-api',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/compiler-api`,
    title: 'Compiler API',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/project-configuration-and-build-tools',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/project-configuration-and-build-tools`,
    title: 'Project Configuration and Build Tools',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/migration-strategies',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/migration-strategies`,
    title: 'Migration Strategies',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/type-inference-and-compatibility',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/type-inference-and-compatibility`,
    title: 'Type Inference and Compatibility',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/namespaces-and-modules',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${TYPESCRIPT_ADVANCED_CONCEPTS_PREFIX}/namespaces-and-modules`,
    title: 'Namespaces and Modules',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
]

export function TypescriptAdvancedConcepts() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="typescriptAdvancedConcepts">
        TypeScript Advanced Concepts
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {typescriptAdvancedConcepts.map((item) => (
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
