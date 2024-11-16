import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import {
  BROWSER_AND_WEB_APIS_PREFIX,
  COURSES_PREFIX,
  FRONTEND_TRACK_PREFIX,
} from '@/constants'
import { AccessOptions } from '@prisma/client'
import { LessonConfig } from '../types'

export const browserAndWebApis: LessonConfig[] = [
  {
    id: '/rendering-and-performance',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${BROWSER_AND_WEB_APIS_PREFIX}/rendering-and-performance`,
    title: 'Rendering and Performance',
    description: 'Explore string methods and their usage in JavaScript.',
    access: AccessOptions.FREE,
    problems: [],
  },
  {
    id: '/modern-browser-capabilities',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${BROWSER_AND_WEB_APIS_PREFIX}/modern-browser-capabilities`,
    title: 'Modern Browser Capabilities',
    description:
      'Understand numerical operations and the Number object in JavaScript.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
  {
    id: '/security-and-privacy',
    href: `${COURSES_PREFIX}${FRONTEND_TRACK_PREFIX}${BROWSER_AND_WEB_APIS_PREFIX}/security-and-privacy`,
    title: 'Security and Privacy',
    description: 'Learn about array methods and how to manipulate arrays.',
    access: AccessOptions.PREMIUM,
    problems: [],
  },
]

export function BrowserAndWebApis() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="browserAndWebApis">
        Browser and Web APIs
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {browserAndWebApis.map((item) => (
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
