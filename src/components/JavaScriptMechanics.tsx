import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  COURSES_PREFIX,
  FRONTEND_TRACK_PREFIX,
  JAVASCRIPT_MECHANICS_PREFIX,
} from '@/constants'
import { AccessOptions } from '@prisma/client'
import { LessonConfig } from '../types'

export const javascriptMechanics: LessonConfig[] = [
  {
    id: '/engine-and-runtime',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}/engine-and-runtime`,
    title: 'Engine and Runtime',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.FREE,
    problems: [],
  },
  {
    id: '/scope-and-closure',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}/scope-and-closure`,
    title: 'Scope and Closure',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/this-and-prototypes',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}/this-and-prototypes`,
    title: 'this and Prototypes',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/functions-and-execution-context',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}/functions-and-execution-context`,
    title: 'Functions and Execution Context',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/asynchronicity',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${JAVASCRIPT_MECHANICS_PREFIX}/asynchronicity`,
    title: 'Asynchronicity',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
]

export function JavaScriptMechanics() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="javascriptMechanics">
        JavaScript Mechanics
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {javascriptMechanics.map((item) => (
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
