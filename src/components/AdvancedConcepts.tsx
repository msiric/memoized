import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { ADVANCED_CONCEPTS } from '@/problems'
import { AccessOptions } from '@prisma/client'
import {
  ADVANCED_CONCEPTS_PREFIX,
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'

export const advancedConcepts: LessonConfig[] = [
  {
    id: '/functional-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/functional-programming`,
    title: 'Functional Programming',
    description:
      'Learn about pure functions, immutability, and managing side effects.',
    access: AccessOptions.FREE,
    problems: ADVANCED_CONCEPTS.functionalProgramming,
  },
  {
    id: '/higher-order-functions',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/higher-order-functions`,
    title: 'Higher-Order Functions',
    description:
      'Master functions as first-class citizens and essential array methods.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.higherOrderFunctions,
  },
  {
    id: '/promise-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/promise-patterns`,
    title: 'Promise Patterns',
    description:
      'Master advanced Promise patterns and asynchronous flow control.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.promisePatterns,
  },
  {
    id: '/async-await',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/async-await`,
    title: 'Async/Await',
    description:
      'Master error handling and parallel execution with async/await.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.asyncAwait,
  },
  {
    id: '/generators',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/generators`,
    title: 'Generators',
    description: 'Explore iterators and generators for flow control.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.generators,
  },
  {
    id: '/meta-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/meta-programming`,
    title: 'Meta-programming',
    description: 'Learn about Proxies and Reflect for dynamic programming.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.metaProgramming,
  },
  {
    id: '/symbols',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/symbols`,
    title: 'Symbols',
    description: 'Understand unique property keys and well-known symbols.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.symbols,
  },
  {
    id: '/memory-leaks',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/memory-leaks`,
    title: 'Memory Leaks',
    description: 'Learn to identify and prevent memory leaks.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.memoryLeaks,
  },
  {
    id: '/web-workers',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/web-workers`,
    title: 'Web Workers',
    description: 'Master multithreading with Web Workers.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.webWorkers,
  },
  {
    id: '/service-workers',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/service-workers`,
    title: 'Service Workers',
    description: 'Build offline-capable Progressive Web Apps.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.serviceWorkers,
  },
  {
    id: '/performance-optimization',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/performance-optimization`,
    title: 'Performance Optimization',
    description: 'Master advanced performance optimization techniques.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.performanceOptimization,
  },
  {
    id: '/browser-storage',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/browser-storage`,
    title: 'Browser Storage',
    description: 'Learn browser storage mechanisms and best practices.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.browserStorage,
  },
  {
    id: '/event-handling',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/event-handling`,
    title: 'Event Handling',
    description: 'Master event handling and delegation patterns.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.eventHandling,
  },
  {
    id: '/security',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/security`,
    title: 'Security',
    description: 'Learn essential frontend security practices.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.security,
  },
  {
    id: '/design-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/design-patterns`,
    title: 'Design Patterns',
    description: 'Master advanced JavaScript design patterns.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.designPatterns,
  },
  {
    id: '/reflection',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/reflection`,
    title: 'Reflection',
    description: 'Explore advanced meta-programming concepts.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.reflection,
  },
]

export function AdvancedConcepts() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="advancedConcepts">
        Advanced Concepts
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {advancedConcepts.map((item) => (
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
