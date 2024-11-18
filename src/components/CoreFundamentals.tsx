import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { AccessOptions } from '@prisma/client'
import {
  CORE_FUNDAMENTALS_PREFIX,
  COURSES_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'

export const coreFundamentals: LessonConfig[] = [
  {
    id: '/engine-and-runtime-environment',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/engine-and-runtime-environment`,
    title: 'Engine and Runtime Environment',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.FREE,
    problems: [],
  },
  {
    id: '/execution-context-and-call-stack',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/execution-context-and-call-stack`,
    title: 'Execution Context and Call Stack',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/variable-scope-and-hoisting',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/variable-scope-and-hoisting`,
    title: 'Variable Scope and Hoisting',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/closures-and-lexical-environment',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/closures-and-lexical-environment`,
    title: 'Closures and Lexical Environment',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/this-keyword-and-binding-rules',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/this-keyword-and-binding-rules`,
    title: 'this Keyword and Binding Rules',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/prototypes-and-prototypal-inheritance',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/prototypes-and-prototypal-inheritance`,
    title: 'Prototypes and Prototypal Inheritance',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/function-types-and-invocation-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/function-types-and-invocation-patterns`,
    title: 'Function Types and Invocation Patterns',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/object-creation-and-class-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/object-creation-and-class-patterns`,
    title: 'Object Creation and Class Patterns',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/error-handling-and-debugging',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/error-handling-and-debugging`,
    title: 'Error Handling and Debugging',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/memory-management-and-garbage-collection',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/memory-management-and-garbage-collection`,
    title: 'Memory Management and Garbage Collection',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/modules-and-module-systems',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/modules-and-module-systems`,
    title: 'Modules and Module Systems',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/event-loop-and-asynchronous-programming',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/event-loop-and-asynchronous-programming`,
    title: 'Event Loop and Asynchronous Programming',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/asynchronous-javascript',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/asynchronous-javascript`,
    title: 'Asynchronous JavaScript',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/execution-context-and-scope-chain',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/execution-context-and-scope-chain`,
    title: 'Execution Context and Scope Chain',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/fundamental-data-types-and-structures',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${CORE_FUNDAMENTALS_PREFIX}/fundamental-data-types-and-structures`,
    title: 'Fundamental Data Types and Structures',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
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
