import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'
import { FRONTEND_DEVELOPMENT } from '@/problems'
import { AccessOptions } from '@prisma/client'
import {
  COURSES_PREFIX,
  FRONTEND_DEVELOPMENT_PREFIX,
  JS_TRACK_PREFIX,
} from '../constants'
import { LessonConfig } from '../types'

export const frontendDevelopment: LessonConfig[] = [
  {
    id: '/component-architecture-patterns',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/component-architecture-patterns`,
    title: 'Component Architecture Patterns',
    description: 'Master modern component architecture patterns.',
    access: AccessOptions.FREE,
    problems: FRONTEND_DEVELOPMENT.componentArchitecturePatterns,
  },
  {
    id: '/state-management',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/state-management`,
    title: 'State Management',
    description: 'Learn Redux and other state management solutions.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.stateManagement,
  },
  {
    id: '/virtual-dom',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/virtual-dom`,
    title: 'Virtual DOM',
    description: 'Understand Virtual DOM and diffing algorithms.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.virtualDom,
  },
  {
    id: '/reconciliation',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/reconciliation`,
    title: 'Reconciliation',
    description: 'Master React Fiber and reconciliation process.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.reconciliation,
  },
  {
    id: '/web-apis',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/web-apis`,
    title: 'Web APIs',
    description: 'Learn essential browser APIs and standards.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.webApis,
  },
  {
    id: '/cors',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/cors`,
    title: 'CORS',
    description: 'Master cross-origin communication techniques.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.cors,
  },
  {
    id: '/testing',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/testing`,
    title: 'Testing',
    description: 'Learn frontend testing strategies and tools.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.testing,
  },
  {
    id: '/build-tools',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/build-tools`,
    title: 'Build Tools',
    description: 'Master modern build tools and bundlers.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.buildTools,
  },
  {
    id: '/code-splitting',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/code-splitting`,
    title: 'Code Splitting',
    description: 'Implement efficient code splitting strategies.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.codeSplitting,
  },
  {
    id: '/micro-frontends',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/micro-frontends`,
    title: 'Micro-frontends',
    description: 'Build scalable micro-frontend architectures.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.microFrontends,
  },
  {
    id: '/server-side-rendering',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/server-side-rendering`,
    title: 'Server-Side Rendering',
    description: 'Master server-side rendering techniques.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.serverSideRendering,
  },
  {
    id: '/performance',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/performance`,
    title: 'Performance',
    description: 'Optimize web application performance.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.performance,
  },
  {
    id: '/accessibility',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/accessibility`,
    title: 'Accessibility',
    description: 'Implement web accessibility standards.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.accessibility,
  },
  {
    id: '/security',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/security`,
    title: 'Security',
    description: 'Learn frontend security best practices.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.security,
  },
  {
    id: '/frontend-interviews',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/frontend-interviews`,
    title: 'Frontend Interviews',
    description: 'Practice common frontend interview questions.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.frontendInterviews,
  },
  {
    id: '/deployment',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/deployment`,
    title: 'Deployment',
    description: 'Master application deployment workflows.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.deployment,
  },
  {
    id: '/git',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/git`,
    title: 'Git',
    description: 'Learn version control and collaboration.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.git,
  },
  {
    id: '/ci-cd',
    href: `${COURSES_PREFIX}${JS_TRACK_PREFIX}${FRONTEND_DEVELOPMENT_PREFIX}/ci-cd`,
    title: 'CI/CD',
    description: 'Set up continuous integration and deployment.',
    access: AccessOptions.PREMIUM,
    problems: FRONTEND_DEVELOPMENT.ciCd,
  },
]

export function FrontendDevelopment() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="frontendDevelopment">
        Frontend Development
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {frontendDevelopment.map((item) => (
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
