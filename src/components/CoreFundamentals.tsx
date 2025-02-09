import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { CORE_FUNDAMENTALS } from '@/problems'
import { AccessOptions } from '@prisma/client'
import {
  CORE_FUNDAMENTALS_PREFIX,
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'

export const coreFundamentals: LessonConfig[] = [
  {
    id: '/engine-and-runtime',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/engine-and-runtime`,
    title: 'Engine & Runtime',
    description:
      'Explore JavaScript engine internals and runtime environment basics.',
    access: AccessOptions.FREE,
    problems: CORE_FUNDAMENTALS.engineAndRuntime,
  },
  {
    id: '/context-and-call-stack',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/context-and-call-stack`,
    title: 'Context & Call Stack',
    description: 'Understand execution contexts and call stack management.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.contextAndCallStack,
  },
  {
    id: '/scope-and-hoisting',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/scope-and-hoisting`,
    title: 'Scope & Hoisting',
    description: 'Master variable scope and hoisting mechanisms in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.scopeAndHoisting,
  },
  {
    id: '/closures',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/closures`,
    title: 'Closures',
    description: 'Learn about closures and lexical scoping in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.closures,
  },
  {
    id: '/this-and-binding',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/this-and-binding`,
    title: 'this & Binding',
    description: 'Master the this keyword and various binding mechanisms.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.thisAndBinding,
  },
  {
    id: '/prototypes',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/prototypes`,
    title: 'Prototypes',
    description: 'Understand prototypal inheritance and prototype chains.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.prototypes,
  },
  {
    id: '/function-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/function-types`,
    title: 'Function Types',
    description: 'Explore different function types and invocation patterns.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.functionTypes,
  },
  {
    id: '/object-and-class-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/object-and-class-patterns`,
    title: 'Object and Class Patterns',
    description: 'Learn common object creation and class patterns.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.objectAndClassPatterns,
  },
  {
    id: '/error-handling',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/error-handling`,
    title: 'Error Handling',
    description: 'Master error handling and debugging techniques.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.errorHandling,
  },
  {
    id: '/memory-management',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/memory-management`,
    title: 'Memory Management',
    description: 'Understand memory management and garbage collection.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.memoryManagement,
  },
  {
    id: '/modules',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/modules`,
    title: 'Modules',
    description: 'Learn about module systems and modular code organization.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.modules,
  },
  {
    id: '/event-loop',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/event-loop`,
    title: 'Event Loop',
    description: 'Master the event loop and asynchronous programming concepts.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.eventLoop,
  },
  {
    id: '/async-js',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/async-js`,
    title: 'Async JavaScript',
    description: 'Deep dive into asynchronous JavaScript patterns.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.asyncJs,
  },
  {
    id: '/scope-chain',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/scope-chain`,
    title: 'Scope Chain',
    description: 'Understand scope chain and lexical scoping.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.scopeChain,
  },
  {
    id: '/data-types',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/data-types`,
    title: 'Data Types',
    description: 'Master JavaScript data types and structures.',
    access: AccessOptions.PREMIUM,
    problems: CORE_FUNDAMENTALS.dataTypes,
  },
]

export function CoreFundamentals() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="coreFundamentals">
        Core Fundamentals
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {coreFundamentals.map((item) => (
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
