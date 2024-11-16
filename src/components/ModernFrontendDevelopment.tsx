import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  COURSES_PREFIX,
  FRONTEND_TRACK_PREFIX,
  MODERN_FRONTEND_DEVELOPMENT_PREFIX,
} from '@/constants'
import { AccessOptions } from '@prisma/client'
import { LessonConfig } from '../types'

export const modernFrontendDevelopment: LessonConfig[] = [
  {
    id: '/component-patterns',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${MODERN_FRONTEND_DEVELOPMENT_PREFIX}/component-patterns`,
    title: 'Component Patterns',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.FREE,
    problems: [],
  },
  {
    id: '/state-management',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${MODERN_FRONTEND_DEVELOPMENT_PREFIX}/state-management`,
    title: 'State Management',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/performance-optimization',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${MODERN_FRONTEND_DEVELOPMENT_PREFIX}/performance-optimization`,
    title: 'Performance Optimization',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/testing',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${MODERN_FRONTEND_DEVELOPMENT_PREFIX}/testing`,
    title: 'Testing',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
]

export function ModernFrontendDevelopment() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="modernFrontendDevelopment">
        Modern Frontend Development
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {modernFrontendDevelopment.map((item) => (
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
