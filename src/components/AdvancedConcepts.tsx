import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { AccessOptions } from '@prisma/client'
import {
  ADVANCED_CONCEPTS_PREFIX,
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'
import { ADVANCED_CONCEPTS } from '@/problems'

export const advancedConcepts: LessonConfig[] = [
  {
    id: '/functional-programming-principles',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/functional-programming-principles`,
    title: 'Functional Programming Principles',
    description:
      'Learn about pure functions, immutability, and managing side effects in functional programming.',
    access: AccessOptions.FREE,
    problems: ADVANCED_CONCEPTS.functionalProgrammingPrinciples,
  },
  {
    id: '/higher-order-functions-and-callbacks',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/higher-order-functions-and-callbacks`,
    title: 'Higher-Order Functions and Callbacks',
    description:
      'Master functions as first-class citizens and essential array methods like map, filter, and reduce.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.higherOrderFunctionsAndCallbacks,
  },
  {
    id: '/promises-and-asynchronous-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/promises-and-asynchronous-patterns`,
    title: 'Promises and Asynchronous Patterns',
    description:
      'Learn about creating and handling promises, including Promise.all and Promise.race patterns.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.promisesAndAsynchronousPatterns,
  },
  {
    id: '/async-await-deep-dive',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/async-await-deep-dive`,
    title: 'Async Await Deep Dive',
    description:
      'Master error handling with try/catch and understand sequential vs. parallel execution in async/await.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.asyncAwaitDeepDive,
  },
  {
    id: '/generators-and-iterators',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/generators-and-iterators`,
    title: 'Generators and Iterators',
    description:
      'Explore creating iterators and using generators for asynchronous control flow.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.generatorsAndIterators,
  },
  {
    id: '/meta-programming-with-proxies-and-reflect',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/meta-programming-with-proxies-and-reflect`,
    title: 'Meta-programming with Proxies and Reflect',
    description:
      'Learn about intercepting object operations and practical use cases for proxies.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.metaProgrammingWithProxiesAndReflect,
  },
  {
    id: '/symbols-and-symbol-usage',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/symbols-and-symbol-usage`,
    title: 'Symbols and Symbol Usage',
    description:
      'Understand unique property keys and well-known symbols in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.symbolsAndSymbolUsage,
  },
  {
    id: '/memory-leaks-and-prevention',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/memory-leaks-and-prevention`,
    title: 'Memory Leaks and Prevention',
    description:
      'Learn to identify memory leaks and implement tools and best practices for prevention.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.memoryLeaksAndPrevention,
  },
  {
    id: '/web-workers-and-multithreading',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/web-workers-and-multithreading`,
    title: 'Web Workers and Multithreading',
    description:
      'Master offloading tasks and communication with web workers for better performance.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.webWorkersAndMultithreading,
  },
  {
    id: '/service-workers-and-pwas',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/service-workers-and-pwas`,
    title: 'Service Workers and PWAs',
    description:
      'Explore caching strategies and implementing offline capabilities in Progressive Web Apps.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.serviceWorkersAndPwas,
  },
  {
    id: '/performance-optimization-techniques',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/performance-optimization-techniques`,
    title: 'Performance Optimization Techniques',
    description:
      'Learn about debouncing, throttling, and optimizing loops and DOM interactions.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.performanceOptimizationTechniques,
  },
  {
    id: '/browser-storage-mechanisms',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/browser-storage-mechanisms`,
    title: 'Browser Storage Mechanisms',
    description:
      'Master different storage options including localStorage, sessionStorage, IndexedDB, and Web SQL.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.browserStorageMechanisms,
  },
  {
    id: '/event-handling-and-delegation',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/event-handling-and-delegation`,
    title: 'Event Handling and Delegation',
    description:
      'Understand event propagation and implement efficient event handling patterns.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.eventHandlingAndDelegation,
  },
  {
    id: '/security-best-practices',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/security-best-practices`,
    title: 'Security Best Practices',
    description:
      'Learn about preventing XSS and CSRF attacks, and implementing Content Security Policy.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.securityBestPractices,
  },
  {
    id: '/advanced-patterns-and-best-practices',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/advanced-patterns-and-best-practices`,
    title: 'Advanced Patterns and Best Practices',
    description:
      'Explore module patterns including the module pattern and revealing module pattern.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.advancedPatternsAndBestPractices,
  },
  {
    id: '/reflection-and-meta-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${ADVANCED_CONCEPTS_PREFIX}/refl`,
    title: 'Reflection and Meta Programming',
    description:
      'Explore module patterns including the module pattern and revealing module pattern.',
    access: AccessOptions.PREMIUM,
    problems: ADVANCED_CONCEPTS.reflectionAndMetaProgramming,
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
